import { api } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Fetches VAPID public key from API (no auth).
 * @returns {Promise<Uint8Array | null>} applicationServerKey, or null if push is not configured.
 */
export async function fetchVapidKeyBytes() {
  const { data } = await api.get('/api/push/vapid-public-key');
  if (!data?.configured || !data?.publicKey) {
    return null;
  }
  return urlBase64ToUint8Array(data.publicKey);
}

/**
 * Subscribe this browser to Web Push; POSTs the subscription to the API (must be signed in).
 * @returns {Promise<'ok' | 'unavailable' | 'denied' | 'no-sw'>}
 */
export async function registerWebPush() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unavailable';
  }
  if (!('PushManager' in window)) {
    return 'unavailable';
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return 'denied';
  }
  const vapid = await fetchVapidKeyBytes();
  if (!vapid) {
    return 'unavailable';
  }
  const reg = await navigator.serviceWorker.ready;
  if (!reg.pushManager) {
    return 'unavailable';
  }
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe().catch(() => {});
  }
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapid,
  });
  const json = sub.toJSON();
  await api.post('/api/push/subscribe', json);
  return 'ok';
}

export async function unsubscribeWebPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const j = sub.toJSON();
    if (j.endpoint) {
      await api.post('/api/push/unsubscribe', { endpoint: j.endpoint }).catch(() => {});
    }
    await sub.unsubscribe().catch(() => {});
  }
}
