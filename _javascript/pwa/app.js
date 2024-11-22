import Toast from 'bootstrap/js/src/toast';

if ('serviceWorker' in navigator) {
  // Get Jekyll config from URL parameters
  const src = new URL(document.currentScript.src);
  const register = src.searchParams.get('register');
  const baseUrl = src.searchParams.get('baseurl');

  if (register) {
    const swUrl = `${baseUrl}/sw.min.js`;

    navigator.serviceWorker.register(swUrl).then((registration) => {
      // 새 Service Worker가 대기 상태라면 즉시 활성화하고 새로고침
      if (registration.waiting) {
        registration.waiting.postMessage('SKIP_WAITING');
        window.location.reload();
      }

      // 업데이트가 발견되었을 때 자동 새로고침
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
            window.location.reload();
          }
        });
      });
    });

    // 기존 캐시 삭제 (새 콘텐츠를 받을 때마다 실행)
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
  } else {
    // 기존에 등록된 모든 Service Worker 제거
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });

    // 기존 캐시 삭제
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
  }
}

// if ('serviceWorker' in navigator) {
//   // Get Jekyll config from URL parameters
//   const src = new URL(document.currentScript.src);
//   const register = src.searchParams.get('register');
//   const baseUrl = src.searchParams.get('baseurl');

//   if (register) {
//     const swUrl = `${baseUrl}/sw.min.js`;
//     const notification = document.getElementById('notification');
//     const btnRefresh = notification.querySelector('.toast-body>button');
//     const popupWindow = Toast.getOrCreateInstance(notification);

//     navigator.serviceWorker.register(swUrl).then((registration) => {
//       // Restore the update window that was last manually closed by the user
//       if (registration.waiting) {
//         popupWindow.show();
//       }

//       registration.addEventListener('updatefound', () => {
//         registration.installing.addEventListener('statechange', () => {
//           if (registration.waiting) {
//             if (navigator.serviceWorker.controller) {
//               popupWindow.show();
//             }
//           }
//         });
//       });

//       btnRefresh.addEventListener('click', () => {
//         if (registration.waiting) {
//           registration.waiting.postMessage('SKIP_WAITING');
//         }
//         popupWindow.hide();
//       });
//     });

//     let refreshing = false;

//     // Detect controller change and refresh all the opened tabs
//     navigator.serviceWorker.addEventListener('controllerchange', () => {
//       if (!refreshing) {
//         window.location.reload();
//         refreshing = true;
//       }
//     });
//   } else {
//     navigator.serviceWorker.getRegistrations().then(function (registrations) {
//       for (let registration of registrations) {
//         registration.unregister();
//       }
//     });
//   }
// }
