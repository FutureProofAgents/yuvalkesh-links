import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../public/scripts/analytics.js', import.meta.url), 'utf8');
const destination = 'AW-17412494065/6TS5CJul05UdEPGl9u5A';
const lead = '853c557b-0967-418c-9d0e-29b7954b8201';
function page({ads = true, stored = {}, blockedStorage = false, hostname = 'futureproofagents.com', noindex = false, project = '', measure = '', selectedTier, formElements = false, pathname = '/ai-for-accounting-firms/'} = {}) {
  const makeElement = (tag) => ({tag, children: [], dataset: {}, setAttribute() {}, append(...children) {this.children.push(...children);}});
  const listeners = {};
  const document = {head: makeElement('head'), body: makeElement('body'), documentElement: {lang: 'en'},
    currentScript: {dataset: ads ? {googleAdsConversion: destination} : {}}, cookie: '',
    referrer: 'https://example.com/private?email=secret@example.com',
    querySelector: selector => {
      if (selector === '#lead-form' && formElements) return {elements: {namedItem: name => name === 'selected_tier' ? {value: selectedTier} : null}};
      if (selector === '#lead-form [name="selected_tier"]' && selectedTier !== undefined) return {value: selectedTier};
      return noindex ? {} : null;
    }, createElement: makeElement, addEventListener(name, callback) {listeners[name] = callback;}};
  document.body.dataset.project = project;
  document.body.dataset.fpMeasure = measure;
  const localStorage = {getItem(k) {if (blockedStorage) throw Error('blocked'); return stored[k] ?? null;}, setItem(k, v) {if (blockedStorage) throw Error('blocked'); stored[k] = v;}};
  const window = {};
  vm.runInNewContext(source, {window, document, localStorage, location: {hostname, origin: `https://${hostname}`, pathname, search: '?gclid=click-123&email=secret@example.com'}, URL, URLSearchParams});
  const commands = () => (window.dataLayer || []).map(x => Array.from(x));
  const conversions = () => commands().filter(x => x[0] === 'event' && x[1] === 'conversion');
  const choose = (label) => document.body.children[0].children.find(x => x.tag === 'button' && x.textContent === label).onclick();
  return {window, document, stored, commands, conversions, choose, listeners};
}

test('Ads requires fresh measurement consent; legacy analytics consent is not ad consent', () => {
  const p = page({stored: {'fp-analytics-consent-v1': 'granted'}});
  assert.equal(p.document.body.children[0].hidden, false);
  assert.equal(p.window.fpGoogleAdsLead(lead), false);
  assert.equal(p.commands().some(x => x[0] === 'config' && x[1].startsWith('AW-')), false);
  assert.equal(p.conversions().length, 0);
});

test('a consenting saved lead emits one conversion, with no contact data or invented value', () => {
  const p = page();
  assert.equal(p.document.head.children.some(x => x.tag === 'script'), false);
  p.choose('Allow');
  assert.equal(p.conversions().length, 0);
  assert.equal(p.window.fpGoogleAdsLead(''), false);
  assert.equal(p.window.fpGoogleAdsLead('someone@example.com'), false);
  assert.equal(p.window.fpGoogleAdsLead(lead), true);
  assert.equal(p.window.fpGoogleAdsLead(lead), false);
  assert.equal(p.conversions().length, 1);
  const event = p.conversions()[0][2];
  assert.equal(event.send_to, destination);
  assert.equal(event.transaction_id, lead);
  assert.equal(event.value, 0);
  assert.equal(event.page_location, 'https://futureproofagents.com/ai-for-accounting-firms/?gclid=click-123');
  assert.equal(event.page_referrer, 'https://example.com');
  assert.equal(JSON.stringify(p.commands()).includes('secret@example.com'), false);
  p.window.fpAnalytics('generate_lead');
  assert.equal(p.commands().find(x => x[1] === 'generate_lead')[2].send_to, 'G-MSW885P1MB');
});

test('decline and revocation stop conversion events, including after reload', () => {
  const p = page();
  p.choose('No thanks');
  assert.equal(p.window.fpGoogleAdsLead(lead), false);
  p.choose('Allow');
  p.choose('No thanks');
  assert.equal(p.window.fpGoogleAdsLead(lead), false);
  const reloaded = page({stored: p.stored});
  assert.equal(reloaded.window.fpGoogleAdsLead(lead), false);
  assert.equal(reloaded.document.head.children.some(x => x.tag === 'script'), false);
});

