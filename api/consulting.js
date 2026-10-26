import {rpc} from '../lib/campaign-leads.js';
import {syncConsulting} from '../lib/consulting-sync.js';

const ALLOWED_ORIGINS = new Set([
  'https://futureproofagents.com',
  'https://www.futureproofagents.com',
  'https://yuvalkesh-links.vercel.app',
  'https://yuvkesh.onrender.com',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname)) ||
      (protocol === 'https:' && hostname.endsWith('.vercel.app'))
    );
  } catch {
    return false;
  }
}

function setCors(request, response) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Max-Age', '86400');
}

function send(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.status(status).send(JSON.stringify(body));
}

function clean(value, max = 300) {
  return String(value || '')
    .replace(/[<>\u0000-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

const REVENUE_LABELS = {
  up_to_1m: 'עד 1 מיליון ₪',
  '1_5m': '1-5 מיליון ₪',
  '5_20m': '5-20 מיליון ₪',
  '20_100m': '20-100 מיליון ₪',
  over_100m: 'מעל 100 מיליון ₪',
};
const EMPLOYEE_OPTIONS = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

export default async function handler(request, response) {
  setCors(request, response);

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return send(response, 405, { ok: false, error: 'Method not allowed' });
  }
  if (!isAllowedOrigin(request.headers.origin)) {
    return send(response, 403, { ok: false, error: 'Origin not allowed' });
  }

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    return send(response, 400, { ok: false, error: 'Invalid JSON body' });
  }

  // Honeypot: pretend success for bots.
  if (clean(body.company, 100)) return send(response, 200, { ok: true });

  const partial = body.partial === true;
  const email = clean(body.email, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return send(response, 400, { ok: false, error: 'Valid email is required' });
  }
  const lang = body.lang === 'he' ? 'he' : 'en';
  const fullName = clean(body.fullName, 120);
  const phone = clean(body.phone, 30);
  const jobTitle = clean(body.jobTitle, 120);
  const organization = clean(body.organization, 160);
  const aboutBusiness = clean(body.aboutBusiness, 2000);
  const mainChallenge = clean(body.mainChallenge, 2000);
  const currentAiUsage = clean(body.currentAiUsage, 2000);
  const phoneOk = /^[+\d][\d\s()\-.]{6,29}$/.test(phone);
  const annualRevenue = REVENUE_LABELS[body.annualRevenue] || '';
  const employees = EMPLOYEE_OPTIONS.includes(body.employees) ? body.employees : '';

  if (!partial) {
    if (body.consent !== true) return send(response, 400, { ok: false, error: 'Consent is required' });
    if (fullName.length < 2 || jobTitle.length < 2 || organization.length < 2) {
      return send(response, 400, { ok: false, error: 'Name, role and organization are required' });
    }
    if (!phoneOk) return send(response, 400, { ok: false, error: 'Valid phone / WhatsApp number is required' });
    if (aboutBusiness.length < 5) return send(response, 400, { ok: false, error: 'Business description is required' });
    if (!annualRevenue) return send(response, 400, { ok: false, error: 'Annual revenue is required' });
    if (!employees) return send(response, 400, { ok: false, error: 'Number of employees is required' });
    if (mainChallenge.length < 5) return send(response, 400, { ok: false, error: 'Main challenge is required' });
  }

  const payload = {
    email, fullName, phone: phoneOk ? phone : '', jobTitle, organization, aboutBusiness, annualRevenue,
    employees, mainChallenge, currentAiUsage,
    preferredLanguage: body.preferredLanguage === 'en' ? 'English' : body.preferredLanguage === 'he' ? 'Hebrew' : (partial ? '' : (lang === 'he' ? 'Hebrew' : 'English')),
    lastStep: clean(body.lastStep, 60),
    sessionId: clean(body.sessionId, 80),
    signedUpAt: new Date().toISOString(),
    page: clean(body.page, 300) || `https://futureproofagents.com/${lang === 'he' ? 'he/' : ''}consulting/`,
    userAgent: clean(request.headers['user-agent'], 500),
  };

  try {
    const saved = await rpc('fp_consulting_ingest', {payload, is_complete: !partial});
    // Only the durable database write decides whether we acknowledge receipt.
    // Airtable failures remain queued for the scheduled worker.
    if (!partial) {
      try { await syncConsulting(saved.id); } catch { console.error('[consulting] mirror pending'); }
    }
    return send(response, 202, { ok: true, id: saved.id, status: saved.completed ? 'new' : 'partial' });
  } catch (error) {
    console.error('[consulting] request failed:', error?.message || 'unknown error');
    return send(response, 502, { ok: false, error: 'Could not complete request' });
  }
}
