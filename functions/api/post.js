import { parseBskyUrl, resolveDid, findVideo } from "../_lib.js";

export async function onRequestGet(context) {
  try {
    const reqUrl = new URL(context.request.url);
    const raw = reqUrl.searchParams.get("url") || "";
    const { handle, rkey } = parseBskyUrl(raw);
    const did = await resolveDid(handle);
    const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;
    const api = "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=" + encodeURIComponent(atUri);
    const r = await fetch(api, { headers: { "Accept": "application/json" }});
    if (!r.ok) return Response.json({ error: "post_fetch_failed" }, { status: 404 });
    const j = await r.json();
    const post = j.posts?.[0];
    if (!post) return Response.json({ error: "post_not_found" }, { status: 404 });
    const video = findVideo(post.embed);
    if (!video?.cid) return Response.json({ error: "video_not_found" }, { status: 404 });
    const downloadUrl = `/api/download?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(video.cid)}&rkey=${encodeURIComponent(rkey)}`;
    return Response.json({ did, rkey, cid: video.cid, thumbnail: video.thumbnail, playlist: video.playlist, downloadUrl }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300", "X-Content-Type-Options": "nosniff" }});
  } catch (e) {
    return Response.json({ error: e.message || "bad_request" }, { status: 400 });
  }
}