export async function q(DB, sql, params = []) {
    const stmt = DB.prepare(sql);
    const bound = params.length ? stmt.bind(...params) : stmt;
    const res = await bound.all();
    return res.results ?? [];
}
export async function one(DB, sql, params = []) {
    const rows = await q(DB, sql, params);
    return rows[0] ?? null;
}
