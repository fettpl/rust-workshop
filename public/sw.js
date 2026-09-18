const CACHE = 'rust-workshop-v26';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('rust-workshop-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
async function cacheResponse(request, key = request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(key, response.clone());
  }
  return response;
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(cacheResponse(event.request, '/').catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/monaco/') || url.pathname.startsWith('/icon') || url.pathname.startsWith('/projects/')) {
    event.respondWith(caches.match(event.request).then(hit => hit || cacheResponse(event.request)));
  }
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_RESOURCES' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter(value => {
    try {
      const url = new URL(value);
      return url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/monaco/') || url.pathname.startsWith('/projects/'));
    } catch { return false; }
  });
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(urls.map(url => cache.add(url).catch(() => {})))));
});
