export type Outcome = "Fail" | "Basic Success" | "Critical Success";

export function rollD6Pool(n: number): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
}
export function analyze(pool: number[]) {
  const counts = pool.reduce<Record<number, number>>((a, v) => ((a[v]=(a[v]??0)+1), a), {});
  let pairs=0, triples=0, quads=0;
  for (const k in counts) {
    const c = counts[k as any]!;
    if (c >= 4) { quads++; }
    else if (c === 3) { triples++; }
    else if (c === 2) { pairs++; }
  }
  const outcome: Outcome = quads || triples ? "Critical Success" : pairs ? "Basic Success" : "Fail";
  return { counts, pairs, triples, quads, outcome };
}
