// Cache da app para funcionar offline. Mudar CACHE ao alterar ficheiros.
const CACHE = 'ref-v8';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // App: rede primeiro (para receber atualizações), cache se offline.
  if (url.origin === location.origin){
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Leitor de PDF (cdnjs): cache primeiro.
  if (url.hostname === 'cdnjs.cloudflare.com'){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
  }
});

// Notificações push (enviadas pelo servidor). Tocar na notificação = ✓ feito (para as repetições de 5 em 5 min).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Refeições', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Refeições', {
    body: d.body || '', tag: d.tag || undefined, renotify: true,
    icon: 'icon-192.png', badge: 'icon-192.png',
    actions: d.ack ? [{ action: 'done', title: '✓ Feito' }] : [],
    data: { url: d.url || './#hoje', ack: d.ack || null }
  }));
});
function sendAck(ack){
  if (!ack || !ack.url) return Promise.resolve();
  return fetch(ack.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: ack.key }), keepalive: true }).catch(() => {});
}
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const ack = e.notification.data?.ack;
  if (e.action === 'done'){ e.waitUntil(sendAck(ack)); return; }
  const url = new URL(ack ? './#ok=' + encodeURIComponent(ack.key) : (e.notification.data?.url || './#hoje'), self.registration.scope).href;
  e.waitUntil(Promise.all([
    sendAck(ack),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) if ('focus' in c){ c.postMessage({ type: 'ack', key: ack && ack.key }); return c.focus(); }
      return self.clients.openWindow(url);
    })
  ]));
});
