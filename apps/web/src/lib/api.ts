// apps/web/src/lib/api.ts
type ApiInit = Omit<RequestInit, "body"> & {
  json?: any; // convenience: we'll JSON.stringify this and set headers
};

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

function getAuthToken() {
  try { return localStorage.getItem("auth:token"); } catch { return null; }
}

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export async function api(path: string, init: ApiInit = {}) {
  const url = buildUrl(path);

  // If caller provided `json`, turn it into a string body and set Content-Type
  const hasJson = Object.prototype.hasOwnProperty.call(init, "json");
  const body =
    hasJson ? JSON.stringify(init.json) : init.body;

  // If the caller forgot to set a method, assume POST when sending a body
  const method = init.method ?? (body ? "POST" : "GET");

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

    // 🔐 Add Bearer token if available
  const auth = getAuthToken();
  if (auth) headers["authorization"] = `Bearer ${auth}`;

  if (hasJson) {
    // don't clobber an explicit content-type if caller set one
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  } else {
    // still default to JSON for most endpoints unless caller overrides
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const res = await fetch(url, {
    ...init,
    method,
    headers,
    body,
  });

  // Better error surface: include response text
  if (!res.ok) {
    const txt = await res.text().catch(() => `${res.status} ${res.statusText}`);
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }

  // Tolerate non-JSON
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
