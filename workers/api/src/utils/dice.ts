export function rollD6(n: number): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
}
export function analyze(pool: number[]) {
  const counts: Record<number, number> = {};
  for (const v of pool) counts[v] = (counts[v] ?? 0) + 1;
  let pairs=0, triples=0, quads=0;
  for (const k in counts) {
    const c = counts[k as any]!;
    if (c >= 4) quads++;
    else if (c === 3) triples++;
    else if (c === 2) pairs++;
  }
  const outcome = quads || triples ? "Critical Success" : pairs ? "Basic Success" : "Fail";
  return { counts, pairs, triples, quads, outcome };
}
