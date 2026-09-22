import { handler } from "./_trends_page.js";

/* Serves /trends/ for every locale from one file.
   _routes.json limits invocation to /api/* and these paths, so anything else
   never reaches this function; ctx.next() is only a safety net. */
const MAP = {
  "/trends": "ja", "/trends/": "ja",
  "/en/trends": "en", "/en/trends/": "en",
  "/ko/trends": "ko", "/ko/trends/": "ko",
  "/pt-br/trends": "pt", "/pt-br/trends/": "pt"
};

export async function onRequestGet(ctx) {
  const locale = MAP[new URL(ctx.request.url).pathname];
  if (!locale) return ctx.next();
  return handler(locale)(ctx);
}
