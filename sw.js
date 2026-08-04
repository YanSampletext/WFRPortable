// Досье Ордо — service worker (cache-first для оффлайна)
const CACHE = 'ordo-v27';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/fonts.css',
  './css/base.css','./css/reskin.css','./css/marks.css','./css/ui-fixes.css',
  './js/storage-native.js','./js/dialogs.js','./js/app.js','./js/marks.js','./js/health.js','./js/collapse.js','./js/crit.js','./js/schemes.js','./js/diseases.js','./js/psych.js','./js/spells.js','./js/archive.js','./js/shell.js','./js/ad-slot.js','./js/back-nav.js',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Файлы шрифтов перечислять поимённо не нужно: всё своё и уже запрошенное
// докладывается в кеш на лету, поэтому офлайн работает и типографика тоже
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    if(hit) return hit;
    return fetch(e.request).then(res => {
      if(res.ok && new URL(e.request.url).origin === self.location.origin){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    });
  }));
});
