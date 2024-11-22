importScripts('./assets/js/data/swconf.js');

const purge = swconf.purge;
const interceptor = swconf.interceptor;

function verifyUrl(url) {
  const requestUrl = new URL(url);
  const requestPath = requestUrl.pathname;

  if (!requestUrl.protocol.startsWith('http')) {
    return false;
  }

  for (const prefix of interceptor.urlPrefixes) {
    if (requestUrl.href.startsWith(prefix)) {
      return false;
    }
  }

  for (const path of interceptor.paths) {
    if (requestPath.startsWith(path)) {
      return false;
    }
  }
  return true;
}

self.addEventListener('install', (event) => {
  if (purge) {
    return;
  }

  event.waitUntil(
    caches.open(swconf.cacheName).then((cache) => {
      return cache.addAll(swconf.resources);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (purge) {
            return caches.delete(key);
          } else {
            if (key !== swconf.cacheName) {
              return caches.delete(key);
            }
          }
        })
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request) // 네트워크에서 항상 최신 데이터를 가져옴
      .then((response) => {
        // GET 요청이고 URL이 유효하면 캐시 업데이트
        if (event.request.method === 'GET' && verifyUrl(event.request.url)) {
          let responseToCache = response.clone();
          caches.open(swconf.cacheName).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
});


// legacy
// self.addEventListener('fetch', (event) => {
//   if (event.request.headers.has('range')) {
//     return;
//   }

//   event.respondWith(
//     caches.match(event.request).then((response) => {
//       if (response) {
//         return response;
//       }

//       return fetch(event.request).then((response) => {
//         const url = event.request.url;

//         if (purge || event.request.method !== 'GET' || !verifyUrl(url)) {
//           return response;
//         }

//         // See: <https://developers.google.com/web/fundamentals/primers/service-workers#cache_and_return_requests>
//         let responseToCache = response.clone();

//         caches.open(swconf.cacheName).then((cache) => {
//           cache.put(event.request, responseToCache);
//         });
//         return response;
//       });
//     })
//   );
// });