test('saved opt-in restores measurement without producing a conversion on page load', () => {
  const p = page({stored: {'fp-analytics-consent-v1': 'granted', 'fp-ads-measurement-consent-v1': 'granted'}});
  assert.equal(p.document.body.children[0].hidden, true);
  assert.equal(p.conversions().length, 0);
  assert.equal(p.window.fpGoogleAdsLead(lead), true);
});

test('other pages and non-production/private pages cannot emit this Ads conversion', () => {
  const p = page({ads: false});
  p.choose('Allow');
  assert.equal(p.window.fpGoogleAdsLead(lead), false);
  assert.equal(p.commands().some(x => x[0] === 'config' && x[1].startsWith('AW-')), false);
  assert.equal(page({hostname: 'localhost'}).window.fpAnalytics, undefined);
  assert.equal(page({noindex: true}).window.fpAnalytics, undefined);
});

test('measurement choice still works when browser storage is blocked', () => {
  const p = page({blockedStorage: true});
  p.choose('Allow');
  assert.equal(p.window.fpGoogleAdsLead(lead), true);
  p.choose('No thanks');
  assert.equal(p.window.fpGoogleAdsLead('953c557b-0967-418c-9d0e-29b7954b8201'), false);
});

test('project CTA clicks respect consent and include only approved page context', () => {
  const p = page({ads: false, project: 'construction-document-workflows'});
  const anchor = {href: 'https://futureproofagents.com/ai-for-accounting-firms/#start', dataset: {leadCta: 'hero'}, hasAttribute: name => name === 'data-lead-cta'};
  const click = () => p.listeners.click({target: {closest: () => anchor}});
  click();
  assert.equal(p.commands().some(x => x[1] === 'lead_cta_click'), false);
  p.choose('Allow');
  click();
  const event = p.commands().find(x => x[1] === 'lead_cta_click')[2];
  assert.equal(event.project_slug, 'construction-document-workflows');
  assert.equal(event.icp, 'construction');
  assert.equal(event.cta_location, 'hero');
  p.window.fpAnalytics('generate_lead', {email: 'private@example.com', utm_content: 'private-prospect-reference', cta_location: 'unapproved-value'});
  assert.equal(JSON.stringify(p.commands()).includes('private@example.com'), false);
  assert.equal(JSON.stringify(p.commands()).includes('private-prospect-reference'), false);
  assert.equal(JSON.stringify(p.commands()).includes('unapproved-value'), false);
  p.choose('No thanks');
  const before = p.commands().filter(x => x[1] === 'lead_cta_click').length;
  click();
  assert.equal(p.commands().filter(x => x[1] === 'lead_cta_click').length, before);
});


test('sector pages retain the correct ICP without contact data in analytics', () => {
  for (const [slug, icp] of [['immigration-case-operations', 'immigration_law'], ['personal-injury-care-coordination', 'pi_care_coordination'], ['distributor-order-intake', 'distribution'], ['maintenance-renewals-repair-quotes', 'maintenance_services'], ['fund-investor-relations', 'fund_ir']]) {
    const p = page({ads: false, project: slug});
    p.choose('Allow');
    p.window.fpAnalytics('lead_form_start', {email: 'private@example.com', challenge: 'Private case details'});
    const event = p.commands().find(x => x[1] === 'lead_form_start')[2];
    assert.equal(event.project_slug, slug);
    assert.equal(event.icp, icp);
    assert.equal(JSON.stringify(p.commands()).includes('private@example.com'), false);
    assert.equal(JSON.stringify(p.commands()).includes('Private case details'), false);
    assert.equal(p.conversions().length, 0);
  }
});

test('noindex pricing opt-in still requires consent and respects revocation', () => {
  assert.equal(page({noindex: true}).window.fpAnalytics, undefined);
  assert.equal(page({noindex: true, measure: 'other'}).window.fpAnalytics, undefined);
  const p = page({noindex: true, measure: 'pricing-test', ads: false, pathname: '/hire/'});
  assert.equal(typeof p.window.fpAnalytics, 'function');
  assert.equal(p.commands()[0][2].analytics_storage, 'denied');
  p.window.fpAnalytics('pricing_tier_click', {tier: 'checkup'});
  assert.equal(p.commands().filter(x => x[0] === 'event').length, 0);
  assert.equal(p.document.head.children.some(x => x.tag === 'script'), false);
  p.choose('Allow');
  p.window.fpAnalytics('pricing_tier_click', {tier: 'checkup'});
  assert.equal(p.commands().filter(x => x[0] === 'event').length, 1);
  p.choose('No thanks');
  p.window.fpAnalytics('generate_lead');
  assert.equal(p.commands().filter(x => x[0] === 'event').length, 1);
});

