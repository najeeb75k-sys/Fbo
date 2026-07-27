const CACHE_NAME = 'fb-accounting-v3'; // version bump so browser forcibly updates
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(evt){
  evt.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(evt){
  evt.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(key){
        return key !== CACHE_NAME;
      }).map(function(key){
        return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(evt){
  // Network-first for Firebase/API calls, cache-first for app shell
  if(evt.request.url.indexOf('googleapis.com') !== -1 ||
     evt.request.url.indexOf('firestore') !== -1 ||
     evt.request.url.indexOf('gstatic.com') !== -1){
    return; // let these go straight to network (Firebase needs live connection)
  }

  // Only cache GET requests — POST/PUT to cache.put() throws errors
  if(evt.request.method !== 'GET'){
    return;
  }

  // Network-first for the app page itself (index.html / navigation), so future
  // updates (jaise sidebar) turant nazar aayen. Offline hone par cache se milega.
  const isHtmlRequest = evt.request.mode === 'navigate' ||
    evt.request.url.indexOf('index.html') !== -1 ||
    evt.request.url.endsWith('/') ;
  if(isHtmlRequest){
    evt.respondWith(
      fetch(evt.request).then(function(response){
        // clone BEFORE any other use, and only cache valid, basic (same-origin) responses
        const copy = response.clone();
        if(response.ok && response.type === 'basic'){
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(evt.request, copy).catch(function(){ /* ignore cache errors */ });
          });
        }
        return response;
      }).catch(function(){
        return caches.match(evt.request);
      })
    );
    return;
  }

  // Cache-first for static assets (icons, manifest, etc.)
  evt.respondWith(
    caches.match(evt.request).then(function(cached){
      if(cached) return cached;
      return fetch(evt.request).then(function(response){
        const copy = response.clone();
        if(response.ok && response.type === 'basic'){
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(evt.request, copy).catch(function(){ /* ignore cache errors */ });
          });
        }
        return response;
      }).catch(function(){
        return cached;
      });
    })
  );
});
