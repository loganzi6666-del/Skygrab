import { LOCALES, getSnap, due, refresh, view } from "../_trends.js";

export async function onRequestGet(ctx) {
  const env = ctx.env;
  const url = new URL(ctx.request.url);
  const q = url.searchParams.get("lang");
  const locale = LOCALES.includes(q) ? q : "ja";

  if (!env || !env.TRENDS) {
    return Response.json({ error: "kv_not_bound" }, { status: 503 });
  }
  const snap = await getSnap(env);
  const data = await view(env, locale, snap);
  if (due(snap) && ctx.waitUntil) ctx.waitUntil(refresh(env, snap).catch(() => {}));

  const map = it => ({
    post: it.u, thumbnail: it.t, author: it.a, name: it.n,
    text: it.x, likes: it.l, reposts: it.r, score: it.r * 3 + it.l
  });
  return Response.json({
    locale,
    updated: snap && snap.ts ? new Date(snap.ts).toISOString() : null,
    days: data.days,
    realtime: data.rt.map(map),
    daily: data.d.map(map),
    weekly: data.w.map(map),
    monthly: data.m.map(map)
  }, { headers: { "cache-control": "public, max-age=120" } });
}
