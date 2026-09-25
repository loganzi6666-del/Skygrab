/* /api/diag - filter diagnostics. Counts only.

   This exists to answer one operator question: when a locale ranking comes up
   empty, is that because the source feeds are dry, or because the label filter
   is taking everything out? It samples each source feed and reports how many
   posts carry video and which labels removed them.

   Deliberately no thumbnails, no post links, no handles and no ranking. The
   people behind the removed posts did not agree to be listed anywhere, and a
   hidden adult section on an ad-funded domain is not worth the account. */

const XRPC = "https://public.api.bsky.app/xrpc";

const FEEDS = [
  "at://did:plc:6i6n57nrkq6xavqbdo6bvkqr/app.bsky.feed.generator/trending-vids",
  "at://did:plc:6i6n57nrkq6xavqbdo6bvkqr/app.bsky.feed.generator/ogvideos",
  "at://did:plc:q6kan4oxddhgwnk4yjwvviao/app.bsky.feed.generator/aaamsu44py5vg",
  "at://did:plc:nhfe6agvwcwvwph6qwn3nr4m/app.bsky.feed.generator/aaao7mowx4c6m",
  "at://did:plc:cgl62jlhroosxyjkaffidnon/app.bsky.feed.generator/aaae4nczs635m",
  "at://did:plc:ujbv5agep7botiks7dozqbo3/app.bsky.feed.generator/aaajgchr4xkfw",
  "at://did:plc:lyvh35oonxn4rkcdx7wsph4q/app.bsky.feed.generator/aaadlan5627oi",
  "at://did:plc:lyvh35oonxn4rkcdx7wsph4q/app.bsky.feed.generator/aaagqpi4lcxsq",
  "at://did:plc:e4a32z23pazq5dxnucj6wpee/app.bsky.feed.generator/aaahdeiwme6ke",
  "at://did:plc:i2htjidmsg7cg4bbwqlbsuyl/app.bsky.feed.generator/aaaatqgqv46kg",
  "at://did:plc:mt4ax2cc55gn2r33m7wefc7r/app.bsky.feed.generator/aaanje4aelv62",
  "at://did:plc:lrdad6d3sis5okpc2wlqadxq/app.bsky.feed.generator/aaaiycogecphg",
  "at://did:plc:32ffmsxrwnugpta5nopzr6lk/app.bsky.feed.generator/aaafzu4coitnw",
  "at://did:plc:coqkaymd4t65envntucbpx2y/app.bsky.feed.generator/aaalkfmkojuda",
];

const GLOBALS = 2;

const TRACK = [
  "porn",
  "sexual",
  "nudity",
  "graphic-media",
  "gore",
  "self-harm",
  "spam",
  "!no-unauthenticated",
];

const LIMIT = 50;

function hasVideo(p) {
  const e = p.embed || {};
  const t = e.$type || "";
  const m = (e.media && e.media.$type) || "";
  return t.indexOf("app.bsky.embed.video") === 0 || m.indexOf("app.bsky.embed.video") === 0;
}

function marks(p) {
  const s = new Set();
  const own = p.labels || [];
  for (let i = 0; i < own.length; i++) s.add(own[i].val);
  const a = p.author || {};
  const au = a.labels || [];
  for (let i = 0; i < au.length; i++) s.add(au[i].val);
  return s;
}

