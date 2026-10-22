const C = "eng-plan-v15";
const FILES = ["./", "index.html", "data.js", "pack2.js", "pack3.js", "pack4.js", "pack5.js", "pack6.js", "pack7.js", "pron.js", "clinic.js", "lookup.js", "lab.js", "dialogues.js", "app.js", "manifest.json"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => { if (e.request.url.includes("/audio/")) return; e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request))); });
