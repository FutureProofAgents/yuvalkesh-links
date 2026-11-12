import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { hireContent, HIRE_TIER_IDS, WHATSAPP_NUMBER, whatsappLink } from '../src/data/hire-content.mjs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/components/HirePage.astro');
const data = read('../src/data/hire-content.mjs');
const source = page + data;
const internal = new Set(['/he/workshops/','/workshops/','/he/consulting/','/consulting/','/he/terms/','/terms/','#pricing','#start','/hire/','/he/hire/','/favicon.svg','/favicon-96.png','/apple-touch-icon.png','/scripts/analytics.js','/logos/ginger.svg','/logos/jvp.png','/logos/diviners.png']);

test('localized tiers, exact approved prices and VAT', () => {
  assert.deepEqual(Object.keys(hireContent), ['he','en']);
  assert.deepEqual(HIRE_TIER_IDS, ['checkup','first_agent','retainer']);
  const expected = { he: [['4,900 ₪'],['24,900 ₪','8,900 ₪'],['18,900 ₪']], en: [['$1,400'],['$6,900','$2,500'],['$5,500']] };
  for (const lang of ['he','en']) {
    const c = hireContent[lang];
    assert.deepEqual(c.tiers.map(t => t.id), HIRE_TIER_IDS);
    assert.deepEqual(c.tiers.map(t => t.featured), [false,true,false]);
    assert.deepEqual(c.tiers.map(t => t.prices.map(p => p.amount)), expected[lang]);
    for (const tier of c.tiers) {
      assert.match(tier.vat, lang === 'he' ? /\+ מע״מ/ : /\+ VAT/);
      for (const key of ['name','billing','summary','note','cta']) assert.ok(tier[key]);
      assert.ok(tier.includes.length);
    }
    assert.equal(c.how.steps.length, 4);
    assert.equal(c.chips.length, 4);
    assert.equal(c.cases.length, 3);
    assert.equal(c.faq.length, 8);
    assert.deepEqual(c.form.teamSizes, ['1-10','11-50','51-200','201-1000','1000+']);
    assert.match(c.pricing.starting, lang === 'he' ? /מחירים התחלתיים/ : /starting prices/i);
    assert.equal(c.tiers[1].prices[0].suffix, lang === 'he' ? 'הקמה' : 'setup');
    assert.match(c.tiers[1].prices[1].suffix, lang === 'he' ? /לחודש/ : /per month/);
    assert.match(c.tiers[2].prices[0].suffix, lang === 'he' ? /לחודש/ : /per month/);
  }
  assert.ok(!JSON.stringify(hireContent.he).includes('$'));
  assert.ok(!JSON.stringify(hireContent.en.tiers.map(t => t.prices)).includes('₪'));
});

