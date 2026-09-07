/* GA4: public pages only, opt-in analytics, no form values or URL query data. */
(() => {
  if (location.hostname !== 'futureproofagents.com' || window.fpAnalytics) return;
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  const id = 'G-MSW885P1MB';
  const key = 'fp-analytics-consent-v1';
  const he = document.documentElement.lang === 'he';
  let enabled = false;
  let loaded = false;
  const saved = () => { try { return localStorage.getItem(key); } catch { return null; } };
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  function enable() {
    enabled = true;
    window['ga-disable-' + id] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', id, {
      page_location: location.origin + location.pathname,
      page_referrer: (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(tag);
  }
  function disable() {
    enabled = false;
    window['ga-disable-' + id] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax';
      }
    }
  }
  const allowed = new Set(['whatsapp_click', 'booking_click', 'newsletter_signup']);
  window.fpAnalytics = (event) => {
    if (enabled && allowed.has(event)) gtag('event', event, { page_path: location.pathname, language: he ? 'he' : 'en', transport_type: 'beacon' });
  };
  document.addEventListener('click', (event) => {
    const a = event.target.closest?.('a[href]');
    if (!a) return;
    let u; try { u = new URL(a.href); } catch { return; }
    if (u.hostname === 'wa.me') window.fpAnalytics('whatsapp_click');
    if (['calendar.app.google', 'calendly.com', 'cal.com'].includes(u.hostname)) window.fpAnalytics('booking_click');
  });
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', he ? 'העדפות מדידה' : 'Analytics preferences');
  panel.dir = he ? 'rtl' : 'ltr';
  panel.className = 'fp-consent';
  const text = document.createElement('p');
  text.textContent = he ? 'לאפשר מדידה ב־Google Analytics כדי לעזור לנו לשפר את האתר? ללא פרסום מותאם אישית.' : 'Allow Google Analytics to help us improve this website? No personalized advertising.';
  panel.append(text);
  const settings = document.createElement('button');
  settings.className = 'fp-consent-settings';
  settings.type = 'button';
  settings.textContent = he ? 'העדפות מדידה' : 'Analytics preferences';
  settings.onclick = () => { panel.hidden = false; settings.hidden = true; };
  function choose(value) {
    try { localStorage.setItem(key, value); } catch { /* choice still applies to this page */ }
    value === 'granted' ? enable() : disable();
    panel.hidden = true; settings.hidden = false;
  }
  for (const [value, label] of [['granted', he ? 'לאפשר' : 'Allow'], ['denied', he ? 'לא תודה' : 'No thanks']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = () => choose(value); panel.append(button);
  }
  const style = document.createElement('style');
  style.textContent = '.fp-consent{position:fixed;bottom:16px;inset-inline:16px;margin:auto;max-width:440px;padding:18px;background:#16181c;color:#e7e9ea;border:1px solid #536471;border-radius:16px;z-index:10000;font:14px/1.5 system-ui;box-shadow:0 6px 32px #0008}.fp-consent p{margin:0 0 12px}.fp-consent button,.fp-consent-settings{font:inherit;cursor:pointer;border:1px solid #536471;border-radius:8px;padding:8px 14px;background:#16181c;color:#fff}.fp-consent button{margin-inline-end:10px}.fp-consent button:focus-visible,.fp-consent-settings:focus-visible{outline:2px solid #1d9bf0;outline-offset:3px}.fp-consent-settings{position:fixed;bottom:8px;inset-inline-start:8px;z-index:9999;font:11px system-ui;opacity:.85}.fp-consent[hidden],.fp-consent-settings[hidden]{display:none}';
  document.head.append(style); document.body.append(panel, settings);
  const value = saved();
  panel.hidden = value !== null; settings.hidden = value === null;
  if (value === 'granted') enable();
})();
