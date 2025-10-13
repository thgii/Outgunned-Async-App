// apps/web/src/lib/api.ts
const RAW = (import.meta.env.VITE_API_BASE ?? "").trim();
const API_BASE = (() => {
  try {
    if (!RAW) return "";           // same-origin
    const u = new URL(RAW);
    return u.protocol.startsWith("http") ? RAW.replace(/\/+$/, "") : "";
  } catch {
    return "";                      // fallback to same-origin
  }
})();

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export async function api(path: string, init?: RequestInit) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    // throw readable error text
    const txt = await res.text().catch(() => `${res.status} ${res.statusText}`);
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }

  // tolerate non-JSON just in case (we’ll return text, not crash)
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
