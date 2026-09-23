import { getSnap, due, refresh, view } from "./_trends.js";

const HOME = { ja: "/", en: "/en/", ko: "/ko/", pt: "/pt-br/" };
const PATH = { ja: "/trends/", en: "/en/trends/", ko: "/ko/trends/", pt: "/pt-br/trends/" };
const HTML_LANG = { ja: "ja-JP", en: "en", ko: "ko-KR", pt: "pt-BR" };

const T = {
  ja: {
    title: "Blueskyの人気動画ランキング｜リアルタイム・日間・週間・月間",
    desc: "Blueskyで今リポストされている公開動画のランキング。リアルタイム／日間／週間／月間で、サムネイル付きの上位20件を表示します。",
    h1: "Blueskyの人気動画ランキング",
    lead: "リポストといいねの多い公開動画を集計しています。気になる動画はワンクリックでそのまま保存できます。",
    tabs: { rt: "リアルタイム", d: "日間", w: "週間", m: "月間" },
    sub: { rt: "直近6時間", d: "本日", w: "過去7日", m: "過去30日" },
    empty: "集計中です。しばらくしてからもう一度ご覧ください。",
    partial: d => `集計開始から${d}日分のデータです。日数が増えるほど精度が上がります。`,
    save: "この動画を保存", orig: "元の投稿", likes: "いいね", rp: "リポスト",
    back: "← ダウンローダーに戻る",
    note: "公開投稿のみを対象に、リポスト数といいね数を集計しています。動画ファイルの複製・再配布は行っておらず、サムネイルと投稿へのリンクのみを表示しています。掲載を希望されない場合はお問い合わせください。"
  },
  en: {
    title: "Trending Bluesky Videos｜Live, Daily, Weekly, Monthly",
    desc: "A ranking of the public Bluesky videos people are reposting right now, with thumbnails. Live, daily, weekly and monthly top 20.",
    h1: "Trending Bluesky Videos",
    lead: "Public videos ranked by reposts and likes. Save any of them in one click.",
    tabs: { rt: "Live", d: "Daily", w: "Weekly", m: "Monthly" },
    sub: { rt: "Last 6 hours", d: "Today", w: "Last 7 days", m: "Last 30 days" },
    empty: "Collecting data. Please check back shortly.",
    partial: d => `Based on ${d} day(s) of data so far. Accuracy improves over time.`,
    save: "Save this video", orig: "Original post", likes: "likes", rp: "reposts",
    back: "← Back to the downloader",
    note: "Counts are aggregated from public posts only. We do not copy or redistribute any video file — this page shows thumbnails and links to the original posts. Contact us if you would prefer not to be listed."
  },
  ko: {
    title: "블루스카이 인기 영상 랭킹｜실시간·일간·주간·월간",
    desc: "지금 블루스카이에서 가장 많이 리포스트되는 공개 영상 랭킹. 실시간/일간/주간/월간 상위 20개를 썸네일과 함께 보여줍니다.",
    h1: "블루스카이 인기 영상 랭킹",
    lead: "리포스트와 좋아요가 많은 공개 영상을 집계합니다. 마음에 드는 영상은 클릭 한 번으로 저장할 수 있습니다.",
    tabs: { rt: "실시간", d: "일간", w: "주간", m: "월간" },
    sub: { rt: "최근 6시간", d: "오늘", w: "최근 7일", m: "최근 30일" },
    empty: "집계 중입니다. 잠시 후 다시 확인해 주세요.",
    partial: d => `집계 시작 후 ${d}일치 데이터입니다. 기간이 쌓일수록 정확해집니다.`,
    save: "이 영상 저장", orig: "원본 게시물", likes: "좋아요", rp: "리포스트",
    back: "← 다운로더로 돌아가기",
    note: "공개 게시물만을 대상으로 리포스트와 좋아요 수를 집계합니다. 영상 파일을 복제하거나 재배포하지 않으며, 썸네일과 원본 게시물 링크만 표시합니다. 게재를 원하지 않으시면 문의해 주세요."
  },
  pt: {
    title: "Vídeos em alta no Bluesky｜Agora, diário, semanal, mensal",
    desc: "Ranking dos vídeos públicos mais repostados no Bluesky, com miniaturas. Top 20 em tempo real, diário, semanal e mensal.",
    h1: "Vídeos em alta no Bluesky",
    lead: "Vídeos públicos ordenados por reposts e curtidas. Salve qualquer um deles com um clique.",
    tabs: { rt: "Agora", d: "Diário", w: "Semanal", m: "Mensal" },
    sub: { rt: "Últimas 6 horas", d: "Hoje", w: "Últimos 7 dias", m: "Últimos 30 dias" },
    empty: "Coletando dados. Volte em instantes.",
    partial: d => `Com base em ${d} dia(s) de dados. A precisão melhora com o tempo.`,
    save: "Salvar este vídeo", orig: "Publicação original", likes: "curtidas", rp: "reposts",
    back: "← Voltar para o downloader",
    note: "Os números são apurados apenas a partir de publicações públicas. Não copiamos nem redistribuímos nenhum arquivo de vídeo — esta página mostra miniaturas e links para as publicações originais. Fale conosco se preferir não aparecer aqui."
  }
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function num(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function card(it, i, t, home) {
  const save = home + "?u=" + encodeURIComponent(it.u);
  return `<li class="vr-item">
<a class="vr-thumb" href="${esc(save)}">
<img src="${esc(it.t)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
<span class="vr-rank${i < 3 ? " vr-top" : ""}">${i + 1}</span></a>
<div class="vr-body">
<div class="vr-who">${esc(it.n)} <span>@${esc(it.a)}</span></div>
${it.x ? `<p class="vr-txt">${esc(it.x)}</p>` : ""}
<div class="vr-stats"><span>&#8646; ${num(it.r)} ${esc(t.rp)}</span><span>&#9825; ${num(it.l)} ${esc(t.likes)}</span></div>
<div class="vr-acts"><a class="vr-save" href="${esc(save)}">${esc(t.save)}</a>
<a class="vr-orig" href="${esc(it.u)}" target="_blank" rel="noopener nofollow">${esc(t.orig)}</a></div>
</div></li>`;
}

function panel(key, list, t, home, days) {
  const partial = (key === "w" && days < 7) || (key === "m" && days < 30);
  return `<section class="vr-panel" id="p-${key}" ${key === "rt" ? "" : "hidden"}>
<h2>${esc(t.tabs[key])}<small>${esc(t.sub[key])}</small></h2>
${partial ? `<p class="vr-partial">${esc(t.partial(days))}</p>` : ""}
${list.length ? `<ol class="vr-list">${list.map((it, i) => card(it, i, t, home)).join("")}</ol>`
    : `<p class="vr-empty">${esc(t.empty)}</p>`}</section>`;
}

function page(locale, data) {
  const t = T[locale], home = HOME[locale], self = "https://bskygrab.pages.dev" + PATH[locale];
  const alts = Object.keys(PATH).map(l =>
    `<link rel="alternate" hreflang="${l === "pt" ? "pt-BR" : l === "ja" ? "ja" : l}" href="https://bskygrab.pages.dev${PATH[l]}">`
  ).join("") + `<link rel="alternate" hreflang="x-default" href="https://bskygrab.pages.dev/trends/">`;
  const tabs = ["rt", "d", "w", "m"].map(k =>
    `<button class="vr-tab${k === "rt" ? " on" : ""}" data-p="${k}">${esc(t.tabs[k])}</button>`).join("");
  return `<!doctype html><html lang="${HTML_LANG[locale]}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.title)}</title><meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${self}">${alts}
<meta property="og:title" content="${esc(t.title)}"><meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${self}"><meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css">
</head><body><header class="site"><div class="wrap"><a class="brand" href="${home}">BskyGrab</a></div></header>
<main><section class="hero"><div class="wrap">
<h1>${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p>
<div class="vr-tabs">${tabs}</div>
${["rt", "d", "w", "m"].map(k => panel(k, data[k], t, home, data.days)).join("")}
<p class="vr-note">${esc(t.note)}</p>
<p class="vr-back"><a href="${home}">${esc(t.back)}</a></p>
</div></section></main>
<script>
(function(){var ts=document.querySelectorAll('.vr-tab');ts.forEach(function(b){b.addEventListener('click',function(){
ts.forEach(function(x){x.classList.remove('on')});b.classList.add('on');
['rt','d','w','m'].forEach(function(k){var p=document.getElementById('p-'+k);if(p)p.hidden=(k!==b.dataset.p)});});});})();
</script></body></html>`;
}

export function handler(locale) {
  return async ctx => {
    const env = ctx.env || {};
    let snap = null, data = { rt: [], d: [], w: [], m: [], days: 0 };
    if (env.TRENDS) {
      snap = await getSnap(env);
      data = await view(env, locale, snap);
      if (due(snap) && ctx.waitUntil) ctx.waitUntil(refresh(env, snap));
    }
    return new Response(page(locale, data), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=120, s-maxage=120"
      }
    });
  };
}
