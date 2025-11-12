// apps/web/src/lib/api.ts
type ApiInit = Omit<RequestInit, "body"> & {
  json?: any;             // convenience: we'll JSON.stringify this and set headers
  body?: BodyInit | null; // allow explicit bodies (e.g., FormData) when needed
};

const RAW = (import.meta.env.VITE_API_BASE ?? "").trim();
const API_BASE = (() => {
  try {
    if (!RAW) return ""; // same-origin
    const u = new URL(RAW);
    return u.protocol.startsWith("http") ? RAW.replace(/\/+$/, "") : "";
  } catch {
    return ""; // fallback to same-origin
  }
})();

function getAuthToken() {
  try { return localStorage.getItem("auth:token"); } catch { return null; }
}

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

/* =========================
   Core fetcher
   ========================= */
async function core(path: string, init: ApiInit = {}) {
  const url = buildUrl(path);

  // If caller provided `json`, turn it into a string body and set Content-Type
  const hasJson = Object.prototype.hasOwnProperty.call(init, "json");
  const body = hasJson ? JSON.stringify(init.json) : init.body ?? null;

  // If the caller forgot to set a method, assume POST when sending a body
  const method = init.method ?? (body ? "POST" : "GET");

  const headers = new Headers(init.headers ?? {});

  // 🔐 Add Bearer token if available
  const auth = getAuthToken();
  if (auth) headers.set("Authorization", `Bearer ${auth}`);

  // Detect FormData so we don't set Content-Type (browser will add boundary)
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (hasJson && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  } else if (!hasJson && !isFormData && !headers.has("Content-Type")) {
    // default to JSON only when not sending FormData
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, method, headers, body });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === "string" && data ? data : (data?.error ?? `${res.status} ${res.statusText}`);
    throw new Error(message);
  }
  return data;
}

/* =========================
   Public API helper (callable + methods)
   ========================= */
type ApiFn = ((path: string, init?: ApiInit) => Promise<any>) & {
  get: (path: string) => Promise<any>;
  post: (path: string, json?: any) => Promise<any>;
  patch: (path: string, json?: any) => Promise<any>;
  delete: (path: string) => Promise<any>;
};

export const api: ApiFn = Object.assign(
  (path: string, init?: ApiInit) => core(path, init),
  {
    get: (path: string) => core(path, { method: "GET" }),
    post: (path: string, json?: any) => core(path, { method: "POST", json }),
    patch: (path: string, json?: any) => core(path, { method: "PATCH", json }),
    delete: (path: string) => core(path, { method: "DELETE" }),
  }
);

/* =========================
   NPC payload types
   ========================= */
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
  | Omit<CreateAllyPayload, 'side' | 'name'>
  | Omit<CreateEnemyPayload, 'side' | 'name' | 'enemyType'>
> & {
  name?: string;
  weakSpotDiscovered?: boolean;
};

/* =========================
   NPC convenience helpers
   ========================= */

// NOTE: If VITE_API_BASE already points to Worker origin, these work as-is.
export function listNpcs(campaignId: string) {
  return api.get(`/campaigns/${campaignId}/supporting-characters`);
}

export function createNpc(campaignId: string, payload: CreateNpcPayload) {
  return api.post(`/campaigns/${campaignId}/supporting-characters`, payload);
}

export function updateNpc(campaignId: string, id: string, patch: UpdateNpcPatch) {
  return api.patch(`/campaigns/${campaignId}/supporting-characters/${id}`, patch);
}

export function deleteNpc(campaignId: string, id: string) {
  return api.delete(`/campaigns/${campaignId}/supporting-characters/${id}`);
}

/**
 * Image upload helper.
 * Expects your backend at POST /upload/image to accept multipart/form-data
 * and return JSON like: { url: "https://..." }.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return api("/upload/image", { body: form, method: "POST" }) as Promise<{ url: string }>;
}

export async function listCharacters(campaignId?: string) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";
  return api.get(`/characters${qs}`) as Promise<any[]>;
}

export async function getCharacter(id: string) {
  return api.get(`/characters/${id}`) as Promise<any>;
}
