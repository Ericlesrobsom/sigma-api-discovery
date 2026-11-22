(() => {
  const chaves = (st) => {
    try { return Object.keys(st); } catch (e) { return []; }
  };
  const cookies = document.cookie
    ? document.cookie.split(';').map((c) => c.split('=')[0].trim())
    : [];
  const scripts = [...document.scripts].map((s) => s.src).filter(Boolean);
  const recursos = performance.getEntriesByType('resource')
    .map((r) => r.name)
    .filter((u) => /api|ajax|graphql|json|rest/i.test(u))
    .slice(-100);
  const frameworks = {
    next: !!window.__NEXT_DATA__,
    nuxt: !!window.__NUXT__,
    react: !!window.React || !!document.querySelector('[data-reactroot]'),
    vue: !!window.Vue || !!document.querySelector('[data-v-app]'),
    jquery: !!window.jQuery,
    axios: !!window.axios
  };

  return JSON.stringify({
    url: location.href,
    title: document.title,
    frameworks,
    localStorage: chaves(localStorage),
    sessionStorage: chaves(sessionStorage),
    cookies,
    scripts,
    recursos
  }, null, 2);
})()
