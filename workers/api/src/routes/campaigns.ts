import { Hono } from "hono";
import { q, one } from "../utils/db";

export const campaigns = new Hono<{ Bindings: { DB: D1Database } }>();

campaigns.get("/:id/games", async (c) => {
  const id = c.req.param("id");
  const rows = await q(c.env.DB, "SELECT * FROM games WHERE campaignId = ? ORDER BY createdAt", [id]);
  return c.json(rows);
});

// GET /campaigns/:id  -> return a single campaign (with description if present)
campaigns.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Optional: require the caller to be a member of this campaign
  const { getCampaignMembership } = await import("../utils/auth");
  const currentUser = c.get("user");
  const mem = await getCampaignMembership(c.env.DB, currentUser.id, id);
  if (!mem) return c.json({ error: "Forbidden" }, 403);

  const row = await one(c.env.DB, `
    SELECT id, title, system, ownerId, heatEnabled, createdAt, description
    FROM campaigns
    WHERE id = ?
  `, [id]);

  if (!row) return c.notFound();
  return c.json(row);
});


// === List campaigns for the current user =========================
// GET /campaigns
campaigns.get("/", async (c) => {
  const currentUser = c.get("user");
  // campaigns the user is a member of (campaign-level membership),
  // with counts and last activity
  const rs = await c.env.DB.prepare(`
    SELECT
      c.id,
      c.title,
      c.system,
      c.ownerId,
      c.heatEnabled,
      c.createdAt,
      -- games in this campaign
      (SELECT COUNT(*) FROM games g WHERE g.campaignId = c.id) AS gameCount,
      -- members in this campaign
      (SELECT COUNT(*) FROM memberships m WHERE m.campaignId = c.id) AS memberCount,
      -- latest message across any game in this campaign
      (
        SELECT MAX(m.createdAt)
        FROM messages m
        JOIN games g ON g.id = m.gameId
        WHERE g.campaignId = c.id
      ) AS lastActivityAt
    FROM campaigns c
    JOIN memberships ms ON ms.campaignId = c.id
    WHERE ms.userId = ?
    GROUP BY c.id
    ORDER BY COALESCE(lastActivityAt, c.createdAt) DESC
  `).bind(currentUser.id).all<any>();

  return c.json(rs.results || []);
});

// === Create a new campaign and seed memberships ==================
// POST /campaigns
// Body: { title: string, description?: string, system?: string, heroIds?: string[] }
campaigns.post("/", async (c) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser?.id) return c.json({ error: "unauthorized" }, 401);

    const body = await c.req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim();
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const system = String(body?.system ?? "Outgunned").trim();
    const heroIds: string[] = Array.isArray(body?.heroIds) ? body.heroIds : [];

    if (!title) return c.json({ error: "Title is required" }, 400);

    // Create campaign
    const newCampaignId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO campaigns (id, title, system, ownerId, heatEnabled, createdAt, description)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).bind(newCampaignId, title, system, currentUser.id, createdAt, description).run();

    // Creator becomes director
    await c.env.DB.prepare(`
      INSERT INTO memberships (userId, campaignId, role)
      VALUES (?, ?, 'director')
    `).bind(currentUser.id, newCampaignId).run();

    // For each selected hero: add the hero owner's membership & update character.campaignId
    const updatedHeroes: string[] = [];
    for (const heroId of heroIds) {
      // 1) Lookup hero owner
      const hero = await one<{ id: string; ownerId: string }>(
        c.env.DB,
        "SELECT id, ownerId FROM characters WHERE id = ?",
        [heroId]
      );
      if (!hero?.ownerId) continue;

      // 2) Ensure campaign membership for the hero's owner
      await c.env.DB.prepare(`
        INSERT INTO memberships (userId, campaignId, role)
        SELECT ?, ?, 'hero'
        WHERE NOT EXISTS (
          SELECT 1 FROM memberships WHERE userId = ? AND campaignId = ?
        )
      `).bind(hero.ownerId, newCampaignId, hero.ownerId, newCampaignId).run();

      // 3) Update character's campaignId
      // NOTE: bind order is (campaignId, characterId)
      await c.env.DB.prepare(`
        UPDATE characters SET campaignId = ?
        WHERE id = ?
      `).bind(newCampaignId, heroId).run();

      updatedHeroes.push(heroId);
    }

    // Return the new campaign id + debug info (optional)
    return c.json({ id: newCampaignId, updatedHeroes }, 201);
  } catch (e: any) {
    // Surface the DB error so the wizard shows a meaningful message
    return c.json({ error: "create_campaign_failed", message: e?.message || String(e) }, 500);
  }
});

