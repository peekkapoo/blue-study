export const isPushSupported = () => (
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window
);

export const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  const standaloneMatch = window.matchMedia?.('(display-mode: standalone)');
  return Boolean(standaloneMatch?.matches || window.navigator?.standalone);
};

export const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const ensureServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker not supported');
  }
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
};

export const getExistingSubscription = async () => {
  const registration = await ensureServiceWorker();
  return registration.pushManager.getSubscription();
};

export const subscribeToPush = async (publicKey) => {
  const registration = await ensureServiceWorker();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
};

export const unsubscribeFromPush = async () => {
  const registration = await ensureServiceWorker();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription;
};
