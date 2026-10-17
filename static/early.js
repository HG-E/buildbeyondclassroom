/* Runs before the first paint, in the page head. It does one thing: on a phone, show the compact header
   (brand and menu button) from the very first frame, instead of a two-row header that shrinks when site.js
   arrives and pushes the whole page up. Without JavaScript nothing changes: the links stay visible in the header.
   If site.js never arrives, the plain links come back after six seconds, so the menu is never lost. */
(function () {
  var root = document.documentElement;
  root.classList.add('has-menu');
  setTimeout(function () {
    var btn = document.getElementById('menuBtn');
    if (btn && btn.hidden) root.classList.remove('has-menu');
  }, 6000);
})();
