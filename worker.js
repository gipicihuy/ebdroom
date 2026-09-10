const UPLOAD_TARGET = "https://athars.space/upload.php";
const MEDIA_ORIGIN = "https://athars.space";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function handleUpload(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response("Invalid content type", { status: 400 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return new Response("File too large", { status: 413 });
  }
  try {
    const body = await request.arrayBuffer();
    const upstream = await fetch(UPLOAD_TARGET, {
      method: "POST",
      headers: { "content-type": contentType },
      body
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  } catch (err) {
    return new Response("Upload proxy error", { status: 502 });
  }
}

async function handleMedia(request, pathname) {
  // pathname is like /media/<whatever upload.php returned after the host>
  const targetPath = pathname.replace(/^\/media/, "");
  const targetUrl = MEDIA_ORIGIN + targetPath;
  try {
    const upstream = await fetch(targetUrl, {
      cf: { cacheEverything: true, cacheTtl: 31536000 }
    });
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    // Strip any headers that could leak the upstream host (etag/server tokens etc).
    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (err) {
    return new Response("Media proxy error", { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/upload") {
      return handleUpload(request);
    }
    if (url.pathname.startsWith("/media/")) {
      return handleMedia(request, url.pathname);
    }
    return env.ASSETS.fetch(request);
  }
};
