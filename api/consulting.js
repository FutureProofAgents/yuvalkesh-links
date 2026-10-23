// Free 30-minute consulting requests -> Airtable "FutureProof Consulting Requests" via Composio.
// Mirrors api/newsletter.js (same COMPOSIO_* env vars).
const COMPOSIO_BASE_URL = process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev';
const COMPOSIO_USER_API_KEY = process.env.COMPOSIO_USER_API_KEY;
const COMPOSIO_ORG_ID = process.env.COMPOSIO_ORG_ID;
const COMPOSIO_PROJECT_ID = process.env.COMPOSIO_PROJECT_ID;
const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID;

const AIRTABLE_BASE_ID = 'appSZz4NuPjcVEvQ1';
const AIRTABLE_TABLE_ID = 'tblhJ3mgP6h1U0oFO';
// Applications are recorded for Yuval's manual review. No subscription or email
// confirmation is requested here. The approval worker handles verified approvals.
const TOOL_VERSIONS = {
  AIRTABLE_LIST_RECORDS: '20260828_00',
  AIRTABLE_CREATE_RECORDS: '20260828_00',
  AIRTABLE_UPDATE_RECORD: '20260828_00',
};

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

function extractData(result) {
  return result?.data?.data || result?.data || {};
}

async function executeTool(slug, args) {
  const response = await fetch(
    `${COMPOSIO_BASE_URL}/api/v3.1/tools/execute/${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: {
        'x-user-api-key': COMPOSIO_USER_API_KEY,
        'x-org-id': COMPOSIO_ORG_ID,
        'x-project-id': COMPOSIO_PROJECT_ID,
        'x-framework': 'futureproof-consulting',
        'x-source': 'Vercel Function',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: COMPOSIO_USER_ID,
        version: TOOL_VERSIONS[slug],
        arguments: args,
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.successful) {
    const requestId = result?.error?.request_id || result?.log_id || result?.logId || 'unknown';
    throw new Error(`${slug} failed (${response.status}, request ${requestId})`);
  }
  return extractData(result);
}

function getFirstRecord(data) {
  const records = data?.records || data?.data?.records || [];
  return Array.isArray(records) ? records[0] : null;
}

const REVENUE_LABELS = {
  up_to_1m: 'עד 1 מיליון ₪',
  '1_5m': '1-5 מיליון ₪',
  '5_20m': '5-20 מיליון ₪',
  '20_100m': '20-100 מיליון ₪',
  over_100m: 'מעל 100 מיליון ₪',
};
const EMPLOYEE_OPTIONS = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

async function saveRequest(payload) {
  const escapedEmail = payload.email.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const existing = await executeTool('AIRTABLE_LIST_RECORDS', {
    baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID,
    filterByFormula: `LOWER({Email})='${escapedEmail}'`, maxRecords: 1, pageSize: 1,
  });
  const record = getFirstRecord(existing);
  const fields = {
    Email: payload.email,
    'Full Name': payload.fullName,
    'Phone/WhatsApp': payload.phone,
    'Job Title': payload.jobTitle,
    Organization: payload.organization,
    'Annual Revenue': payload.annualRevenue,
    Employees: payload.employees,
    'Current AI Usage': payload.currentAiUsage,
    'Main Challenge': payload.mainChallenge,
    'Preferred Language': payload.preferredLanguage,
    Source: 'futureproof-consulting-30min',
    Page: payload.page,
    'Signed Up At': payload.signedUpAt,
    'User Agent': payload.userAgent,
    Consent: true,
  };
  if (record?.id) {
    // Repeated requests update details but never reset Yuval's pipeline status.
    if (!record?.fields?.Status) fields.Status = 'new';
    return executeTool('AIRTABLE_UPDATE_RECORD', { baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID, recordId: record.id, fields });
  }
  fields.Status = 'new';
  return executeTool('AIRTABLE_CREATE_RECORDS', { baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID, records: [{ fields }] });
}

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

  if (body.consent !== true) return send(response, 400, { ok: false, error: 'Consent is required' });

  const email = clean(body.email, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return send(response, 400, { ok: false, error: 'Valid email is required' });
  }
  const lang = body.lang === 'he' ? 'he' : 'en';
  const fullName = clean(body.fullName, 120);
  const phone = clean(body.phone, 30);
  const jobTitle = clean(body.jobTitle, 120);
  const organization = clean(body.organization, 160);
  const mainChallenge = clean(body.mainChallenge, 2000);
  const currentAiUsage = clean(body.currentAiUsage, 2000);
  if (fullName.length < 2 || jobTitle.length < 2 || organization.length < 2) {
    return send(response, 400, { ok: false, error: 'Name, role and organization are required' });
  }
  if (!/^[+\d][\d\s()\-.]{6,29}$/.test(phone)) {
    return send(response, 400, { ok: false, error: 'Valid phone / WhatsApp number is required' });
  }
  const annualRevenue = REVENUE_LABELS[body.annualRevenue];
  if (!annualRevenue) return send(response, 400, { ok: false, error: 'Annual revenue is required' });
  if (!EMPLOYEE_OPTIONS.includes(body.employees)) {
    return send(response, 400, { ok: false, error: 'Number of employees is required' });
  }
  if (mainChallenge.length < 5) return send(response, 400, { ok: false, error: 'Main challenge is required' });

  const payload = {
    email, fullName, phone, jobTitle, organization, annualRevenue,
    employees: body.employees, mainChallenge, currentAiUsage,
    preferredLanguage: body.preferredLanguage === 'en' ? 'English' : body.preferredLanguage === 'he' ? 'Hebrew' : (lang === 'he' ? 'Hebrew' : 'English'),
    signedUpAt: new Date().toISOString(),
    page: clean(body.page, 300) || `https://futureproofagents.com/${lang === 'he' ? 'he/' : ''}consulting/`,
    userAgent: clean(request.headers['user-agent'], 500),
  };

  try {
    if (!COMPOSIO_USER_API_KEY || !COMPOSIO_ORG_ID || !COMPOSIO_PROJECT_ID || !COMPOSIO_USER_ID) {
      throw new Error('Consulting request service unavailable');
    }
    await saveRequest(payload);
    return send(response, 202, { ok: true, status: 'new' });
  } catch (error) {
    console.error('[consulting] request failed:', error?.message || 'unknown error');
    return send(response, 502, { ok: false, error: 'Could not complete request' });
  }
}
