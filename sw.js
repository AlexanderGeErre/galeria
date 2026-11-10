/* Service worker del panel: guarda lo básico para que abra rápido y,
   si no hay internet, muestre la última versión conocida.
   Siempre intenta primero la red, así las actualizaciones llegan solas. */
var V = 'age-panel-v1';
var BASICO = ['plataforma.html', 'imagenes/icon-192.png', 'imagenes/logo-claro.png', 'imagenes/logo-oscuro.png'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(V).then(function(c){ return Promise.all(BASICO.map(function(u){ return c.add(u).catch(function(){}); })); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(k){ return Promise.all(k.filter(function(n){ return n !== V; }).map(function(n){ return caches.delete(n); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(function(res){
    if (res && res.ok) { var copia = res.clone(); caches.open(V).then(function(c){ c.put(r, copia); }); }
    return res;
  }).catch(function(){ return caches.match(r).then(function(h){ return h || (r.mode === 'navigate' ? caches.match('plataforma.html') : Response.error()); }); }));
});
