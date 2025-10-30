// apps/web/src/lib/api.ts
type ApiInit = Omit<RequestInit, "body"> & {
  json?: any;           // convenience: we'll JSON.stringify this and set headers
  body?: BodyInit | null; // allow explicit bodies (e.g., FormData) when needed
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

// ---- NPC payload types ----
type Level3 = 'Basic' | 'Critical' | 'Extreme';
type EnemyType = 'goon' | 'bad_guy' | 'boss';

export type CreateAllyPayload = {
  side: 'ally';
  name: string;
  portraitUrl?: string | null;
  brawn: number;
  nerves: number;
  smooth: number;
  focus: number;
  crime: number;
  allyGrit?: number;          // defaulted server-side to 0/whatever
  help?: string | null;       // <-- NEW
  flaw?: string | null;       // <-- NEW
};

export type CreateEnemyPayload = {
  side: 'enemy';
  name: string;
  portraitUrl?: string | null;
  enemyType: EnemyType;
  enemyGritMax: number;
  enemyGrit?: number;         // defaulted server-side to 0
  attackLevel: Level3;
  defenseLevel: Level3;
  weakSpot: string;
  weakSpotDiscovered?: boolean;
};

export type CreateNpcPayload = CreateAllyPayload | CreateEnemyPayload;

export type UpdateNpcPatch = Partial<
  | Omit<CreateAllyPayload, 'side' | 'name'>   // allow updating ally fields (and you can still pass name separately)
  | Omit<CreateEnemyPayload, 'side' | 'name' | 'enemyType'> // typical updates for enemies
> & {
  name?: string;               // allow renaming
  weakSpotDiscovered?: boolean;
};

export async function api(path: string, init: ApiInit = {}) {
  const url = buildUrl(path);

  // If caller provided `json`, turn it into a string body and set Content-Type
  const hasJson = Object.prototype.hasOwnProperty.call(init, "json");
  const body = hasJson ? JSON.stringify(init.json) : init.body ?? null;

  // If the caller forgot to set a method, assume POST when sending a body
  const method = init.method ?? (body ? "POST" : "GET");

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // 🔐 Add Bearer token if available
  const auth = getAuthToken();
  if (auth) headers["authorization"] = `Bearer ${auth}`;

  // Detect FormData so we don't set Content-Type (browser will add boundary)
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (hasJson) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  } else if (!isFormData) {
    // default to JSON only when not sending FormData
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

/* =========================
   NPC convenience helpers
   ========================= */

// NOTE: Prefixing with /api here to hit your Workers routes in Pages.
// If your VITE_API_BASE already points directly at the Worker origin,
// this will still work because buildUrl handles absolute bases.
export function listNpcs(campaignId: string) {
  return api(`/campaigns/${campaignId}/supporting-characters`, { method: "GET" });
}

export function createNpc(campaignId: string, payload: CreateNpcPayload) {
  return api(`/campaigns/${campaignId}/supporting-characters`, {
    json: payload,
    method: "POST",
  });
}

export function updateNpc(campaignId: string, id: string, patch: UpdateNpcPatch) {
  return api(`/campaigns/${campaignId}/supporting-characters/${id}`, {
    json: patch,
    method: "PATCH",
  });
}

export function deleteNpc(campaignId: string, id: string) {
  return api(`/campaigns/${campaignId}/supporting-characters/${id}`, {
    method: "DELETE",
  });
}

/**
 * Image upload helper.
 * Expects your backend at POST /api/upload/image to accept multipart/form-data
 * and return JSON like: { url: "https://..." }.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return api("/upload/image", { body: form, method: "POST" }) as Promise<{ url: string }>;
}
