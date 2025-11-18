// apps/web/src/lib/push.ts
import { api } from "./api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY!;

// Base64 → Uint8Array helper
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission denied");
  }

  // Ensure SW is ready (you already register it in main.tsx / index.html)
  const registration = await navigator.serviceWorker.ready;

  // Create / refresh subscription
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // 🔑 Convert to plain JSON so the Worker sees endpoint/keys
  const subscriptionJson =
    typeof (subscription as any).toJSON === "function"
      ? (subscription as any).toJSON()
      : subscription;

  // Send subscription to your backend using the shared API helper
  await api.post("/push/subscribe", {
    json: { subscription: subscriptionJson },
  });

  return subscription;
}
