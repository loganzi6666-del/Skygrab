export function parseBskyUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new Error("invalid_url"); }
  if (u.hostname !== "bsky.app" && u.hostname !== "www.bsky.app") throw new Error("invalid_host");
  const m = u.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
  if (!m) throw new Error("invalid_path");
  return { handle: decodeURIComponent(m[1]), rkey: decodeURIComponent(m[2]) };
}

export async function resolveDid(handle) {
  if (handle.startsWith("did:")) return handle;

  // Prefer the public Bluesky AppView profile endpoint. It is explicitly
  // supported for unauthenticated public reads and returns the account DID.
  const profileEndpoint =
    "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" +
    encodeURIComponent(handle);
  const profileResponse = await fetch(profileEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (profileResponse.ok) {
    const profile = await profileResponse.json();
    if (profile?.did) return profile.did;
  }

  // Fallback to the identity endpoint on the common Bluesky PDS entryway.
  const identityEndpoint =
    "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=" +
    encodeURIComponent(handle);
  const identityResponse = await fetch(identityEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (!identityResponse.ok) throw new Error("handle_not_found");
  const identity = await identityResponse.json();
  if (!identity?.did) throw new Error("did_not_found");
  return identity.did;
}

export async function resolvePds(did) {
  let docUrl;
  if (did.startsWith("did:plc:")) {
    docUrl = "https://plc.directory/" + encodeURIComponent(did);
  } else if (did.startsWith("did:web:")) {
    const parts = did.slice(8).split(":").map(decodeURIComponent);
    const host = parts.shift();
    docUrl = parts.length
      ? `https://${host}/${parts.join("/")}/did.json`
      : `https://${host}/.well-known/did.json`;
  } else {
    throw new Error("unsupported_did");
  }

  const r = await fetch(docUrl, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("did_doc_failed");
  const doc = await r.json();
  const svc = (doc.service || []).find(
    (s) => s.id === "#atproto_pds" || String(s.id || "").endsWith("#atproto_pds")
  );
  if (!svc?.serviceEndpoint) throw new Error("pds_not_found");
  const endpoint = Array.isArray(svc.serviceEndpoint)
    ? svc.serviceEndpoint[0]
    : svc.serviceEndpoint;
  return String(endpoint).replace(/\/$/, "");
}

export function findVideo(embed) {
  if (!embed || typeof embed !== "object") return null;

  if (embed.$type === "app.bsky.embed.video#view" && embed.cid) {
    return {
      cid: embed.cid,
      playlist: embed.playlist || null,
      thumbnail: embed.thumbnail || null,
    };
  }

  if (embed.$type === "app.bsky.embed.recordWithMedia#view") {
    return findVideo(embed.media) || findVideo(embed.record?.record?.embed);
  }

  if (embed.$type === "app.bsky.embed.record#view") {
    return findVideo(embed.record?.embed);
  }

  if (embed.media) {
    const v = findVideo(embed.media);
    if (v) return v;
  }

  if (embed.record) {
    const v = findVideo(embed.record);
    if (v) return v;
  }

  return null;
}
