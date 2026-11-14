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
     We remember that request for this tab, and the moment a session exists (already logged in,
     email login, Google login) we send the user's profile to the app's local server at
     127.0.0.1:PORT and leave. location.replace() keeps the tab's history short, which gives
     browsers the best chance of letting the final page close the tab. */
  (function () {
    var KEY = 'aca_desktop_handoff';

    try {
      var q = new URLSearchParams(window.location.search);
      var port = q.get('desktop_port'), state = q.get('state');
      if (port && /^\d{4,5}$/.test(port) && state && /^[\w-]{8,64}$/.test(state)) {
        sessionStorage.setItem(KEY, JSON.stringify({ port: port, state: state, t: Date.now() }));
        console.info('[ACA] desktop sign-in requested, waiting for session');
      }
    } catch (e) {}

    ACA.ready.then(function (session) {
      if (!session || !ACA.sb) return;
      var h = null;
      try { h = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
      if (!h || Date.now() - h.t > 10 * 60 * 1000) return;
      sessionStorage.removeItem(KEY);
      var user = session.user;

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
        console.info('[ACA] handing session to desktop app');
        window.location.replace('http://127.0.0.1:' + h.port + '/callback?' + params.toString());
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
