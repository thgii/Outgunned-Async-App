import { Hono } from "hono";

type Env = {
  ASSETS: R2Bucket;
};

export const assets = new Hono<{ Bindings: Env }>();

/**
 * GET /assets/<key...>
 * Streams a file out of R2 by key.
 */
assets.get("/assets/:key{.+}", async (c) => {
  const key = c.req.param("key");

  const obj = await c.env.ASSETS.get(key);
  if (!obj) {
    return c.notFound();
  }

  const headers = new Headers();
  const meta = obj.httpMetadata;
  if (meta?.contentType) {
    headers.set("content-type", meta.contentType);
  }

  return new Response(obj.body, { headers });
});

export default assets;
