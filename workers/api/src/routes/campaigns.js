import { Hono } from "hono";
import { q } from "../utils/db";
export const campaigns = new Hono();
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
