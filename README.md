# Bluesky Video Downloader

Japan-first Bluesky video downloader. Public-facing site name: **Bluesky Video Downloader**. GitHub repository: **Skygrab**.

## Languages
- `/` Japanese (primary)
- `/en/` English
- `/pt-br/` Portuguese (Brazil)
- `/ko/` Korean

## Free stack
- GitHub: source repository
- Cloudflare Pages: static hosting
- Cloudflare Pages Functions: `/api/post` and `/api/download`
- Bluesky public AppView / AT Protocol APIs
- No database, no paid API, no login system

## Deploy to Cloudflare Pages
1. In Cloudflare Dashboard open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Select GitHub repository `loganzi6666-del/Skygrab`.
3. Use Production branch `main`, Framework preset `None`, Build command `exit 0`, Build output directory `.`.
4. Deploy.
5. The root `/functions` directory publishes `/api/post` and `/api/download` automatically.
6. `_routes.json` limits Function invocation to `/api/*`.
7. The intended project hostname is `bskygrab.pages.dev`; if Cloudflare assigns a different hostname, update canonical/hreflang/sitemap URLs.

## Quick test after deployment
- Japanese home page loads at `/`
- `/en/`, `/pt-br/`, `/ko/` work
- Invalid URLs show validation errors
- A public Bluesky native-video post shows a thumbnail/result
- Save button downloads the video
- `/sitemap.xml` and `/robots.txt` load

## How it works
1. Parse `bsky.app/profile/{handle}/post/{rkey}`.
2. Resolve the handle to a DID using Bluesky's public API.
3. Query `app.bsky.feed.getPosts` at `public.api.bsky.app`.
4. Read the hydrated video embed and CID.
5. Resolve the account PDS from the DID document.
6. Stream the media blob through `/api/download` with a download disposition.

## Important
- Public Bluesky posts only.
- Quoted/record-with-media embeds are best-effort.
- AT Protocol/PDS behavior can change, so test several public video posts before launch.
- Do not place deceptive ads next to the download control.
- AdSense approval is not guaranteed for downloader pages.
- Use only with content the user has permission to save.
