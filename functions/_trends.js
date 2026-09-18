/* Shared trend aggregation.
   Runtime uses only the STABLE app.bsky.feed.getFeed endpoint.
   Feed URIs below were discovered once via app.bsky.unspecced.getPopularFeedGenerators
   and are hardcoded on purpose: `unspecced` may change or disappear without notice. */

const API = "https://public.api.bsky.app/xrpc";

export const LOCALES = ["ja", "en", "pt", "ko"];

// Deliberately excludes adult-oriented feeds. Ranking never republishes media.
export const FEEDS = {
  ja: [
    "at://did:plc:q6kan4oxddhgwnk4yjwvviao/app.bsky.feed.generator/aaamsu44py5vg", // 日本語タイムライン
    "at://did:plc:cgl62jlhroosxyjkaffidnon/app.bsky.feed.generator/aaae4nczs635m"  // JP
  ],
  ko: [
    "at://did:plc:lyvh35oonxn4rkcdx7wsph4q/app.bsky.feed.generator/aaamsaqurkzls", // 한국어 (SkyFeed)
    "at://did:plc:vt44edfzaat5jbqhfhjusqwt/app.bsky.feed.generator/aaahkq4fquf34"  // 한국어 리포스트 많은 순
  ],
  pt: [
    "at://did:plc:coqkaymd4t65envntucbpx2y/app.bsky.feed.generator/aaalkfmkojuda", // Top Posts Brasil
    "at://did:plc:g2sy5q5fyoxhgwcer4xr2mgb/app.bsky.feed.generator/bombando-br"   // Bombando Brasil
  ],
  en: [] // English uses Bluesky's own global trending topics instead
};

const LIMIT = 40;          // posts per feed — keeps CPU inside the free-plan budget
const SNAP_TTL_MS = 5 * 60 * 1000;

/* Authors who opted out of logged-out visibility are excluded. */
function optedOut(author) {
  const labels = (author && author.labels) || [];
  return labels.some(l => l && l.val === "!no-unauthenticated");
}

function tagsFromPost(post) {
  const out = [];
  const rec = post && post.record;
  if (!rec) return out;
  for (const f of rec.facets || []) {
    for (const ft of f.features || []) {
      if (ft.$type === "app.bsky.richtext.facet#tag" && ft.tag) out.push(ft.tag);
    }
  }
  if (!out.length && typeof rec.text === "string") {
    const m = rec.text.match(/#[^\s#.,!?;:"'()\[\]{}<>]{1,40}/g);
    if (m) for (const t of m) out.push(t.slice(1));
  }
  return out;
}

async function feedTags(uri) {
  const url = API + "/app.bsky.feed.getFeed?limit=" + LIMIT + "&feed=" + encodeURIComponent(uri);
  const r = await fetch(url, { cf: { cacheTtl: 120, cacheEverything: true } });
  if (!r.ok) return {};
  const j = await r.json();
  const counts = {};
  for (const item of j.feed || []) {
    const post = item.post;
    if (!post || optedOut(post.author)) continue;
    for (const t of tagsFromPost(post)) {
      const k = t.trim();
      if (!k || k.length > 40) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return counts;
}

async function englishTopics() {
  const r = await fetch(API + "/app.bsky.unspecced.getTrendingTopics?limit=20");
  if (!r.ok) return {};
  const j = await r.json();
  const counts = {};
  let n = (j.topics || []).length;
  for (const t of j.topics || []) {
    const name = t.displayName || t.topic;
    if (name) counts[name] = n--;   // rank order becomes a weight
  }
  return counts;
}

function merge(a, b) {
  const out = Object.assign({}, a);
  for (const k in b) out[k] = (out[k] || 0) + b[k];
  return out;
}

export function top(counts, n) {
  return Object.entries(counts || {})
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, n)
    .map(([tag, count], i) => ({ rank: i + 1, tag, count }));
}

export function todayKey(d) {
  return (d || new Date()).toISOString().slice(0, 10);
}

/* Collects one locale per invocation so a single request stays well inside
   the free-plan CPU budget; locales rotate by the minute. */
export async function refresh(env, locale) {
  if (!env || !env.TRENDS) return null;
  let counts = {};
  if (locale === "en") counts = await englishTopics();
  else for (const uri of FEEDS[locale] || []) counts = merge(counts, await feedTags(uri));
  if (!Object.keys(counts).length) return null;

  const now = Date.now();
  const snap = JSON.parse((await env.TRENDS.get("snap")) || "{}");
  snap[locale] = { ts: now, counts };
  await env.TRENDS.put("snap", JSON.stringify(snap));

  const dk = "day:" + todayKey();
  const day = JSON.parse((await env.TRENDS.get(dk)) || "{}");
  day[locale] = merge(day[locale] || {}, counts);
  await env.TRENDS.put(dk, JSON.stringify(day), { expirationTtl: 60 * 60 * 24 * 40 });

  const idx = JSON.parse((await env.TRENDS.get("days")) || "[]");
  if (!idx.includes(todayKey())) {
    idx.push(todayKey());
    while (idx.length > 40) idx.shift();
    await env.TRENDS.put("days", JSON.stringify(idx));
  }
  return snap[locale];
}

export function dueLocale(snap) {
  const now = Date.now();
  for (const l of LOCALES) {
    const s = snap && snap[l];
    if (!s || now - s.ts > SNAP_TTL_MS) return l;
  }
  return null;
}

export async function windowCounts(env, locale, days) {
  if (!env || !env.TRENDS) return {};
  const idx = JSON.parse((await env.TRENDS.get("days")) || "[]");
  const want = idx.slice(-days);
  let out = {};
  for (const d of want) {
    const day = JSON.parse((await env.TRENDS.get("day:" + d)) || "{}");
    out = merge(out, day[locale] || {});
  }
  return { counts: out, days: want.length, need: days };
}
