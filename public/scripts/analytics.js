/* Public-page measurement is opt-in. Never send form values to Google. */
(() => {
  if (location.hostname !== 'futureproofagents.com' || window.fpAnalytics) return;
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  const id = 'G-MSW885P1MB';
  const key = 'fp-analytics-consent-v1';
  const adsKey = 'fp-ads-measurement-consent-v1';
  const adsConversion = document.currentScript?.dataset.googleAdsConversion || '';
  const hasAds = /^AW-\d+\/[A-Za-z0-9_-]+$/.test(adsConversion);
  const adsId = hasAds ? adsConversion.split('/')[0] : '';
  const he = document.documentElement.lang === 'he';
  let enabled = false;
  let loaded = false;
  let analyticsConfigured = false;
  let adsConfigured = false;
  let adsEnabled = false;
  const sentLeads = new Set();
  const saved = (storageKey) => { try { return localStorage.getItem(storageKey); } catch { return null; } };
  const pageReferrer = (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })();
  // Only Google's click IDs are useful to Ads; exclude arbitrary query data.
  const adsPage = new URL(location.origin + location.pathname);
  for (const name of ['gclid', 'gbraid', 'wbraid']) {
    const value = new URLSearchParams(location.search).get(name);
    if (value && /^[A-Za-z0-9_.-]{1,300}$/.test(value)) adsPage.searchParams.set(name, value);
  }
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('set', 'ads_data_redaction', true);
  function loadTag() {
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(tag);
  }
  function enable() {
    enabled = true;
    window['ga-disable-' + id] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    loadTag();
    if (analyticsConfigured) return;
    analyticsConfigured = true;
    gtag('config', id, {
      page_location: location.origin + location.pathname,
      page_referrer: pageReferrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }
  function enableAds() {
    if (!hasAds) return;
    adsEnabled = true;
    gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
    loadTag();
    if (adsConfigured) return;
    adsConfigured = true;
    gtag('config', adsId, {
      page_location: adsPage.href, page_referrer: pageReferrer,
      allow_enhanced_conversions: false, allow_ad_personalization_signals: false
    });
  }
  function disable() {
    enabled = false;
    window['ga-disable-' + id] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    if (hasAds) {
      adsEnabled = false;
      gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    }
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name) && !(hasAds && /^_gcl_/.test(name))) continue;
      for (const domain of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax';
      }
    }
  }
  const allowed = new Set(['whatsapp_click', 'booking_click', 'newsletter_signup', 'lead_cta_click', 'lead_form_start', 'lead_form_step', 'lead_form_error', 'generate_lead']);
  const projectIcps = { 'distributor-order-intake': 'distribution', 'maintenance-renewals-repair-quotes': 'maintenance_services', 'fund-investor-relations': 'fund_ir', 'construction-document-workflows': 'construction', 'accounting-client-operations': 'accounting', 'real-estate-document-review': 'property_law', 'executive-search-intelligence': 'executive_search', 'immigration-case-operations': 'immigration_law', 'personal-injury-care-coordination': 'pi_care_coordination' };
  window.fpAnalytics = (event, metadata = {}) => {
    if (!enabled || !allowed.has(event)) return;
    const project = document.body.dataset.project;
    const context = Object.hasOwn(projectIcps, project) ? { project_slug: project, icp: projectIcps[project] } : {};
    if (['nav', 'hero', 'pilot'].includes(metadata.cta_location)) context.cta_location = metadata.cta_location;
    gtag('event', event, { send_to: id, page_path: location.pathname, language: he ? 'he' : 'en', ...context, transport_type: 'beacon' });
  };
  window.fpGoogleAdsLead = (leadId) => {
    if (!adsEnabled || typeof leadId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId) || sentLeads.has(leadId)) return false;
    gtag('event', 'conversion', {
      send_to: adsConversion, transaction_id: leadId, value: 0, currency: 'USD',
      page_location: adsPage.href, page_referrer: pageReferrer
    });
    sentLeads.add(leadId);
    return true;
  };
  document.addEventListener('click', (event) => {
    const a = event.target.closest?.('a[href]');
    if (!a) return;
    let u; try { u = new URL(a.href); } catch { return; }
    if (u.hostname === 'wa.me') window.fpAnalytics('whatsapp_click');
    if (['calendar.app.google', 'calendly.com', 'cal.com'].includes(u.hostname)) window.fpAnalytics('booking_click');
    if (a.hasAttribute('data-lead-cta') && u.origin === location.origin && u.pathname === location.pathname && u.hash === '#start') window.fpAnalytics('lead_cta_click', { cta_location: a.dataset.leadCta });
  });
  const panel = document.createElement('section');
  const preferenceLabel = he ? 'העדפות מדידה' : hasAds ? 'Measurement preferences' : 'Analytics preferences';
  panel.setAttribute('aria-label', preferenceLabel);
  panel.dir = he ? 'rtl' : 'ltr';
  panel.className = 'fp-consent';
  const text = document.createElement('p');
  text.textContent = hasAds
    ? 'Allow Google Analytics and Google Ads measurement cookies to help us improve this website and measure inquiries from ads? We share ad-click identifiers and a submission ID, never your form answers. No personalized advertising.'
    : he ? 'לאפשר מדידה ב־Google Analytics כדי לעזור לנו לשפר את האתר? ללא פרסום מותאם אישית.' : 'Allow Google Analytics to help us improve this website? No personalized advertising.';
  panel.append(text);
  const settings = document.createElement('button');
  settings.className = 'fp-consent-settings';
  settings.type = 'button';
  settings.textContent = preferenceLabel;
  settings.onclick = () => { panel.hidden = false; settings.hidden = true; };
  function choose(value) {
    try { localStorage.setItem(key, value); if (hasAds) localStorage.setItem(adsKey, value); } catch { /* choice still applies to this page */ }
    if (value === 'granted') { enable(); enableAds(); } else { disable(); }
    panel.hidden = true; settings.hidden = false;
  }
  for (const [value, label] of [['granted', he ? 'לאפשר' : 'Allow'], ['denied', he ? 'לא תודה' : 'No thanks']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = () => choose(value); panel.append(button);
  }
  const style = document.createElement('style');
  style.textContent = '.fp-consent{position:fixed;bottom:16px;inset-inline:16px;margin:auto;max-width:440px;padding:18px;background:#16181c;color:#e7e9ea;border:1px solid #536471;border-radius:16px;z-index:10000;font:14px/1.5 system-ui;box-shadow:0 6px 32px #0008}.fp-consent p{margin:0 0 12px}.fp-consent button,.fp-consent-settings{font:inherit;cursor:pointer;border:1px solid #536471;border-radius:8px;padding:8px 14px;background:#16181c;color:#fff}.fp-consent button{margin-inline-end:10px}.fp-consent button:focus-visible,.fp-consent-settings:focus-visible{outline:2px solid #1d9bf0;outline-offset:3px}.fp-consent-settings{position:fixed;bottom:8px;inset-inline-start:8px;z-index:9999;font:11px system-ui;opacity:.85}.fp-consent[hidden],.fp-consent-settings[hidden]{display:none}';
  document.head.append(style); document.body.append(panel, settings);
  const value = saved(key), adsValue = hasAds ? saved(adsKey) : 'denied';
  const needsChoice = value === null || (hasAds && adsValue === null);
  panel.hidden = !needsChoice; settings.hidden = needsChoice;
  if (value === 'granted') enable();
  if (value === 'granted' && adsValue === 'granted') enableAds();
})();
