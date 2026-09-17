# SkyGrab

Japan-first Bluesky video downloader prototype.

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

1. Create a new GitHub repository named `SkyGrab` (or `bskygrab`) with no starter files.
2. Upload/push every file and folder in this project to the repository root.
3. In Cloudflare Dashboard open **Workers & Pages → Create application → Pages → Connect to Git**.
4. Authorize GitHub and select the SkyGrab repository.
5. Use:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `exit 0`
   - Build output directory: `.`
6. Deploy.
7. Cloudflare will detect the root `/functions` directory and publish:
   - `/api/post`
   - `/api/download`
8. `_routes.json` limits Function invocation to `/api/*`, so normal HTML/CSS/JS requests remain static.
9. Confirm the assigned `*.pages.dev` address.
10. If the final address differs from `skygrab.pages.dev`, replace `https://skygrab.pages.dev` in:
    - `index.html`
    - `en/index.html`
    - `pt-br/index.html`
    - `ko/index.html`
    - `robots.txt`
    - `sitemap.xml`

## Quick test after deployment

Use a public Bluesky post that contains a native uploaded video.

Check:
- Japanese home page loads at `/`
- Language links work
- A non-Bluesky URL shows a validation error
- A public video post shows a thumbnail/result
- The final save button downloads the video
- `/sitemap.xml` and `/robots.txt` load

## How it works

1. Parse `bsky.app/profile/{handle}/post/{rkey}`.
2. Resolve the handle to a DID with the public Bluesky API.
3. Query `app.bsky.feed.getPosts` at `public.api.bsky.app`.
4. Read the hydrated video embed (`app.bsky.embed.video#view`) and its CID.
5. Resolve the account's PDS from the DID document.
6. Stream the original blob through `/api/download` with `Content-Disposition: attachment`.

## Important

- This prototype supports public Bluesky posts with a direct video embed.
- Quoted/record-with-media embeds are handled on a best-effort basis.
- AT Protocol/PDS behavior can change; test with several public posts before launch.
- Do not place deceptive ads next to the download button.
- AdSense approval is not guaranteed for downloader pages.
- Use only with content the user has permission to save.
