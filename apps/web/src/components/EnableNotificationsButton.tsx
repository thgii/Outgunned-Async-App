// apps/web/src/components/EnableNotificationsButton.tsx
import { useEffect, useState } from "react";
import { enablePushNotifications, getExistingSubscription } from "../lib/push";

type Status = "idle" | "working" | "enabled" | "error" | "unsupported";

export function EnableNotificationsButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // On mount, detect support + existing subscription
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      !(window as any).PushManager
    ) {
      setStatus("unsupported");
      setError("Push notifications are not supported in this browser.");
      return;
    }

    (async () => {
      try {
        // If permission already granted, check if we have a subscription
        if (Notification.permission === "granted") {
          const existing = await getExistingSubscription();
          if (existing) {
            setStatus("enabled");
            return;
          }
        }
        // Otherwise leave as "idle"
      } catch (e) {
        console.error("Failed to check existing push subscription", e);
      }
    })();
  }, []);

  async function handleClick() {
    if (status === "working" || status === "enabled" || status === "unsupported") return;

    try {
      setStatus("working");
      setError(null);
      await enablePushNotifications();
      setStatus("enabled");
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setError(e?.message ?? "Failed to enable notifications");
    }
  }

  // Simple label based on state
  let label = "Enable notifications";
  if (status === "working") label = "Enabling…";
  if (status === "enabled") label = "Notifications enabled";

  const disabled = status === "working" || status === "enabled" || status === "unsupported";

  // If already enabled, hide the whole component
if (status === "enabled") {
  return null;
}

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md border px-3 py-1 text-sm font-medium disabled:opacity-60"
        disabled={disabled}
      >
        {label}
      </button>
      {status === "unsupported" && (
        <p className="text-xs text-red-600">{error ?? "Notifications unsupported"}</p>
      )}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}