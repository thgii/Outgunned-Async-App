import { Hono } from 'hono';

export const uploads = new Hono();

/**
 * POST /upload/image
 * Accepts multipart/form-data with a 'file' field.
 * Returns { url } where url is a data: URL (base64) you can store directly.
 */
uploads.post('/upload/image', async (c) => {
  const contentType = c.req.header('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data' }, 400);
  }

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: "Missing 'file' field" }, 400);
  }

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // base64 encode without Node Buffer (works on Cloudflare Workers)
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);

  const mime = file.type || 'application/octet-stream';
  const url = `data:${mime};base64,${b64}`;

  return c.json({ url });
});
