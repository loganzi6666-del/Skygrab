/* Bluesky video ranking.
   Collects PUBLIC posts that carry a native Bluesky video, ranks them by real
   engagement (reposts weighted over likes), and keeps a rolling daily store in KV.

   What we store and show: the post's own thumbnail URL (served by Bluesky's CDN),
   the author's handle, the engagement counts and a link to the original post.
   We never copy, re-host or re-encode anyone's video, and we never rank by what
   people download through this tool. */

export const LOCALES = ["ja", "en", "pt", "ko"];

const API = "https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed";

/* Global video-only feeds: ~100% video, mostly English but they carry every
   language, so every sweep harvests a few ja/ko/pt posts as well. */
const GLOBAL = [
  "at://did:plc:6i6n57nrkq6xavqbdo6bvkqr/app.bsky.feed.generator/trending-vids",
  "at://did:plc:6i6n57nrkq6xavqbdo6bvkqr/app.bsky.feed.generator/ogvideos"
];

/* Language-specific feeds, swept one group per refresh. Adult-oriented feeds are
   deliberately not on this list. */
const GROUPS = [
  ["at://did:plc:q6kan4oxddhgwnk4yjwvviao/app.bsky.feed.generator/aaamsu44py5vg",  /* 日本語タイムライン */
   "at://did:plc:nhfe6agvwcwvwph6qwn3nr4m/app.bsky.feed.generator/aaao7mowx4c6m"], /* 青空動画部 */
  ["at://did:plc:cgl62jlhroosxyjkaffidnon/app.bsky.feed.generator/aaae4nczs635m",  /* JP */
   "at://did:plc:ujbv5agep7botiks7dozqbo3/app.bsky.feed.generator/aaajgchr4xkfw"], /* JP+Hot */
  ["at://did:plc:lyvh35oonxn4rkcdx7wsph4q/app.bsky.feed.generator/aaadlan5627oi",  /* 일주일치 밀린 블스 */
   "at://did:plc:lyvh35oonxn4rkcdx7wsph4q/app.bsky.feed.generator/aaagqpi4lcxsq",  /* 하루치 밀린 블스 */
   "at://did:plc:e4a32z23pazq5dxnucj6wpee/app.bsky.feed.generator/aaahdeiwme6ke"], /* 24시간 하이라이트 */
  ["at://did:plc:i2htjidmsg7cg4bbwqlbsuyl/app.bsky.feed.generator/aaaatqgqv46kg",  /* #고양이 */
   "at://did:plc:mt4ax2cc55gn2r33m7wefc7r/app.bsky.feed.generator/aaanje4aelv62",  /* 고양이 보여줘 */
   "at://did:plc:lrdad6d3sis5okpc2wlqadxq/app.bsky.feed.generator/aaaiycogecphg",  /* 한국어 파판14 */
   "at://did:plc:32ffmsxrwnugpta5nopzr6lk/app.bsky.feed.generator/aaafzu4coitnw"], /* 파판14 KR */
  ["at://did:plc:coqkaymd4t65envntucbpx2y/app.bsky.feed.generator/aaalkfmkojuda"]  /* pt */
];

const REFRESH_MS = 5 * 60 * 1000;   /* one sweep per 5 min -> ~288 KV writes/day */
const CAP = 80;                     /* items kept per locale per day */
const RT_MS = 6 * 60 * 60 * 1000;   /* "real time" window */
const TOP = 20;

/* Authors who opted out of logged-out visibility, and anything labelled adult or
   abusive, are dropped before ranking. */
const BAD = new Set([
  "!no-unauthenticated", "!hide", "!warn", "!takedown",
  "porn", "sexual", "nudity", "graphic-media", "gore", "self-harm", "spam"
]);

function blocked(p) {
  const ls = [].concat(p.labels || [], (p.author && p.author.labels) || []);
  return ls.some(l => l && BAD.has(l.val));
}

function videoEmbed(p) {
  const e = p.embed || {};
  if (String(e.$type || "").indexOf("app.bsky.embed.video") === 0) return e;
  const m = e.media;
  if (m && String(m.$type || "").indexOf("app.bsky.embed.video") === 0) return m;
  return null;
}

/* A post may declare several languages; take the first one we rank. */
function langOf(p) {
  const ls = (p.record && p.record.langs) || [];
  for (const raw of ls) {
    const v = String(raw || "").slice(0, 2).toLowerCase();
    if (LOCALES.indexOf(v) >= 0) return v;
  }
  return "";
}

function postUrl(p) {
  const rkey = String(p.uri).split("/").pop();
  return "https://bsky.app/profile/" + (p.author.handle || p.author.did) + "/post/" + rkey;
}

function today() { return new Date().toISOString().slice(0, 10); }

async function fetchFeed(uri) {
  try {
    const r = await fetch(API + "?limit=100&feed=" + encodeURIComponent(uri),
      { cf: { cacheTtl: 120 } });
    if (!r.ok) return [];
    const j = await r.json();
    return j.feed || [];
  } catch (e) { return []; }
}

