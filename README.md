# RoundsAI

Resident-first rounding app with Today, Census, Scribe, Rounds and Learn navigation. Fictional-data testing only. The UI keeps the developer-demo structure with Superpower-inspired visual refinement.

## Deploy to Vercel

Import this repository. Framework: Other; output directory: public; no build command. Serverless endpoints live in api/. Use these environment variables:

- OPENAI_API_KEY — secret, server only.
- OPENAI_MODEL — optional; defaults to gpt-4.1-mini.
- SUPABASE_URL — your Supabase project URL.
- SUPABASE_ANON_KEY — project publishable/anon key, never a service-role key.
- ROUNDSAI_ALLOWED_EMAILS — comma-separated test account emails (recommended).

Create a test account in Supabase Auth, configure the variables in Vercel, and redeploy. Sign in when chart generation requests it. Do not commit credentials.

## Test flow

Census → + → Camera / Dictate / Type → Generate patient chart → compare source and AI draft → edit → confirm → save patient. Photo inputs are resized before transmission. Browser dictation support varies; keyboard dictation and Type are available. AI returns a structured draft; unreadable input, mixed patients, provider failures and missing configuration produce explicit errors. Nothing is added to the census until clinician confirmation.

## Working and pending

Working implementation: server-side text/image extraction, editable chart review, source text retention, manual plans and ICD toggle, note assembly, tasks, handoff and presentation assembly. Supabase verifies generation access; patient data currently saves in the browser, not a shared Supabase table. Original images are shown during review but are not retained after saving. Chart-extraction credentials and live provider calls still need deployment configuration before end-to-end verification.

Not connected: evidence retrieval, quiz generation, guideline feed, voice-audio server transcription, EHR integration and shared patient storage. Notes currently assemble reviewed content rather than making a separate AI rewrite request.

Use fictional cases only. This is not approved for real-patient deployment.

## Checks

node --test tests/api.test.mjs tests/notes.test.cjs

The provider tests use deterministic mocked responses; passing them is not a live model evaluation. Perform a live fictional photo and text test after configuration.

## Clinical assistant and learning

- Patient heads-up: up to three source-linked reassessment questions using the chart and three prior note versions; reminders never become note findings automatically.
- Presentations: quick (2–4 sentences) or detailed (structured 1–2 minutes), editable with manual copy and stale-chart indications.
- Evidence: active-problem PubMed ESearch/EFetch, verified PMID/journal/date/DOI metadata, optional AI appraisal that can support, qualify or provide background rather than forcing support. No OpenEvidence API connection.
- Learning: source-grounded draft MCQs, reviewer editing/approval/rejection, approved-only quizzes, graded explanations, per-user review timing and audit records.

The learning schema is in supabase/migrations/20261115053332_roundsai_learning_review.sql. Reviewer membership is assigned explicitly; no account becomes an admin automatically. Database policies restrict draft visibility, reviewer mutations and private practice history. No new environment keys are required beyond the existing OpenAI and Supabase settings. NCBI_API_KEY is optional for higher-volume literature requests.

Clinical and learning AI output still requires clinician review. No EHR write-back, automated orders, or clinical urgency ranking is implemented. Patient chart storage remains browser-local; learning content and attempts are stored in Supabase.


## Account-based beta census

Email/password signup and confirmation are handled by Supabase Auth. Configure the Auth Site URL as `https://roundsai-five.vercel.app` and a production SMTP provider for external beta confirmation emails (Supabase default email delivery can be restricted). Confirmed accounts can use the app; reviewer permissions are still explicit.

`roundsai_workspaces` stores one versioned census per account under owner-only RLS. Active and discharged charts are preserved together. Autosave uses compare-and-swap revisions; concurrent edits cannot silently overwrite another device. The Account screen provides retry, draft export and conflict recovery. Local drafts are keyed by account; unassigned legacy browser records require explicit selection before import. Existing legacy browser data is never automatically attributed to a signed-in user.

Use fictional cases for this beta. This release does not establish HIPAA compliance. One fictional Alex Morgan example is initialized only for a new account; removing/discharging all patients does not reseed the census.

## Connected owner admin
The private admin site now connects through a custom-authenticated Supabase Edge Function. Only a server-held high-entropy bridge key and the configured owner identity can use it. The source stores its SHA-256 verifier, never the key. Secrets remain in the admin site's runtime configuration. The bridge uses the Edge Function's server-only service-role credential and exposes only defined analytics, settings and question-review actions. Resident users cannot call the admin SQL functions or see others' activity.

Analytics use Eastern calendar days, including both custom dates; the exclusive upper bound is the next local midnight, with DST handled. Question attempts and unique questions are separate. Notes, chart drafts and AI errors track only events since connection; no historical generation counts are inferred. Existing answer history is queried directly without a row cap.

Draft configuration remains in the separate private admin database. Explicit publishing creates an audited, versioned live setting. Main-app defaults remain unchanged until a workflow is published. Publishing never rewrites existing charts. Clinical note generation uses a published template only; otherwise the existing assembler remains in use. Source-grounding constraints remain fixed. Restoring a historical live configuration creates a new release. Question review connects to the existing resident bank and preserves reviewer attribution; an edited item returns to draft.

The owner test endpoint `/api/admin` accepts only the private bridge credential verified against its source-pinned hash, and only health/fictional preview actions. It uses the existing server-side model key. Rotate the bridge secret by updating both hash verifiers and the private admin runtime secret together. Do not put the raw credential in code, tests, URLs or browser state.

## Vercel admin workspace
The owner admin is hosted in the same Vercel project at `/roundsaiadmin`. Its sign-in uses the existing RoundsAI Supabase account and shared session refresh. Every admin request remotely verifies the user, requires the confirmed owner ID and email, and rejects forged Sites headers and other accounts. Admin drafts, versions and audit events use `roundsai_admin_documents` through a narrow owner-authenticated Edge API, with atomic revision checks. No service key is present in Vercel/browser source. Main app appearance and navigation are unchanged.

Before migration, the old Sites D1 table was inspected and contained zero records; no drafts, versions or audit records needed copying. Existing question history and live settings stay in the original Supabase tables. Deployment rollback source: `1b37aad7ad8cb552f3010e0d57442442243d848a` (`baseline/before-vercel-admin-2026-11-16`). The compatible added table can remain when rolling application code back; never roll back patient data.
