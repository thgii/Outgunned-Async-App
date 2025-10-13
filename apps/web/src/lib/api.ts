// src/lib/api.ts
const RAW = (import.meta.env.VITE_API_BASE ?? "").trim();
// remove trailing slash
const API_BASE = RAW.replace(/\/+$/, "");

// Helper builds absolute URL only if API_BASE looks like "http"
function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE || !/^https?:\/\//i.test(API_BASE)) {
    // same-origin (Pages Functions)
    return p;
  }
  return `${API_BASE}${p}`;
}

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(buildUrl(path), {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
