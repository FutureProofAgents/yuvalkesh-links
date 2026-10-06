# Campaign inquiries

English: https://futureproofagents.com/ai-transformation/
Hebrew: https://futureproofagents.com/he/ai-transformation/
Inbox: https://futureproof-content-studio-swart.vercel.app/crm/campaign-leads

The existing Render static site deploys from `main`. Form requests go to the existing Vercel project at `https://yuvalkesh-links.vercel.app/api/lead`, with an explicit origin allowlist and JSON preflight support. These are separate deployments; publishing only to Vercel does not update the custom domain.

## Data flow

The three-step form captures business, industry, customer market, self-reported annual revenue range and currency, required solutions, name, title and email. Challenge, phone and LinkedIn are optional. The form records inquiry consent separately from optional analytics consent; it does not subscribe a visitor to marketing email.

A server-validated inquiry is committed to `fp_campaign_leads` before the secondary spreadsheet sync is attempted. Submission UUIDs make retries idempotent. Owner-only RLS protects leads and follow-up history. The private Studio inbox edits status, follow-up date and notes with optimistic version checks. It includes filters, campaign summaries, CSV export and a campaign-link builder.

Google Sheets is a mirror, not an editing interface. Each lead owns a stable row. Writes use RAW values to prevent formula execution. Header and row-ID guards stop accidental overwrites after manual sheet rearrangement. Use filter views; keep rows in place. Failed writes remain queued and visible in Studio. Supabase Cron invokes the protected Vercel worker every five minutes, independently of a local computer, in batches of five.

Session attribution stores first and latest qualifying touch. It captures UTM tags, campaign/ad group/ad/account IDs and `oppref` (or `click_id`), plus Google/Facebook click IDs when provided. Query strings unrelated to attribution are discarded. The privacy notice explains storage and the hashed request identifier used for rate limiting. Attribution describes captured links; this release does not import ad spend or report conversions back to OpenAI Ads.

## Deployment

Vercel production environment variables:
- `LEAD_INGEST_SECRET`, `LEAD_SYNC_SECRET`, `LEAD_SUPABASE_ANON_KEY`
- `CAMPAIGN_SHEET_ID`, `CAMPAIGN_COMPOSIO_KEY`
- Existing `COMPOSIO_BASE_URL`, `COMPOSIO_ORG_ID`, `COMPOSIO_PROJECT_ID`, `COMPOSIO_USER_ID`

Secrets stay in Vercel and Supabase Vault; no credentials belong in the browser or repository. Database migrations live in the sibling Content Studio repository: `039_campaign_leads.sql` and `040_campaign_lead_sync.sql`. The trigger token has no permission to read lead data. The Sheets connection uses Yuval's connected Google account, with access granted only to his accounts.

Run `node --test tests/campaign-leads.test.mjs` and `npm run build`. Studio has its own campaign view tests plus the existing regression suite.

## Research supporting the page and campaign setup

- Existing FutureProof services, client logos and case descriptions: https://futureproofagents.com/ and https://futureproofagents.com/workshops/
- Official OpenAI ad URL macros: https://developers.openai.com/ads/campaign-management
- OpenAI conversion reporting is a separate integration: https://developers.openai.com/ads/conversions-api
- Ad crawler requirements: https://developers.openai.com/api/docs/bots
- Form structure: https://www.nngroup.com/articles/web-form-design/
- Enterprise delivery lifecycle: https://www.thoughtworks.com/en-ca/insights/articles/Path-to-production-for-enterprise-AI
- Scheduled cloud retry mechanism: https://supabase.com/docs/guides/functions/schedule-functions

Page positioning follows the existing business: discovery and process mapping, scoped priorities, implementation and integration, evaluation, team adoption, then measurement and iteration. Case descriptions omit unsupported numerical ROI or performance promises. All seven client marks already published on the existing website are represented.
