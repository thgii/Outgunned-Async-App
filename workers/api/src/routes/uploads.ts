import { Hono } from "hono";

type Env = {
  ASSETS: R2Bucket;
};

export const uploads = new Hono<{ Bindings: Env }>();

/**
 * POST /upload/image
 * Accepts multipart/form-data with a 'file' field.
 * Stores the file in R2 and returns { url } pointing to /assets/<key>
 * on this same Worker.
 */
uploads.post("/upload/image", async (c) => {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return c.json({ error: "Expected multipart/form-data" }, 400);
  }

  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return c.json({ error: "Missing 'file' field" }, 400);
  }

  const mime = file.type || "application/octet-stream";

  // Decide extension based on mime
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
      ? "webp"
      : "jpg";

  // Key inside R2
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  // Store in R2 (streaming)
  await c.env.ASSETS.put(key, file.stream(), {
    httpMetadata: { contentType: mime },
  });

  // Build a URL on *this same worker* for serving the image:
  // e.g. https://action-thread-api.<acct>.workers.dev/assets/uploads/uuid.jpg
  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;
  const assetUrl = `${origin}/assets/${key}`;

  return c.json({ url: assetUrl });
});