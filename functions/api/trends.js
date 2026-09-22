import { LOCALES, refresh, dueLocale, top, windowCounts } from "../_trends.js";

export async function onRequestGet(ctx) {
  const env = ctx.env;
  const url = new URL(ctx.request.url);
  const locale = LOCALES.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "ja";

  if (!env || !env.TRENDS) {
    return Response.json({ error: "kv_not_bound" }, { status: 503 });
  }
  const snap = JSON.parse((await env.TRENDS.get("snap")) || "{}");
  const s = snap[locale];
  const [d, w, m] = [
    await windowCounts(env, locale, 1),
    await windowCounts(env, locale, 7),
    await windowCounts(env, locale, 30)
  ];
  const due = dueLocale(snap);
  if (due && ctx.waitUntil) ctx.waitUntil(refresh(env, due).catch(() => {}));

  return Response.json({
    locale,
    updated: s ? new Date(s.ts).toISOString() : null,
    realtime: s ? top(s.counts, 20) : [],
    daily:   { days: d.days, need: d.need, items: top(d.counts, 20) },
    weekly:  { days: w.days, need: w.need, items: top(w.counts, 20) },
    monthly: { days: m.days, need: m.need, items: top(m.counts, 20) }
  }, { headers: { "cache-control": "public, max-age=300" } });
}
