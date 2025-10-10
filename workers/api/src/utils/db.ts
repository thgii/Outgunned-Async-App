import type { D1Database } from "@cloudflare/workers-types";

export async function q<T=unknown>(DB: D1Database, sql: string, params: any[] = []) {
  const stmt = DB.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const res = await bound.all<T>();
  return res.results ?? [];
}

export async function one<T=unknown>(DB: D1Database, sql: string, params: any[] = []) {
  const rows = await q<T>(DB, sql, params);
  return rows[0] ?? null;
}
