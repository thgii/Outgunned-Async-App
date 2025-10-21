// apps/web/src/lib/gear.ts
import { GEAR } from "@action-thread/types";
import type { GearGrant, GearSelector } from "@action-thread/types";

// Basic catalog item shape (kept minimal)
export type CatalogItem = (typeof GEAR)[number];

// ---- Core selector -> options ----
export function selectFromCatalog(sel: GearSelector, catalog: CatalogItem[] = GEAR): CatalogItem[] {
  switch (sel.type) {
    case "ids":
      return catalog.filter(g => sel.ids.includes(g.id));

    case "kind":
      return catalog.filter(g => g.kind === sel.kind)
                    .slice(0, sel.limit ?? 999);

    case "tags":
      return catalog.filter(g => {
        const tags = new Set(g.tags ?? []);
        const anyOk = !sel.anyOf || sel.anyOf.some(t => tags.has(t));
        const allOk = !sel.allOf || sel.allOf.every(t => tags.has(t));
        return anyOk && allOk;
      }).slice(0, sel.limit ?? 999);

    case "ride":
      return catalog.filter(g => {
        if (g.kind !== "ride") return false;
        const speed = (g as any).props?.speed ?? (g as any).rideStats?.speed;
        if (sel.speed != null && speed !== sel.speed) return false;
        if (sel.minSpeed != null && speed < sel.minSpeed) return false;
        if (sel.maxSpeed != null && speed > sel.maxSpeed) return false;

        if (sel.armored != null) {
          const armored = g.tags?.includes("armored") || (g as any).props?.armored === true;
          if (!!armored !== sel.armored) return false;
        }
        if (sel.types && sel.types.length) {
          const typeVal = (g as any).props?.type || (g as any).rideStats?.types;
          const have = Array.isArray(typeVal) ? typeVal : (typeVal ? [typeVal] : []);
          if (!sel.types.some(t => have.includes(t))) return false;
        }
        return true;
      });

    case "custom": {
      // Apply lightweight constraints if present
      return catalog.filter(g => {
        const cost = g.cost ?? 0;
        if (sel.constraint?.costEq != null && cost !== sel.constraint.costEq) return false;
        if (sel.constraint?.maxCost != null && cost > sel.constraint.maxCost) return false;
        if (sel.constraint?.kind && g.kind !== sel.constraint.kind) return false;
        return true;
      });
    }
  }
}

// ---- Sugar helpers you can use in the wizard ----
export function optionsForGrant(grant: GearGrant, catalog: CatalogItem[] = GEAR): CatalogItem[] {
  if (grant.mode === "choose") return selectFromCatalog(grant.of, catalog);
  if (grant.mode === "credit") {
    // Allow “window shopping” by cost in the picker; UI enforces budget
    const max = grant.amount;
    return catalog.filter(g => (g.cost ?? 0) <= max);
  }
  // give-mode has no options (it auto-assigns)
  return [];
}

export function toNames(items: CatalogItem[]): string[] {
  return items.map(i => i.name);
}

export function toIds(items: CatalogItem[]): string[] {
  return items.map(i => i.id);
}
