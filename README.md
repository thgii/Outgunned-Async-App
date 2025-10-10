\# Action Thread (Outgunned/Adventure chat TTRPG)



\## Quick start

1\. Install pnpm: https://pnpm.io/install

2\. `pnpm i`

3\. Create D1 DB: `pnpm -C workers/api d1:prepare`

4\. Dev: `pnpm dev`

&nbsp;  - API at http://localhost:8787

&nbsp;  - Web at http://localhost:5173



\## Deploy

\- API: Cloudflare Workers (wrangler)

\- Web: any static host (Cloudflare Pages recommended)



\## Packages

\- apps/web: Vite + React + Tailwind

\- workers/api: Hono + D1 + Durable Object (future)

\- shared/types: shared TypeScript interfaces



\## Environment

\- Copy `.env.example` to `.env` and set VITE\_API\_BASE if needed.



