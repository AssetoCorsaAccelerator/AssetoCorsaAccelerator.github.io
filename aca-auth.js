/* ACA shared Supabase client.
 * 1) Replace the two placeholders below with values from
 *    Supabase Dashboard > Project Settings > API (Project URL + "anon" public key).
 * 2) The anon key is safe to ship in the browser ONLY because Row Level Security is on.
 *    Never put the service_role key here.
 */
(function () {
  var SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