test('whole-source numeric and link allowlists', () => {
  const prices = new Set(['4,900','24,900','8,900','18,900','1,400','6,900','2,500','5,500']);
  for (const number of source.match(/\d{1,3}(?:,\d{3})+/g) ?? []) assert.ok(prices.has(number), number);
  // Explicit layout widths, form length/team-size bounds, and the required theme/panel/button color literals.
  const longNumbers = new Set([WHATSAPP_NUMBER,'1116','1080','1000','000000','101214','001522','16181','3336','7781']);
  for (const number of source.match(/(?<![\d,])\d{4,}(?![\d,])/g) ?? []) assert.ok(longNumbers.has(number), number);
  for (const match of source.matchAll(/(?:href|src)\s*=\s*['"](\/[^'"\s]*)['"]/g)) assert.ok(internal.has(match[1]), match[1]);
  // Includes literal paths inside conditional hrefs, not merely the first branch.
  for (const match of page.matchAll(/href=\{([^}]+)\}/g)) {
    for (const path of match[1].matchAll(/['"](\/[^'"]+)['"]/g)) assert.ok(internal.has(path[1]), path[1]);
  }
  assert.doesNotMatch(source, /agentalent|money-back|100%|Subscribe|stripe|checkout/i);
  assert.doesNotMatch(page, /fetch\s*\(|XMLHttpRequest|gtag\s*\(|application\/ld\+json/);
});

test('head, shared components, measurement and section order', () => {
  for (const fragment of ['<html lang={lang} dir={he ?', 'name="robots" content="noindex, nofollow"', 'data-fp-measure="pricing-test"', 'rel="canonical" href={canonical}', 'hreflang="en" href={`${site}/hire/`}', 'hreflang="he" href={`${site}/he/hire/`}', 'hreflang="x-default" href={`${site}/he/hire/`}', String.raw`const site = Astro.site!.href.replace(/\/$/, '');`, '<LocalFonts hebrew=', '<SiteFooter lang={lang} showNewsletterInvite={false}', '<script is:inline defer src="/scripts/analytics.js"></script>', 'data-lead-cta="pricing" data-tier={tier.id}', 'href="#start" data-lead-cta="hero"', '<script src="../scripts/campaign-form.ts"></script>']) assert.ok(page.includes(fragment), fragment);
  const header = page.match(/<SiteHeader\b[^>]*\/>/)[0];
  assert.doesNotMatch(header, /\bactive\s*=/);
  assert.ok(header.includes("alternatePath={he ? '/hire/' : '/he/hire/'}"));
  const positions = ['<SiteHeader','class="hero"','class="logos"','{c.how.eyebrow}','id="pricing"','<caption>','{c.casesTitle}','{c.fit.title}','{c.accountability.title}','{c.faqTitle}','id="start"','<SiteFooter'].map(s => page.indexOf(s));
  assert.ok(positions.every((p, i) => p >= 0 && (!i || p > positions[i-1])));
  assert.match(page, /tier\.prices\.map[\s\S]*?class="price"[\s\S]*?class="vat">\{tier.vat\}/);
  assert.match(page, /<bdi dir="ltr">/);
  assert.match(page, /<th scope="col">/);
  assert.match(page, /<th scope="row">/);
  assert.match(page, /class="table-scroll" tabindex="0" role="region" aria-label=/);
  assert.match(page, /<details><summary>/);
  assert.match(page, /<blockquote[\s\S]*?<cite>/);
  assert.match(page, /prefers-reduced-motion:reduce/);
  assert.match(page, /outline:3px solid #61baff/);
});

test('lead form contract, steps and validation', () => {
  const form = page.match(/<form\b[\s\S]*?<\/form>/)[0];
  assert.match(form, /id="lead-form" data-language=\{lang\} novalidate/);
  assert.doesNotMatch(form, /\baction=/);
  const steps = [...form.matchAll(/<fieldset\b([^>]*)>([\s\S]*?)<\/fieldset>/g)];
  assert.equal(steps.length, 2);
  assert.match(steps[0][1], /data-step="0"/);
  assert.match(steps[1][1], /data-step="1" hidden/);
  assert.match(steps[0][2], /<select name="selected_tier" required>/);
  assert.match(steps[0][2], /c\.tiers\.map\(tier => <option value=\{tier.id\}>\{tier.name\}/);
  assert.deepEqual(hireContent.he.tiers.map(t => t.id), ['checkup','first_agent','retainer']);
  assert.match(steps[0][2], /<select name="team_size" required>/);
  assert.match(steps[0][2], /name="challenge" required minlength="10" maxlength="1000"/);
  assert.match(steps[0][2], /name="current_ai_usage" maxlength="400"/);
  for (const fragment of ['name="full_name" required minlength="2" maxlength="120" autocomplete="name"', 'name="email" type="email" required maxlength="180"', 'name="phone" type="tel" required maxlength="30"', 'name="job_title" required minlength="2"', 'name="company" required minlength="2"', 'name="preferred_language"', 'value="he" selected={he}', 'value="en" selected={!he}', 'name="consent" required']) assert.ok(steps[1][2].includes(fragment), fragment);
  assert.doesNotMatch(steps[1][2].match(/<input name="phone"[^>]+>/)[0], /pattern=/);
  for (const [name, value] of [['form_type','hire_pricing_test'],['revenue_band','undisclosed'],['solutions','not_sure'],['linkedin_url','']]) {
    assert.ok(form.includes(`type="hidden" name="${name}" value="${value}"`));
    for (const step of steps) assert.ok(!step[2].includes(`name="${name}"`));
  }
  assert.ok(form.includes('name="revenue_currency" value={he ? \'ILS\' : \'USD\'}'));
  for (const fragment of ['data-back hidden','data-next','type="submit" data-submit class="primary" hidden','data-step-count','id="form-error" role="alert" tabindex="-1"','name="website_check" tabindex="-1" autocomplete="off"']) assert.ok(form.includes(fragment), fragment);
  assert.ok(page.indexOf('id="form-success" tabindex="-1" hidden') > page.indexOf('</form>'));
  assert.ok(!form.includes('id="form-success"'));
  assert.match(page, /data-progress=\{index\}/);
});

test('WhatsApp encoding, localization and unknown values', () => {
  const prefix = `https://wa.me/${WHATSAPP_NUMBER}?text=`;
  for (const lang of ['he','en']) for (const tier of hireContent[lang].tiers) {
    const href = whatsappLink(lang, tier.id);
    assert.ok(href.startsWith(prefix));
    assert.equal(decodeURIComponent(href.slice(prefix.length)), hireContent[lang].whatsappTemplate.replace('[tier]', tier.name));
  }
  assert.ok(decodeURIComponent(whatsappLink('he','first_agent')).includes('הסוכן הראשון'));
  assert.ok(decodeURIComponent(whatsappLink('en','retainer')).includes('Monthly accompaniment'));
  for (const unknown of ['bogus','__proto__','',undefined]) {
    const decoded = decodeURIComponent(whatsappLink('en', unknown).slice(prefix.length));
    assert.equal(decoded, hireContent.en.whatsappGeneric);
    for (const tier of hireContent.en.tiers) assert.ok(!decoded.includes(tier.name));
  }
});

test('inline script selects valid tiers and updates only mapped WhatsApp links', () => {
  const script = page.match(/<script is:inline define:vars=\{\{[^]*?\}\}>([^]*?)<\/script>/)[1];
  const listeners = {};
  const select = { value: '', addEventListener: (event, callback) => { listeners[event] = callback; } };
  const whatsapp = { href: '' };
  const links = ['checkup','first_agent','retainer','bogus','__proto__'].map(tier => ({ dataset: { tier }, addEventListener(event, callback) { this[event] = callback; } }));
  const whatsappLinks = Object.fromEntries(HIRE_TIER_IDS.map(id => [id, whatsappLink('en', id)]));
  const genericWhatsapp = whatsappLink('en','');
  vm.runInNewContext(script, { whatsappLinks, genericWhatsapp, document: { querySelector: () => select, getElementById: () => whatsapp, querySelectorAll: () => links } });
  assert.equal(whatsapp.href, genericWhatsapp);
  for (const link of links.slice(0,3)) {
    link.click();
    assert.equal(select.value, link.dataset.tier);
    assert.equal(whatsapp.href, whatsappLinks[select.value]);
  }
  links[3].click(); links[4].click();
  assert.equal(select.value, 'retainer');
  select.value = 'first_agent'; listeners.change();
  assert.equal(whatsapp.href, whatsappLinks.first_agent);
  select.value = 'bogus'; listeners.change();
  assert.equal(whatsapp.href, genericWhatsapp);
});

test('sitemap Set has exactly original entry count plus the two test routes', () => {
  const config = read('../astro.config.mjs');
  const literal = config.match(/new Set\((\[[\s\S]*?\])\)/)[1];
  const entries = JSON.parse(literal);
  assert.equal(entries.length, 22);
  assert.equal(new Set(entries).size, 22);
  assert.deepEqual(entries.slice(-2), ['/hire/','/he/hire/']);
  assert.match(config, /!legacyHebrewPaths\.has/);
});

test('route wrappers use shared localized component', () => {
  assert.equal(read('../src/pages/hire.astro'), '---\nimport HirePage from \'../components/HirePage.astro\';\n---\n<HirePage lang="en" />\n');
  assert.equal(read('../src/pages/he/hire.astro'), '---\nimport HirePage from \'../../components/HirePage.astro\';\n---\n<HirePage lang="he" />\n');
});