// --- Campaign Admin (Director-only) ---
import { getCampaignMembership } from "../utils/auth";

/**
 * GET /campaigns/:campaignId/members
 * Return distinct members for a campaign (joined with users)
 */
campaigns.get("/:campaignId/members", async (c) => {
  const { campaignId } = c.req.param();
  const currentUser = c.get("user");

  // Guard: caller must be a director for this campaign
  const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
  if (!mem || mem.role !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Distinct members in this campaign (from any game in it)
  const rs = await c.env.DB.prepare(`
    SELECT DISTINCT m.userId, m.role, u.name, u.email
    FROM memberships m
    JOIN users u ON u.id = m.userId
    WHERE m.campaignId = ?
    ORDER BY u.name COLLATE NOCASE
  `).bind(campaignId).all<any>();

  return c.json(rs.results || []);
});

/**
 * POST /campaigns/:campaignId/members/:userId/role
 * Body: { role: "director" | "hero" }
 * Set a user's campaign-level role. If no row exists for (userId,campaignId),
 * create one with NULL gameId to represent campaign membership.
 */
campaigns.post("/:campaignId/members/:userId/role", async (c) => {
  const { campaignId, userId } = c.req.param();
  const { role } = await c.req.json<{ role: "director" | "hero" }>().catch(() => ({}));

  if (role !== "director" && role !== "hero") {
    return c.json({ error: "Invalid role" }, 400);
  }

  const currentUser = c.get("user");

  // Guard: caller must be a director for this campaign
  const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
  if (!mem || mem.role !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Try update an existing campaign-level row (any gameId allowed, we target the pure campaign row if present)
  const upd = await c.env.DB.prepare(`
    UPDATE memberships
    SET role = ?
    WHERE userId = ? AND campaignId = ?
  `).bind(role, userId, campaignId).run();

  // If no rows were updated, insert a campaign-level membership (NULL gameId)
  if ((upd.meta?.changes ?? 0) === 0) {
    await c.env.DB.prepare(`
      INSERT INTO memberships (userId, campaignId, role)
      VALUES (?, ?, ?)
    `).bind(userId, campaignId, role).run();
  }

  return c.json({ ok: true });
});

/**
 * POST /campaigns/:campaignId/heroes
 * Body: { heroId: string }
 * Director-only. Attaches the hero to the campaign and ensures the hero's owner
 * has a campaign-level membership as role 'hero'.
 */
campaigns.post("/:campaignId/heroes", async (c) => {
  try {
    const { campaignId } = c.req.param();
    const currentUser = c.get("user");
    if (!currentUser?.id) return c.json({ error: "unauthorized" }, 401);

    // Only a director can add heroes to a campaign
    const { getCampaignMembership } = await import("../utils/auth");
    const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
    if (!mem || mem.role !== "director") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { heroId } = await c.req.json<{ heroId: string }>().catch(() => ({} as any));
    if (!heroId) return c.json({ error: "heroId required" }, 400);

    // 1) Lookup hero owner
    const hero = await one<{ id: string; ownerId: string }>(
      c.env.DB,
      "SELECT id, ownerId FROM characters WHERE id = ?",
      [heroId]
    );
    if (!hero?.ownerId) return c.json({ error: "hero_not_found" }, 404);

    // 2) Update character's campaignId
    await c.env.DB.prepare(`
      UPDATE characters SET campaignId = ?
      WHERE id = ?
    `).bind(campaignId, heroId).run();

    // 3) Ensure campaign membership for the hero's owner
    await c.env.DB.prepare(`
      INSERT INTO memberships (userId, campaignId, role)
      SELECT ?, ?, 'hero'
      WHERE NOT EXISTS (
        SELECT 1 FROM memberships WHERE userId = ? AND campaignId = ?
      )
    `).bind(hero.ownerId, campaignId, hero.ownerId, campaignId).run();

    return c.json({ ok: true, heroId, campaignId });
  } catch (e: any) {
    return c.json({ error: "add_hero_failed", message: e?.message || String(e) }, 500);
  }
});