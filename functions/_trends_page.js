import { LOCALES, refresh, dueLocale, top, windowCounts } from "./_trends.js";

const BASE = "https://bskygrab.pages.dev";
const PATH = { ja: "/trends/", en: "/en/trends/", pt: "/pt-br/trends/", ko: "/ko/trends/" };
const HOME = { ja: "/", en: "/en/", pt: "/pt-br/", ko: "/ko/" };
const HREFLANG = { ja: "ja-JP", en: "en", pt: "pt-BR", ko: "ko-KR" };

const T = {
  ja: { title: "Blueskyトレンドランキング｜日本語ハッシュタグ",
        desc: "Blueskyの日本語フィードで今よく使われているハッシュタグを集計。リアルタイム・日間・週間・月間で確認できます。",
        h1: "Blueskyトレンド", lead: "日本語フィードのハッシュタグを集計しています。",
        tabs: { rt: "リアルタイム", d: "日間", w: "週間", m: "月間" },
        tag: "タグ", cnt: "件", empty: "集計中です。しばらくしてからもう一度ご覧ください。",
        partial: d => `集計中（${d.days}/${d.need}日分）`, tool: "動画保存ツール", updated: "更新",
        note: "公開フィードの投稿からハッシュタグのみを集計しています。投稿や画像・動画は転載していません。" },
  en: { title: "Bluesky Trends – Hashtag Ranking",
        desc: "Trending topics on Bluesky right now, with daily, weekly and monthly views.",
        h1: "Bluesky Trends", lead: "Trending topics across Bluesky.",
        tabs: { rt: "Live", d: "Daily", w: "Weekly", m: "Monthly" },
        tag: "Topic", cnt: "score", empty: "Collecting data. Check back shortly.",
        partial: d => `Collecting (${d.days}/${d.need} days)`, tool: "Video downloader", updated: "Updated",
        note: "Counts only. No posts, images or videos are reproduced here." },
  pt: { title: "Tendências do Bluesky – Ranking de hashtags",
        desc: "As hashtags mais usadas no Bluesky em português, em tempo real, diário, semanal e mensal.",
        h1: "Tendências do Bluesky", lead: "Hashtags mais usadas nos feeds em português.",
        tabs: { rt: "Ao vivo", d: "Diário", w: "Semanal", m: "Mensal" },
        tag: "Hashtag", cnt: "usos", empty: "Coletando dados. Volte em instantes.",
        partial: d => `Coletando (${d.days}/${d.need} dias)`, tool: "Baixar vídeo", updated: "Atualizado",
        note: "Apenas contagens. Nenhuma publicação, imagem ou vídeo é reproduzido aqui." },
  ko: { title: "블루스카이 트렌드 랭킹｜한국어 해시태그",
        desc: "블루스카이 한국어 피드에서 지금 많이 쓰이는 해시태그 집계. 실시간·일간·주간·월간으로 확인하세요.",
        h1: "블루스카이 트렌드", lead: "한국어 피드의 해시태그를 집계합니다.",
        tabs: { rt: "실시간", d: "일간", w: "주간", m: "월간" },
        tag: "태그", cnt: "건", empty: "집계 중입니다. 잠시 후 다시 확인해 주세요.",
        partial: d => `집계 중 (${d.days}/${d.need}일분)`, tool: "영상 다운로드", updated: "갱신",
        note: "공개 피드 게시물에서 해시태그만 집계합니다. 게시물이나 이미지·영상은 전재하지 않습니다." }
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function rows(list, t) {
  if (!list.length) return `<p class="tr-empty">${esc(t.empty)}</p>`;
  return `<ol class="tr-list">` + list.map(r =>
    `<li><span class="tr-rank">${r.rank}</span><span class="tr-tag">${esc(r.tag)}</span>` +
    `<span class="tr-cnt">${r.count}</span></li>`).join("") + `</ol>`;
}

export async function page(locale, env, ctx) {
  const t = T[locale];
  let snap = {}, live = [], d = { counts:{},days:0,need:1 }, w = { counts:{},days:0,need:7 }, m = { counts:{},days:0,need:30 };
  let stamp = null;

  if (env && env.TRENDS) {
    snap = JSON.parse((await env.TRENDS.get("snap")) || "{}");
    const s = snap[locale];
    if (s) { live = top(s.counts, 20); stamp = new Date(s.ts).toISOString().slice(0, 16).replace("T", " ") + " UTC"; }
    d = await windowCounts(env, locale, 1);
    w = await windowCounts(env, locale, 7);
    m = await windowCounts(env, locale, 30);
    const due = dueLocale(snap);
    if (due && ctx && ctx.waitUntil) ctx.waitUntil(refresh(env, due).catch(() => {}));
  }

  const alts = LOCALES.map(l =>
    `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${BASE}${PATH[l]}">`).join("") +
    `<link rel="alternate" hreflang="x-default" href="${BASE}${PATH.ja}">`;

  const panel = (key, list, meta) =>
    `<section class="tr-panel" id="p-${key}"><h2>${esc(t.tabs[key])}</h2>` +
    (meta && meta.days < meta.need ? `<p class="tr-note">${esc(t.partial(meta))}</p>` : "") +
    rows(list, t) + `</section>`;

  return `<!doctype html><html lang="${HREFLANG[locale]}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.title)}</title><meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${BASE}${PATH[locale]}">${alts}
<meta property="og:type" content="website"><meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}"><meta property="og:url" content="${BASE}${PATH[locale]}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css">
</head><body>
<div class="wrap"><header><a class="brand" href="${HOME[locale]}"><span class="logo">B</span><span>Bluesky Video Downloader</span></a>
<nav class="langs" aria-label="Language">${LOCALES.map(l =>
  `<a href="${PATH[l]}"${l===locale?' aria-current="page"':''}>${({ja:"日本語",en:"English",pt:"Português",ko:"한국어"})[l]}</a>`).join("")}</nav></header></div>
<main><section class="hero" style="padding:54px 0 18px"><div class="wrap">
<div class="eyebrow">Bluesky · Trends</div><h1 style="font-size:clamp(30px,5vw,46px)">${esc(t.h1)}</h1>
<p class="lead">${esc(t.lead)}</p>
${stamp ? `<p class="tr-stamp">${esc(t.updated)}: ${esc(stamp)}</p>` : ""}
<p style="margin-top:18px"><a class="sh-btn" href="${HOME[locale]}">${esc(t.tool)}</a></p>
</div></section>
<section class="sections" style="padding:10px 0 70px"><div class="wrap">
<div class="tr-grid">
${panel("rt", live, null)}
${panel("d", top(d.counts, 20), d)}
${panel("w", top(w.counts, 20), w)}
${panel("m", top(m.counts, 20), m)}
</div>
<p class="note" style="text-align:center;margin-top:24px">${esc(t.note)}</p>
</div></section></main>
<footer><div class="wrap foot"><div>© 2026 Bluesky Video Downloader</div>
<div><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></div></div></footer>
</body></html>`;
}

export function handler(locale) {
  return async ctx => new Response(await page(locale, ctx.env, ctx), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}
