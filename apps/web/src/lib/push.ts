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

// Check for an existing subscription (used on page load)
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !(window as any).PushManager
  ) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Main helper to enable push notifications
export async function enablePushNotifications(): Promise<PushSubscription> {
  if (typeof window === "undefined") {
    throw new Error("Notifications can only be enabled in a browser.");
  }

  if (typeof Notification === "undefined") {
    throw new Error("This browser does not support notifications.");
  }

  if (!("serviceWorker" in navigator) || !(window as any).PushManager) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  // Ask for permission if needed
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error("Notifications permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;

  // Reuse existing subscription if present
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });
  }

  // Normalize for the Worker: endpoint + keys
  const subscriptionJson =
    typeof (subscription as any).toJSON === "function"
      ? (subscription as any).toJSON()
      : subscription;

  await api.post("/push/subscribe", {
    subscription: subscriptionJson,
  });

  return subscription;
}
