const CACHE_NAME = 'fb-accounting-v1';
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
  evt.respondWith(
    caches.match(evt.request).then(function(cached){
      return cached || fetch(evt.request).then(function(response){
        return caches.open(CACHE_NAME).then(function(cache){
          if(evt.request.method === 'GET'){
            cache.put(evt.request, response.clone());
          }
          return response;
        });
      }).catch(function(){
        return cached;
      });
    })
  );
});
