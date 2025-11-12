// apps/web/src/lib/postRollToChat.ts
import { api } from "./api";

/** Post a one-line dice result into the game's chat stream. */
export async function postRollToChat(gameId: string, content: string) {
  // Matches your ChatBox + worker: POST /games/:id/messages { content }
  await api(`/games/${gameId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

  // Optional: nudge any listeners (ChatBox already polls, so this is just a nice-to-have)
  window.dispatchEvent(new CustomEvent("chat:message-posted", { detail: { gameId } }));
}
