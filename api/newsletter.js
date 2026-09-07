const COMPOSIO_BASE_URL = process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev';
const COMPOSIO_USER_API_KEY = process.env.COMPOSIO_USER_API_KEY;
const COMPOSIO_ORG_ID = process.env.COMPOSIO_ORG_ID;
const COMPOSIO_PROJECT_ID = process.env.COMPOSIO_PROJECT_ID;
const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID;

const AIRTABLE_BASE_ID = 'appSZz4NuPjcVEvQ1';
const AIRTABLE_TABLE_ID = 'tblW8r4jXEMTm5LBD';
// Native ActiveCampaign form 20 targets dedicated newsletter list 44 with double opt-in.
// Never subscribe contacts directly: the provider activates them only after email confirmation.
const OPTIN_FORM_URL = 'https://uxwritinghub.activehosted.com/proc.php?jsonp=true';
const OPTIN_FORM_ID = '20';

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
        'x-framework': 'futureproof-newsletter',
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

async function saveAirtableSubscriber({ email, language, source, signedUpAt, page, userAgent }) {
  const escapedEmail = email.replace(/'/g, "''");
  const existing = await executeTool('AIRTABLE_LIST_RECORDS', {
    baseId: AIRTABLE_BASE_ID,
    tableIdOrName: AIRTABLE_TABLE_ID,
    fields: ['Email'],
    filterByFormula: `LOWER({Email})='${escapedEmail}'`,
    maxRecords: 1,
    pageSize: 1,
  });

  const fields = {
    Email: email,
    Language: language,
    Source: source,
    'Signed Up At': signedUpAt,
    Page: page,
    'User Agent': userAgent,
  };
  const record = getFirstRecord(existing);

  if (record?.id) {
    return executeTool('AIRTABLE_UPDATE_RECORD', {
      baseId: AIRTABLE_BASE_ID,
      tableIdOrName: AIRTABLE_TABLE_ID,
      recordId: record.id,
      fields,
    });
  }

  return executeTool('AIRTABLE_CREATE_RECORDS', {
    baseId: AIRTABLE_BASE_ID,
    tableIdOrName: AIRTABLE_TABLE_ID,
    records: [{ fields }],
  });
}

async function requestConfirmation(email) {
  const form = new FormData();
  for (const [key, value] of Object.entries({u: OPTIN_FORM_ID, f: OPTIN_FORM_ID, s: '', c: '0', m: '0', act: 'sub', v: '2', email})) form.set(key, value);
  const response = await fetch(OPTIN_FORM_URL, {
    method: 'POST', headers: { Accept: 'application/json' }, body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => null);
  // Parse the native form's success marker; never evaluate provider JavaScript.
  if (!response.ok || typeof result?.js !== 'string' || !/_show_thank_you\(\s*['"]20['"]/.test(result.js) || result.js.includes('_show_error(')) {
    throw new Error('Confirmation request was not accepted');
  }
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

  // Honeypot: bots commonly fill every visible and hidden field.
  if (clean(body.company, 100)) return send(response, 200, { ok: true });

  if (body.consent !== true) return send(response, 400, { ok: false, error: 'Newsletter consent is required' });

  const email = clean(body.email, 180).toLowerCase();
  const lang = body.lang === 'he' ? 'he' : 'en';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return send(response, 400, { ok: false, error: 'Valid email is required' });
  }

  const payload = {
    email,
    language: lang === 'he' ? 'Hebrew' : 'English',
    source: 'futureproof-newsletter-pending',
    signedUpAt: new Date().toISOString(),
    page: clean(body.page, 300) || `https://futureproofagents.com/${lang === 'he' ? 'he/' : ''}newsletter/`,
    userAgent: clean(request.headers['user-agent'], 500),
  };

  try {
    await requestConfirmation(payload.email);
    // ActiveCampaign is the subscription source of truth. Airtable is only an inquiry log.
    if (COMPOSIO_USER_API_KEY && COMPOSIO_ORG_ID && COMPOSIO_PROJECT_ID && COMPOSIO_USER_ID) {
      try { await saveAirtableSubscriber(payload); }
      catch { console.error('[newsletter] pending lead mirror failed; provider accepted confirmation request'); }
    }
    return send(response, 202, { ok: true, status: 'pending_confirmation' });
  } catch (error) {
    console.error('[newsletter] signup failed:', error?.message || 'unknown error');
    return send(response, 502, { ok: false, error: 'Could not complete signup' });
  }
}
