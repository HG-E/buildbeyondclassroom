// Registers the offline service worker. The site works fully without it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').catch(function () {
      /* Offline copy is a bonus; ignore failures. */
    });
  });
}
