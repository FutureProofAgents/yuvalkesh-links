import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../public/scripts/analytics.js', import.meta.url), 'utf8');
const destination = 'AW-17412494065/6TS5CJul05UdEPGl9u5A';
const lead = '853c557b-0967-418c-9d0e-29b7954b8201';
function page({ads = true, stored = {}, blockedStorage = false, hostname = 'futureproofagents.com', noindex = false} = {}) {
  const makeElement = (tag) => ({tag, children: [], dataset: {}, setAttribute() {}, append(...children) {this.children.push(...children);}});
  const document = {head: makeElement('head'), body: makeElement('body'), documentElement: {lang: 'en'},
    currentScript: {dataset: ads ? {googleAdsConversion: destination} : {}}, cookie: '',
    referrer: 'https://example.com/private?email=secret@example.com',
    querySelector: () => noindex ? {} : null, createElement: makeElement, addEventListener() {}};
  const localStorage = {getItem(k) {if (blockedStorage) throw Error('blocked'); return stored[k] ?? null;}, setItem(k, v) {if (blockedStorage) throw Error('blocked'); stored[k] = v;}};
  const window = {};
  vm.runInNewContext(source, {window, document, localStorage, location: {hostname, origin: `https://${hostname}`, pathname: '/ai-for-accounting-firms/', search: '?gclid=click-123&email=secret@example.com'}, URL, URLSearchParams});
  const commands = () => (window.dataLayer || []).map(x => Array.from(x));
  const conversions = () => commands().filter(x => x[0] === 'event' && x[1] === 'conversion');
  const choose = (label) => document.body.children[0].children.find(x => x.tag === 'button' && x.textContent === label).onclick();
  return {window, document, stored, commands, conversions, choose};
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
