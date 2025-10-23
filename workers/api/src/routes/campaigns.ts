import { Hono } from "hono";
import { q } from "../utils/db";

export const campaigns = new Hono<{ Bindings: { DB: D1Database } }>();

campaigns.get("/:id/games", async (c) => {
  const id = c.req.param("id");
  const rows = await q(c.env.DB, "SELECT * FROM games WHERE campaignId = ? ORDER BY createdAt", [id]);
  return c.json(rows);
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
