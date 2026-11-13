/* Shared site header + footer.
 * Edit the HTML below ONCE and every page updates. Each page just contains:
 *   <script src="aca-layout.js" data-slot="header"></script>   (where the header goes)
 *   <script src="aca-layout.js" data-slot="footer"></script>   (where the footer goes)
 * The script runs synchronously, so the header/footer are in place before the page paints.
 */
(function () {
  var me = document.currentScript;
  if (!me) return;
  var slot = me.getAttribute('data-slot');

  var HEADER = `
<header class="fixed top-0 inset-x-0 z-50 border-b border-zinc-800 bg-zinc-950">
  <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Main">
    <a href="/" class="flex items-center gap-3">
      <img src="assets/ACA-logo.png" alt="ACA" width="96" height="44" class="logo-blend h-11 w-24 shrink-0 object-contain">
      <span class="rounded-sm border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-zinc-400">BETA</span>
    </a>
    <div class="flex items-center gap-5">
      <img src="assets/GT40.png" alt="Ford GT40" class="logo-blend hidden h-10 w-auto object-contain opacity-80 sm:block">
      <a id="auth-link" href="/login" class="flex items-center gap-2 text-sm font-semibold text-red-500 transition-colors hover:text-red-400">
        <span id="auth-link-text" class="max-w-[7rem] truncate sm:max-w-[12rem]">Log in</span>
        <img id="auth-avatar" src="assets/user.png" alt="" width="28" height="28" class="h-7 w-7 shrink-0 object-contain">
      </a>
    </div>
  </nav>
</header>`;

  var FOOTER = `
<footer class="border-t border-zinc-800 bg-zinc-950 py-10">
  <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
    <div class="flex items-center gap-3">
      <img src="assets/ACA-logo.png" alt="ACA" width="64" height="32" class="logo-blend h-8 w-16 shrink-0 object-contain">
      <p class="text-sm text-zinc-500">Engineered for sim racers by sim racers.</p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
      <div class="flex items-center gap-5">
        <a href="https://www.instagram.com/assetocorsaaccelerator/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="opacity-70 transition-opacity hover:opacity-100">
          <img src="assets/Instagram.png" alt="" width="32" height="32" class="h-8 w-8 object-contain">
        </a>
        <a href="https://www.youtube.com/@AssetoCorsaAccelerator" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="opacity-70 transition-opacity hover:opacity-100">
          <img src="assets/Youtube.png" alt="" width="32" height="32" class="h-8 w-8 object-contain">
        </a>
        <a href="https://www.tiktok.com/@assetocorsaaccelerator" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="opacity-70 transition-opacity hover:opacity-100">
          <img src="assets/Tiktok.png" alt="" width="32" height="32" class="h-8 w-8 object-contain">
        </a>
      </div>
      <a href="https://www.reddit.com/r/assettocorsa/" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-white">r/assettocorsa</a>
      <span>&copy; <span id="year">${new Date().getFullYear()}</span> ACA</span>
    </div>
  </div>
  <p class="mx-auto mt-6 max-w-6xl px-5 text-center text-xs text-zinc-600 md:text-left">ACA is an independent project and is not affiliated with or endorsed by Kunos Simulazioni or 505 Games. Assetto Corsa is a trademark of its respective owners.</p>
</footer>`;

  var html = slot === 'header' ? HEADER : slot === 'footer' ? FOOTER : '';
  if (html) me.insertAdjacentHTML('beforebegin', html);
})();