async function one(uri, idx) {
  const row = {
    uri: uri,
    name: "",
    scope: idx < GLOBALS ? "global" : "locale",
    posts: 0,
    videos: 0,
    clean: 0,
    hits: {},
    error: "",
  };
  try {
    const g = await fetch(XRPC + "/app.bsky.feed.getFeedGenerator?feed=" + encodeURIComponent(uri));
    if (g.ok) {
      const j = await g.json();
      row.name = (j.view && j.view.displayName) || "";
    }
  } catch (e) {
    /* name is cosmetic */
  }
  try {
    const r = await fetch(XRPC + "/app.bsky.feed.getFeed?limit=" + LIMIT + "&feed=" + encodeURIComponent(uri));
    if (!r.ok) {
      row.error = "HTTP " + r.status;
      return row;
    }
    const feed = ((await r.json()).feed) || [];
    row.posts = feed.length;
    for (let i = 0; i < feed.length; i++) {
      const p = feed[i].post;
      if (!p || !hasVideo(p)) continue;
      row.videos++;
      const m = marks(p);
      let dirty = false;
      for (let k = 0; k < TRACK.length; k++) {
        if (m.has(TRACK[k])) {
          row.hits[TRACK[k]] = (row.hits[TRACK[k]] || 0) + 1;
          dirty = true;
        }
      }
      if (!dirty) row.clean++;
    }
  } catch (e) {
    row.error = String((e && e.message) || e);
  }
  return row;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const rows = await Promise.all(FEEDS.map(one));

  const tot = { posts: 0, videos: 0, clean: 0, hits: {} };
  for (let i = 0; i < rows.length; i++) {
    tot.posts += rows[i].posts;
    tot.videos += rows[i].videos;
    tot.clean += rows[i].clean;
    for (let k = 0; k < TRACK.length; k++) {
      const n = rows[i].hits[TRACK[k]] || 0;
      if (n) tot.hits[TRACK[k]] = (tot.hits[TRACK[k]] || 0) + n;
    }
  }

  const head = {
    "x-robots-tag": "noindex, nofollow, noarchive",
    "cache-control": "no-store",
  };

  if (url.searchParams.get("format") === "json") {
    head["content-type"] = "application/json; charset=utf-8";
    return new Response(JSON.stringify({ generated: new Date().toISOString(), sample: LIMIT, totals: tot, rows: rows }, null, 2), { headers: head });
  }

  const h = [];
  h.push("<!doctype html><html lang=ko><head><meta charset=utf-8>");
  h.push("<meta name=viewport content='width=device-width,initial-scale=1'>");
  h.push("<meta name=robots content='noindex,nofollow,noarchive'>");
  h.push("<title>필터 진단</title>");
  h.push("<style>");
  h.push(":root{color-scheme:light dark}");
  h.push("body{margin:0;padding:24px 16px;font:14px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;background:#fff;color:#111}");
  h.push("@media(prefers-color-scheme:dark){body{background:#12151a;color:#e6e8eb}}");
  h.push("h1{font-size:20px;margin:0 0 4px}");
  h.push("p.note{margin:0 0 20px;opacity:.7;max-width:70ch}");
  h.push("div.wrap{overflow-x:auto}");
  h.push("table{border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:13px}");
  h.push("th,td{padding:6px 10px;border-bottom:1px solid rgba(128,128,128,.28);text-align:right;white-space:nowrap}");
  h.push("th:first-child,td:first-child{text-align:left;max-width:26ch;overflow:hidden;text-overflow:ellipsis}");
  h.push("thead th{font-weight:600;border-bottom-width:2px}");
  h.push("tbody tr.g td{opacity:.65}");
  h.push("tfoot td{font-weight:700;border-top:2px solid rgba(128,128,128,.5);border-bottom:none}");
  h.push("td.z{opacity:.3}");
  h.push("td.err{color:#c0392b;text-align:left}");
  h.push("</style></head><body>");
  h.push("<h1>필터 진단</h1>");
  h.push("<p class=note>수집 대상 피드 " + FEEDS.length + "개를 지금 한 번씩 훑어서, 영상이 몇 건이고 어떤 라벨 때문에 빠지는지 센 것입니다. 피드당 최근 " + LIMIT + "건 표본. 한 건이 라벨을 두 개 이상 달고 있을 수 있어서 라벨 칸 합계는 (영상 - 통과)보다 클 수 있습니다. 썸네일·링크·계정은 일부러 싣지 않습니다.</p>");
  h.push("<div class=wrap><table><thead><tr>");
  h.push("<th>피드</th><th>글</th><th>영상</th><th>통과</th>");
  for (let k = 0; k < TRACK.length; k++) h.push("<th>" + esc(TRACK[k]) + "</th>");
  h.push("</tr></thead><tbody>");

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const nm = r.name || r.uri.split("/").pop();
    h.push("<tr" + (r.scope === "global" ? " class=g" : "") + ">");
    h.push("<td title='" + esc(r.uri) + "'>" + esc(nm) + "</td>");
    if (r.error) {
      h.push("<td class=err colspan=" + (3 + TRACK.length) + ">" + esc(r.error) + "</td></tr>");
      continue;
    }
    h.push("<td>" + r.posts + "</td><td>" + r.videos + "</td><td>" + r.clean + "</td>");
    for (let k = 0; k < TRACK.length; k++) {
      const n = r.hits[TRACK[k]] || 0;
      h.push("<td class=" + (n ? "n" : "z") + ">" + n + "</td>");
    }
    h.push("</tr>");
  }

  h.push("</tbody><tfoot><tr><td>합계</td><td>" + tot.posts + "</td><td>" + tot.videos + "</td><td>" + tot.clean + "</td>");
  for (let k = 0; k < TRACK.length; k++) h.push("<td>" + (tot.hits[TRACK[k]] || 0) + "</td>");
  h.push("</tr></tfoot></table></div>");
  h.push("<p class=note>JSON: <a href='/api/diag?format=json'>/api/diag?format=json</a></p>");
  h.push("</body></html>");

  head["content-type"] = "text/html; charset=utf-8";
  return new Response(h.join(""), { headers: head });
}
