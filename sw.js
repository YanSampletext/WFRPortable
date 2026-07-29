// WFRP4 Dossier — service worker (cache-first для оффлайна)
const CACHE = 'wfrp4-v13';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/base.css','./css/reskin.css','./css/marks.css','./css/gate-fix.css','./css/ui-fixes.css',
  './js/app.js','./js/marks.js','./js/health.js','./js/collapse.js','./js/crit.js','./js/schemes.js','./js/diseases.js','./js/psych.js','./js/spells.js',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