test('pricing card clicks send both approved events only with consent', () => {
  for (const tier of ['checkup', 'first_agent', 'retainer']) {
    const p = page({ads: false, noindex: true, measure: 'pricing-test', pathname: '/hire/'});
    const anchor = {href: 'https://futureproofagents.com/hire/#start', dataset: {leadCta: 'pricing', tier}, hasAttribute: name => name === 'data-lead-cta'};
    const click = () => p.listeners.click({target: {closest: () => anchor}});
    click();
    assert.equal(p.commands().filter(x => x[0] === 'event').length, 0);
    p.choose('Allow');
    click();
    const events = p.commands().filter(x => x[0] === 'event');
    assert.deepEqual(Array.from(events, x => x[1]), ['lead_cta_click', 'pricing_tier_click']);
    assert.equal(events[0][2].cta_location, 'pricing');
    for (const event of events) assert.equal(event[2].tier, tier);
    p.choose('No thanks');
    click();
    assert.equal(p.commands().filter(x => x[0] === 'event').length, 2);
  }
});

test('invalid tiers never enter analytics or create pricing click events', () => {
  for (const tier of ['enterprise', '<script>', '__proto__', 'constructor', ['checkup'], undefined]) {
    const p = page({ads: false, measure: 'pricing-test', selectedTier: tier});
    p.choose('Allow');
    p.window.fpAnalytics('generate_lead', {tier});
    const anchor = {href: 'https://futureproofagents.com/ai-for-accounting-firms/#start', dataset: {leadCta: 'closing', tier}, hasAttribute: () => true};
    p.listeners.click({target: {closest: () => anchor}});
    const events = p.commands().filter(x => x[0] === 'event');
    assert.deepEqual(Array.from(events, x => x[1]), ['generate_lead', 'lead_cta_click']);
    assert.equal(events[1][2].cta_location, 'closing');
    for (const event of events) assert.equal(Object.hasOwn(event[2], 'tier'), false);
  }
});

test('hire form events read selected tier through either DOM interface and discard private metadata', () => {
  for (const formElements of [false, true]) for (const tier of ['checkup', 'first_agent', 'retainer']) {
    const p = page({ads: false, noindex: true, measure: 'pricing-test', selectedTier: tier, formElements, pathname: '/he/hire/'});
    const names = ['lead_form_start', 'lead_form_step', 'lead_form_error', 'generate_lead'];
    for (const name of names) p.window.fpAnalytics(name);
    assert.equal(p.commands().filter(x => x[0] === 'event').length, 0);
    p.choose('Allow');
    for (const name of names) p.window.fpAnalytics(name, {tier: 'enterprise', email: 'private@example.com', full_name: 'Example Person', challenge: 'Private workflow', url: 'https://example.com/private'});
    const events = p.commands().filter(x => x[0] === 'event');
    assert.equal(events.length, 4);
    for (const event of events) {
      assert.equal(event[2].tier, tier);
      assert.equal(event[2].page_path, '/he/hire/');
      assert.deepEqual(Object.keys(event[2]).sort(), ['language', 'page_path', 'send_to', 'tier', 'transport_type']);
    }
    p.window.fpAnalytics('generate_lead', {tier: 'checkup'});
    assert.equal(p.commands().at(-1)[2].tier, 'checkup');
  }
  const ordinary = page({ads: false, selectedTier: 'checkup'});
  ordinary.choose('Allow');
  ordinary.window.fpAnalytics('generate_lead');
  assert.equal(ordinary.commands().at(-1)[2].tier, undefined);
});

test('pricing click tracking stays scoped to same-page start CTAs', () => {
  const p = page({ads: false});
  p.choose('Allow');
  for (const [href, cta] of [['https://example.com/#start', true], ['https://futureproofagents.com/hire/#start', true], ['https://futureproofagents.com/ai-for-accounting-firms/#other', true], ['https://futureproofagents.com/ai-for-accounting-firms/#start', false]]) {
    p.listeners.click({target: {closest: () => ({href, dataset: {tier: 'checkup'}, hasAttribute: () => cta})}});
  }
  assert.equal(p.commands().filter(x => x[0] === 'event').length, 0);
});
