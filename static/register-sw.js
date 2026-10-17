// Registers the offline service worker. The site works fully without it.
var saver = false;
try { saver = !!(navigator.connection && navigator.connection.saveData); } catch (e) { saver = false; }
if ('serviceWorker' in navigator && !saver) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').catch(function () {
      /* Offline copy is a bonus; ignore failures. */
    });
  });
}
