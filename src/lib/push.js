import { API_BASE } from "../api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}
export function notifGranted() {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

async function vapidKey() {
  const r = await fetch(`${API_BASE}/api/config`);
  const d = await r.json();
  return d.vapidPublicKey;
}

// Request permission, subscribe via the service worker, register with the API.
// `apiPost` is the authed useApi() fn.
export async function enablePush(apiPost) {
  if (!pushSupported()) throw new Error("This browser doesn't support notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked — turn them on in your browser settings.");

  const reg = await navigator.serviceWorker.ready;
  const key = await vapidKey();
  if (!key) throw new Error("Push isn't configured on the server yet.");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  await apiPost("/api/player/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
  return true;
}