function harvest(rows, items, now) {
  for (const row of rows) {
    const p = row && row.post;
    if (!p || !p.author) continue;
    const em = videoEmbed(p);
    if (!em || !em.thumbnail) continue;
    if (blocked(p)) continue;
    const lc = langOf(p);
    if (LOCALES.indexOf(lc) < 0) continue;

    const likes = p.likeCount || 0, reposts = p.repostCount || 0;
    const bucket = items[lc] || (items[lc] = {});
    const prev = bucket[p.uri];
    const ar = em.aspectRatio || {};
    bucket[p.uri] = {
      u: postUrl(p),
      t: em.thumbnail,
      w: ar.width || 0,
      h: ar.height || 0,
      x: String((p.record && p.record.text) || "").replace(/\s+/g, " ").slice(0, 90),
      a: p.author.handle || "",
      n: String(p.author.displayName || p.author.handle || "").slice(0, 40),
      l: Math.max(likes, prev ? prev.l : 0),
      r: Math.max(reposts, prev ? prev.r : 0),
      f: prev ? prev.f : now
    };
  }
}

function score(i) { return i.r * 3 + i.l; }

function trim(items) {
  for (const lc of Object.keys(items)) {
    const arr = Object.entries(items[lc]);
    if (arr.length <= CAP) continue;
    arr.sort((a, b) => score(b[1]) - score(a[1]));
    items[lc] = Object.fromEntries(arr.slice(0, CAP));
  }
}

/* One sweep: always a global video feed, plus the next language group. */
async function sweep(env, snap) {
  const now = Date.now();
  /* Every source, every run. The rotation this replaced advanced one group
     per refresh, and refreshes only fire when somebody loads a page - with
     little traffic the Japanese and Korean groups went a whole day without a
     turn while English filled up from the global feeds on every sweep. */
  const uris = GLOBAL.concat(...GROUPS);
  const rows = (await Promise.all(uris.map(fetchFeed))).flat();

  const day = today();
  if (snap.day && snap.day !== day) {
    /* roll yesterday into its own key, then start the new day empty */
    await env.TRENDS.put("vday:" + snap.day, JSON.stringify(snap.items || {}),
      { expirationTtl: 60 * 60 * 24 * 40 });
    const idx = JSON.parse((await env.TRENDS.get("vdays")) || "[]");
    if (idx.indexOf(snap.day) < 0) idx.push(snap.day);
    await env.TRENDS.put("vdays", JSON.stringify(idx.slice(-40)));
    snap.items = {};
  }

  snap.items = snap.items || {};
  harvest(rows, snap.items, now);
  trim(snap.items);
  snap.day = day;
  snap.ts = now;
  await env.TRENDS.put("vsnap", JSON.stringify(snap));
  return snap;
}

export async function getSnap(env) {
  if (!env || !env.TRENDS) return null;
  return JSON.parse((await env.TRENDS.get("vsnap")) || "{}");
}

export function due(snap) {
  return !snap || !snap.ts || (Date.now() - snap.ts) > REFRESH_MS;
}

export async function refresh(env, snap) {
  try { return await sweep(env, snap || {}); } catch (e) { return snap; }
}

function rank(map) {
  return Object.values(map)
    .sort((a, b) => score(b) - score(a))
    .slice(0, TOP);
}

function mergeInto(target, src) {
  for (const [uri, it] of Object.entries(src || {})) {
    const p = target[uri];
    if (!p || score(it) > score(p)) target[uri] = it;
  }
}

/* Returns { rt, d, w, m, days } — each a ranked array for one locale. */
export async function view(env, locale, snap) {
  const empty = { rt: [], d: [], w: [], m: [], days: 0 };
  if (!env || !env.TRENDS) return empty;
  snap = snap || {};
  const cur = (snap.items && snap.items[locale]) || {};
  const now = Date.now();

  const rtMap = {};
  for (const [u, it] of Object.entries(cur)) if (now - (it.f || 0) <= RT_MS) rtMap[u] = it;

  const idx = JSON.parse((await env.TRENDS.get("vdays")) || "[]");
  const past = idx.filter(d => d !== snap.day).slice(-29);
  const wKeys = past.slice(-6), mKeys = past;

  const wMap = Object.assign({}, cur), mMap = Object.assign({}, cur);
  const loaded = {};
  for (const d of mKeys) {
    const raw = await env.TRENDS.get("vday:" + d);
    if (!raw) continue;
    let obj; try { obj = JSON.parse(raw); } catch (e) { continue; }
    loaded[d] = (obj && obj[locale]) || {};
  }
  for (const d of mKeys) mergeInto(mMap, loaded[d]);
  for (const d of wKeys) mergeInto(wMap, loaded[d]);

  return {
    rt: rank(Object.keys(rtMap).length ? rtMap : cur),
    d: rank(cur),
    w: rank(wMap),
    m: rank(mMap),
    days: past.length + 1
  };
}
