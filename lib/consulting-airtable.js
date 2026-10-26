// Free 30-minute consulting requests -> Airtable "FutureProof Consulting Requests" via Composio.
// Mirrors api/newsletter.js (same COMPOSIO_* env vars).
const COMPOSIO_BASE_URL = process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev';
const COMPOSIO_USER_API_KEY = process.env.CAMPAIGN_COMPOSIO_KEY || process.env.COMPOSIO_USER_API_KEY;
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

export async function saveRequest(payload, { partial }) {
  const escapedEmail = payload.email.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const existing = await executeTool('AIRTABLE_LIST_RECORDS', {
    baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID,
    filterByFormula: `LOWER({Email})='${escapedEmail}'`, maxRecords: 1, pageSize: 1,
  });
  const record = getFirstRecord(existing);
  const current = record?.fields || {};
  const candidate = {
    Email: payload.email,
    'Full Name': payload.fullName,
    'Phone/WhatsApp': payload.phone,
    'Job Title': payload.jobTitle,
    Organization: payload.organization,
    'About Business': payload.aboutBusiness,
    'Annual Revenue': payload.annualRevenue,
    Employees: payload.employees,
    'Current AI Usage': payload.currentAiUsage,
    'Main Challenge': payload.mainChallenge,
    'Preferred Language': payload.preferredLanguage,
    'Last Step': payload.lastStep,
    'Session ID': payload.sessionId,
    Source: 'futureproof-consulting-30min',
    Page: payload.page,
    'User Agent': payload.userAgent,
  };
  // Never overwrite a filled field with an empty value.
  const fields = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (value !== undefined && value !== null && value !== '') fields[key] = value;
  }
  if (!current['Signed Up At']) fields['Signed Up At'] = payload.signedUpAt;
  const status = current.Status;
  if (partial) {
    // A partial save never downgrades a completed request.
    if (current.Completed) delete fields['Last Step'];
    // Incomplete requests keep Status unset. Completed and Last Step identify
    // partial progress without requiring a new Airtable single-select option.
    // Preserve any existing pipeline status.
  } else {
    fields.Completed = true;
    fields.Consent = true;
    fields['Last Step'] = 'submitted';
    // Keep Yuval's pipeline status (contacted/booked/...) if already set.
    if (!status || status === 'partial') fields.Status = 'new';
  }
  if (record?.id) {
    return executeTool('AIRTABLE_UPDATE_RECORD', { baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID, recordId: record.id, fields, typecast: true });
  }
  return executeTool('AIRTABLE_CREATE_RECORDS', { baseId: AIRTABLE_BASE_ID, tableIdOrName: AIRTABLE_TABLE_ID, records: [{ fields }], typecast: true });
}

