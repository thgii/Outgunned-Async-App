// apps/web/src/components/EnableNotificationsButton.tsx
import { useState } from "react";
import { enablePushNotifications } from "../lib/push";

export function EnableNotificationsButton() {
  const [status, setStatus] = useState<"idle" | "working" | "enabled" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    try {
      setStatus("working");
      setError(null);
      await enablePushNotifications();
      setStatus("enabled");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Failed to enable notifications");
    }
  }

  if (status === "enabled") {
    return <p className="text-sm text-emerald-600">Notifications enabled ✅</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md border px-3 py-1 text-sm font-medium"
      >
        Enable notifications
      </button>
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
