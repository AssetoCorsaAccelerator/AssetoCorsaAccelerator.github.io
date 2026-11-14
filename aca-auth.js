/* ACA shared auth + header logic. Keys live in aca-config.js (load that first). */
(function () {
  var cfg = window.ACA_CONFIG || {};
  var configured = !!(cfg.url && cfg.anonKey) && !/YOUR_/.test(cfg.url + cfg.anonKey);
  var ACA = { configured: configured, sb: null, ready: Promise.resolve(null) };

  // Absolute URL for a path on this site
  ACA.url = function (path) { return new URL(path, window.location.href).href; };

  if (window.supabase && configured) {
    ACA.sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    // Resolves with the current session (or null). Also finishes the Google OAuth redirect.
    ACA.ready = ACA.sb.auth.getSession()
      .then(function (r) { return (r.data && r.data.session) || null; })
      .catch(function () { return null; });
  }

  /* ---------- Header: name + car icon ---------- */
  var CACHE_KEY = 'aca_header';
  var DEFAULT_ICON_CLASS = 'h-7 w-7 shrink-0 object-contain';

  // Name fallback chain: chosen display name > Google name > email prefix
  ACA.metaName = function (user) {
    var m = (user && user.user_metadata) || {};
    return m.full_name || m.name || (user && user.email ? user.email.split('@')[0] : 'Account');
  };

  function renderHeader(name, avatar) {
    var link = document.getElementById('auth-link');
    var text = document.getElementById('auth-link-text');
    var img = document.getElementById('auth-avatar');
    if (!link || !text) return;
    text.textContent = name;
    link.setAttribute('href', '/dashboard');
    link.setAttribute('aria-label', 'Your account: ' + name);
    if (img && /^car[1-4]$/.test(avatar || '')) {
      img.src = 'assets/' + avatar + '.png';
      img.width = 56; img.height = 32;
      img.className = 'logo-blend h-8 w-14 shrink-0 object-contain';
    }
  }

  function resetHeader() {
    var link = document.getElementById('auth-link');
    var text = document.getElementById('auth-link-text');
    var img = document.getElementById('auth-avatar');
    if (text) text.textContent = 'Log in';
    if (link) { link.setAttribute('href', '/login'); link.removeAttribute('aria-label'); }
    if (img) { img.src = 'assets/user.png'; img.width = 28; img.height = 28; img.className = DEFAULT_ICON_CLASS; }
  }

  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; } }
  function writeCache(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) {} }
  function clearCache() { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} }

  // Call with the signed-in user and their profile row ({display_name, avatar}) to update the header everywhere.
  ACA.applyProfile = function (user, profile) {
    var name = (profile && profile.display_name) || ACA.metaName(user);
    var avatar = (profile && profile.avatar) || 'car1';
    renderHeader(name, avatar);
    writeCache({ uid: user.id, name: name, avatar: avatar });
  };

  function initHeader() {
    ACA.ready.then(function (session) {
      if (!session) { clearCache(); return; }
      var user = session.user;
      var cached = readCache();
      if (cached && cached.uid === user.id) renderHeader(cached.name, cached.avatar);
      else renderHeader(ACA.metaName(user), null);

      if (!ACA.sb) return;
      ACA.sb.from('profiles').select('display_name, avatar').eq('user_id', user.id).maybeSingle()
        .then(function (res) { if (!res.error && res.data) ACA.applyProfile(user, res.data); });
    });
    if (ACA.sb) ACA.sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') { clearCache(); resetHeader(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeader);
  else initHeader();

  window.ACA = ACA;

  /* ---------- Desktop app handoff ----------
     The ACA desktop app opens  /login?desktop_port=PORT&state=STATE  in the browser.
     We remember that request for this tab. Once a session exists (already logged in, email
     login, Google login) we show a "Logging you in" screen for a couple of seconds, then send
     the user's profile to the app's local listener at 127.0.0.1:PORT. */
  (function () {
    var KEY = 'aca_desktop_handoff';
    var MIN_SHOW_MS = 2200;   // how long the "Logging you in" screen stays up

    try {
      var q = new URLSearchParams(window.location.search);
      var port = q.get('desktop_port'), state = q.get('state');
      if (port && /^\d{4,5}$/.test(port) && state && /^[\w-]{8,64}$/.test(state)) {
        sessionStorage.setItem(KEY, JSON.stringify({ port: port, state: state, t: Date.now() }));
      }
    } catch (e) {}

    function showLinking() {
      if (document.getElementById('aca-linking')) return;
      var st = document.createElement('style');
      st.textContent = '@keyframes aca-spin{to{transform:rotate(360deg)}}' +
        '@media (prefers-reduced-motion:reduce){#aca-linking .aca-spin{animation:none!important}}';
      document.head.appendChild(st);
      var el = document.createElement('div');
      el.id = 'aca-linking';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;' +
        'background:#09090b;color:#d4d4d8;text-align:center;' +
        'font-family:Inter,ui-sans-serif,system-ui,sans-serif';
      el.innerHTML =
        '<p style="margin:0;font:600 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.15em;' +
        'text-transform:uppercase;color:#ef4444">Driver Profile</p>' +
        '<h1 style="margin:0;font-size:32px;font-weight:900;color:#fff">Logging you in\u2026</h1>' +
        '<p id="aca-linking-sub" style="margin:0;color:#a1a1aa">Linking your account to the ACA desktop app.</p>' +
        '<div class="aca-spin" style="width:28px;height:28px;margin-top:8px;border:3px solid #27272a;' +
        'border-top-color:#dc2626;border-radius:50%;animation:aca-spin .8s linear infinite"></div>';
      (document.body || document.documentElement).appendChild(el);
    }

    ACA.ready.then(function (session) {
      if (!session || !ACA.sb) return;
      var h = null;
      try { h = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
      if (!h || Date.now() - h.t > 10 * 60 * 1000) return;
      sessionStorage.removeItem(KEY);
      var user = session.user;
      var started = Date.now();
      showLinking();

      function go(p) {
        p = p || {};
        var params = new URLSearchParams({
          state: h.state,
          email: user.email || '',
          name: p.display_name || ACA.metaName(user),
          avatar: /^car[1-4]$/.test(p.avatar || '') ? p.avatar : 'car1',
          beta: p.is_beta_tester ? '1' : '0',
          api_key: p.api_key || ''
        });
        var url = 'http://127.0.0.1:' + h.port + '/callback?' + params.toString();
        setTimeout(function () {
          window.location.replace(url);
          setTimeout(function () {
            var sub = document.getElementById('aca-linking-sub');
            if (sub) {
              sub.style.color = '#fca5a5';
              sub.textContent = 'Couldn\u2019t reach the ACA app. Click Log In in the app and try again.';
            }
          }, 6000);
        }, Math.max(0, MIN_SHOW_MS - (Date.now() - started)));
      }

      ACA.sb.from('profiles').select('display_name, avatar, is_beta_tester, api_key')
        .eq('user_id', user.id).maybeSingle()
        .then(function (res) { go(res && res.data); }, function () { go(null); });
    });
  })();

  /* ---------- Scrollbar: visible near the right edge or while scrolling ---------- */
  (function () {
    var root = document.documentElement, nearEdge = false, timer;
    function update(on) { root.classList.toggle('sb-show', on); }
    document.addEventListener('mousemove', function (e) {
      nearEdge = e.clientX >= window.innerWidth - 40;
      update(nearEdge);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { nearEdge = false; update(false); });
    window.addEventListener('scroll', function () {
      update(true);
      clearTimeout(timer);
      timer = setTimeout(function () { update(nearEdge); }, 900);
    }, { passive: true });
  })();

  /* ---------- Clean URLs: hide ".html" and "/index.html" in the address bar ---------- */
  try {
    var p = window.location.pathname;
    var clean = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (clean !== p) window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
  } catch (e) { /* ignore */ }
})();
