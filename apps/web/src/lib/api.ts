const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
