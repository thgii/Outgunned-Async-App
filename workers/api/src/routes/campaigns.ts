import { Hono } from "hono";
import { q, one } from "../utils/db";

export const campaigns = new Hono<{ Bindings: { DB: D1Database } }>();

campaigns.get("/:id", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user"); // your auth middleware sets this
  const userId = user?.id;

  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? LIMIT 1"
  ).bind(id).first();

  if (!campaign) return c.json({ error: "not found" }, 404);

  // 🔹 Look up membership for this user
  let membershipRole: string | null = null;
  if (userId) {
    const membership = await c.env.DB.prepare(
      "SELECT role FROM memberships WHERE campaignId = ? AND userId = ? LIMIT 1"
    ).bind(id, userId).first();
    membershipRole = membership?.role ?? null;
  }

  // 🔹 Include membership role in the response
  return c.json({ ...campaign, membershipRole });
});


// POST /campaigns/:campaignId/games  -> create a new "Act" (game) and return it
campaigns.post("/:campaignId/games", async (c) => {
  try {
    const { campaignId } = c.req.param();
    const currentUser = c.get("user");
    if (!currentUser?.id) return c.json({ error: "unauthorized" }, 401);

    // Only Directors can create new Acts for a campaign
    const { getCampaignMembership } = await import("../utils/auth");
    const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
    if (!mem || mem.role !== "director") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim();
    if (!title) return c.json({ error: "Title is required" }, 400);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status = "active"; // or "new" if you prefer

    await c.env.DB.prepare(`
      INSERT INTO games (id, campaignId, title, status, options, createdAt)
      VALUES (?, ?, ?, ?, NULL, ?)
    `).bind(id, campaignId, title, status, createdAt).run();

    // Return the new game/act
    return c.json({ id, campaignId, title, status, createdAt });
  } catch (e: any) {
    return c.json({ error: "create_act_failed", message: e?.message || String(e) }, 500);
  }
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

/**
 * GET /campaigns/:campaignId/heroes
 * Return heroes currently in the campaign (with owner info).
 * Members-only; directors or heroes can see this list.
 */
campaigns.get("/:campaignId/heroes", async (c) => {
  const { campaignId } = c.req.param();
  const currentUser = c.get("user");
  const { getCampaignMembership } = await import("../utils/auth");

  const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
  if (!mem) return c.json({ error: "Forbidden" }, 403);

  const rs = await c.env.DB.prepare(`
    SELECT ch.id, ch.name, ch.ownerId, u.name AS ownerName, ch.campaignId
    FROM characters ch
    LEFT JOIN users u ON u.id = ch.ownerId
    WHERE ch.campaignId = ?
    ORDER BY ch.createdAt DESC
  `).bind(campaignId).all<any>();

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

/**
 * POST /campaigns/:campaignId/heroes/:heroId/remove
 * Director-only. Moves hero to UNASSIGNED campaign and
 * removes the owner's hero membership if they have no other heroes here
 * and are not a director.
 */
campaigns.post("/:campaignId/heroes/:heroId/remove", async (c) => {
  try {
    const { campaignId, heroId } = c.req.param();
    const currentUser = c.get("user");
    const { getCampaignMembership } = await import("../utils/auth");

    if (!currentUser?.id) return c.json({ error: "unauthorized" }, 401);

    const mem = await getCampaignMembership(c.env.DB, currentUser.id, campaignId);
    if (!mem || mem.role !== "director") return c.json({ error: "Forbidden" }, 403);

    // Lookup hero + owner
    const hero = await one<{ id: string; ownerId: string }>(
      c.env.DB,
      "SELECT id, ownerId FROM characters WHERE id = ? AND campaignId = ?",
      [heroId, campaignId]
    );
    if (!hero?.ownerId) return c.json({ error: "hero_not_found_or_not_in_campaign" }, 404);

    // Move hero to UNASSIGNED campaign bucket
    const UNASSIGNED_CAMPAIGN_ID = "unassigned-campaign"; // keep consistent with your seeding
    await c.env.DB.prepare(`
      UPDATE characters SET campaignId = ?
      WHERE id = ?
    `).bind(UNASSIGNED_CAMPAIGN_ID, heroId).run();

    // If owner has no other heroes left in this campaign and is not a director,
    // remove their hero membership for this campaign.
    const otherCount = await one<{ cnt: number }>(
      c.env.DB,
      "SELECT COUNT(*) as cnt FROM characters WHERE ownerId = ? AND campaignId = ?",
      [hero.ownerId, campaignId]
    );
    const isDirector = await one<{ ok: number }>(
      c.env.DB,
      "SELECT 1 as ok FROM memberships WHERE userId = ? AND campaignId = ? AND role = 'director' LIMIT 1",
      [hero.ownerId, campaignId]
    );

    if ((otherCount?.cnt ?? 0) === 0 && !isDirector?.ok) {
      await c.env.DB.prepare(`
        DELETE FROM memberships
        WHERE userId = ? AND campaignId = ? AND role = 'hero'
      `).bind(hero.ownerId, campaignId).run();
    }

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: "remove_hero_failed", message: e?.message || String(e) }, 500);
  }
});

// DELETE /campaigns/:campaignId
// Deletes the campaign, all games (acts) under it, related chat/messages,
// removes campaign memberships, and reassigns characters to "unassigned-campaign".
// workers/api/src/routes/campaigns.ts

campaigns.delete("/:campaignId", async (c) => {
  const { campaignId } = c.req.param();
  const user = c.get("user");
  if (!user?.id) return c.json({ error: "unauthorized" }, 401);

  try {
    const { getCampaignMembership } = await import("../utils/auth");
    const mem = await getCampaignMembership(c.env.DB, user.id, campaignId);
    if (!mem || mem.role !== "director") {
      return c.json({ error: "forbidden" }, 403);
    }

    const UNASSIGNED_ID = "unassigned-campaign";
    const stmts = [
      // Ensure an "unassigned" campaign exists (no SELECT needed)
      c.env.DB
        .prepare(`INSERT OR IGNORE INTO campaigns (id, title) VALUES (?, ?)`)
        .bind(UNASSIGNED_ID, "Unassigned"),

      // Delete game-scoped messages (add more tables here if you have them)
      c.env.DB
        .prepare(
          `DELETE FROM messages
           WHERE gameId IN (SELECT id FROM games WHERE campaignId = ?)`
        )
        .bind(campaignId),

      // (Optional) other per-game tables:
      // c.env.DB.prepare(
      //   `DELETE FROM threads WHERE gameId IN (SELECT id FROM games WHERE campaignId = ?)`
      // ).bind(campaignId),
      // c.env.DB.prepare(
      //   `DELETE FROM rolls WHERE gameId IN (SELECT id FROM games WHERE campaignId = ?)`
      // ).bind(campaignId),

      // Delete the games (acts)
      c.env.DB
        .prepare(`DELETE FROM games WHERE campaignId = ?`)
        .bind(campaignId),

      // Reassign characters to unassigned campaign
      c.env.DB
        .prepare(`UPDATE characters SET campaignId = ? WHERE campaignId = ?`)
        .bind(UNASSIGNED_ID, campaignId),

      // Remove campaign memberships
      c.env.DB
        .prepare(`DELETE FROM memberships WHERE campaignId = ?`)
        .bind(campaignId),

      // Finally delete the campaign
      c.env.DB
        .prepare(`DELETE FROM campaigns WHERE id = ?`)
        .bind(campaignId),
    ];

    // IMPORTANT: use batch() instead of manual BEGIN/COMMIT
    await c.env.DB.batch(stmts);

    return c.json({ ok: true, deletedCampaignId: campaignId });
  } catch (e: any) {
    return c.json(
      { error: "delete_campaign_failed", message: e?.message || String(e) },
      500
    );
  }
});

