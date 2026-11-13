(function () {
  var SUPABASE_URL = 'https://gxxmnpsjdwabgzwrcwrd.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YDgX0o65lMGFuPwP722RDQ_kLk-CTP4';

  var configured = !/YOUR_/.test(SUPABASE_URL + SUPABASE_ANON_KEY);
  var ACA = { configured: configured, sb: null, ready: Promise.resolve(null) };

  // Absolute URL for a page next to the current one (works on GitHub Pages project sites)
  ACA.url = function (path) { return new URL(path, window.location.href).href; };

  if (window.supabase && configured) {
    ACA.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    // Resolves with the current session (or null). Also finishes the Google OAuth redirect.
    ACA.ready = ACA.sb.auth.getSession().then(function (r) { return (r.data && r.data.session) || null; })
                                         .catch(function () { return null; });
  }

  window.ACA = ACA;

  // Header: swap "Log in" for "Dashboard" when someone is signed in.
  function updateHeader() {
    ACA.ready.then(function (session) {
      var link = document.getElementById('auth-link');
      var text = document.getElementById('auth-link-text');
      if (session && link && text) { text.textContent = 'Dashboard'; link.setAttribute('href', 'dashboard.html'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateHeader);
  else updateHeader();
})();

// Scrollbar reveal: visible while the pointer is near the right edge, or briefly while scrolling.
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
