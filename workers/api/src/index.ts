export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("OK: action-thread-api root", {
        headers: { "content-type": "text/plain" },
      });
    }

    if (url.pathname === "/characters/__ping") {
      return new Response("OK: characters ping (root-level)", {
        headers: { "content-type": "text/plain" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Not found", path: url.pathname }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  },
};
