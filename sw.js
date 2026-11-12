// Service worker: aplikasi tetap terbuka saat offline. API Apps Script tidak pernah disentuh (POST dan domain lain dilewati).
const V = 'presensi-v11', ASET = ['index.html', 'presensi.html', 'admin.html', 'kelas.html', 'config.js', 'tema.css', 'tema.js', 'logo.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(ASET.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin || /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)cdn\.jsdelivr\.net$/.test(u.host)) {
    // jaringan dulu (agar pembaruan langsung terpakai), cadangan dari cache saat offline
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true })));
  }
});
