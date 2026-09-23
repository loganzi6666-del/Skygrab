import { resolvePds } from "../_lib.js";
function safePart(s) { return String(s || "video").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "video"; }
export async function onRequestGet(context) {
  const u = new URL(context.request.url);
  const did = u.searchParams.get("did") || "";
  const cid = u.searchParams.get("cid") || "";
  const rkey = safePart(u.searchParams.get("rkey"));
  if (!/^did:(plc|web):/.test(did) || !/^[a-z0-9]+$/i.test(cid)) return new Response("Bad request", { status: 400 });
  try {
    const pds = await resolvePds(did);
    const src = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
    const r = await fetch(src, { headers: { "Accept": "video/mp4,application/octet-stream;q=0.9,*/*;q=0.8" }, redirect: "follow" });
    if (!r.ok || !r.body) return new Response("Video unavailable", { status: 404 });
    const headers = new Headers();
    headers.set("Content-Type", r.headers.get("Content-Type") || "video/mp4");
    const len = r.headers.get("Content-Length"); if (len) headers.set("Content-Length", len);
    headers.set("Content-Disposition", `attachment; filename="bluesky-video-${rkey}.mp4"`);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(r.body, { status: 200, headers });
  } catch (e) { return new Response("Video unavailable", { status: 502 }); }
}

/* Some download managers send HEAD before GET. Without this they see a 404
   and give up, because Pages only routes HEAD when a handler exists. */
export async function onRequestHead(context) {
  const u = new URL(context.request.url);
  const did = u.searchParams.get("did") || "";
  const cid = u.searchParams.get("cid") || "";
  const rkey = safePart(u.searchParams.get("rkey"));
  if (!/^did:(plc|web):/.test(did) || !/^[a-z0-9]+$/i.test(cid)) return new Response(null, { status: 400 });
  try {
    const pds = await resolvePds(did);
    const src = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
    let r = await fetch(src, { method: "HEAD", redirect: "follow" });
    if (!r.ok) {
      /* not every PDS answers HEAD - fall back to GET and drop the body */
      const g = await fetch(src, { redirect: "follow" });
      if (!g.ok) return new Response(null, { status: 404 });
      if (g.body) g.body.cancel();
      r = g;
    }
    const headers = new Headers();
    headers.set("Content-Type", r.headers.get("Content-Type") || "video/mp4");
    const len = r.headers.get("Content-Length"); if (len) headers.set("Content-Length", len);
    headers.set("Content-Disposition", `attachment; filename="bluesky-video-${rkey}.mp4"`);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(null, { status: 200, headers });
  } catch (e) { return new Response(null, { status: 502 }); }
}
