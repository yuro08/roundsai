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

## Owner-created beta users
Users & activity → Create beta user creates a new confirmed Supabase email/password account with an automatically generated temporary password displayed once. The owner distributes it privately; no confirmation email or SMS is sent. Existing emails are never overwritten. Only the remotely verified owner can provision accounts. New accounts receive `app_metadata.beta_password_change_required`, enforced by the app's server authentication; the client requests a private personal password before loading the workspace. The password endpoint remotely verifies the caller, changes only their own password, preserves app metadata, clears the flag and signs out all refresh sessions before a fresh sign-in. Credentials are never written to workspace/admin history. Public email confirmation remains enabled; SMTP delivery is still needed for general signup and email recovery.

Rollback source before beta provisioning: c9a5ade2cf4a7010f65a8fe54f8b9f311d254cdc. Do not delete created accounts or user data to roll back application code. Validation: provisioning authorization, duplicate refusal, source identity, setup gate, metadata preservation, password strength and cross-origin tests. Real external email delivery remains outside this manual-beta flow.

## Owner note guides and ICD suggestions
H&P and daily progress generation now default to the owner's uploaded guides in `docs/note-guides/`, deduplicating the repeated progress prompt. The same guides are the editable starting profiles in admin; explicitly published profiles override defaults. Existing notes and manual edits are never rewritten automatically. Generated notes use structured narrative sections, numbered assessments, documented plan bullets, general management and disposition. ROS, bedside examination, orientation, negatives, treatments and clearance cannot be invented; missing essential details appear outside the copyable note.

ICD mode uses a bundled official CMS FY2027 catalog (74,879 billable code descriptions, inherited Tabular instructions, effective 2026-10-01 through 2027-09-30). A model produces clinical search terms and provisional hints; the server searches the catalog locally and a second model reviews candidates against source evidence and coding instructions. Only codes from that candidate set with supporting source quotes can appear, adjacent to each problem in Assessment and Plan. Suggestions require clinician/coder review and do not promise reimbursement. No severity/complications are inferred to increase payment; uncertain admission/progress diagnoses are not treated as established facility discharge diagnoses. Unsupported codes remain unassigned with a clarification. Encounters outside the installed release do not receive guessed codes. The lookup does not send chart information to a third-party search service.

The existing ICD switch now requests suggestions; the same switch is available in Notes. Toggle off skips coding on the next build. Rebuild applies code changes while preserving the prior draft in version history. Changed charts and manual edits during generation are retained rather than overwritten. The admin's fictional test workspace uses the same structured H&P/progress pipeline.

Catalog build sources: https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip and https://www.cms.gov/files/zip/2027-code-tables-tabular-index.zip. Download to `/tmp/` with these filenames and run `python scripts/build-icd-catalog.py`; source-file SHA-256 hashes are embedded in the generated catalog. Coding guidance: https://www.cms.gov/files/document/fy-2027-icd-10-cm-coding-guidelines.pdf. Baseline before these changes: a6519d9cc310e82e3bf10c5e5d1824bac04d17a8 (`baseline/before-note-guides-2026-11-16`). Rolling source back does not roll back patient data.

A live fictional-case check exposed unsupported orientation, treatment details, and under-specific respiratory coding in the lightweight first draft. The clinical-note pipeline now uses the configured `ROUNDSAI_NOTE_MODEL` (default `gpt-4.1`) and a separate fidelity editor that reviews the entire draft against actual source facts before code selection. The editor removes invented findings/orders, unavailable sections and unsupported trends, and separates distinct active diagnoses. Coding selection uses the same higher-level model and explicitly checks documented qualifying attributes. This remains clinician-review documentation; automated checks do not establish clinical correctness for every chart.

Final verification (2026-11-17): live Vercel fictional H&P and daily-progress requests completed using the same structured generation pipeline and full owner guides. The daily case returned J18.9 for documented pneumonia and J96.01 for documented acute hypoxic respiratory failure. Codes-off H&P returned no coding payload. Unsupported orientation and extra treatment details observed in the lightweight draft were absent after the source-fidelity review. Rendering now removes documentation-availability filler and duplicate problem numbering. The retired service preview key has been removed from the Vercel preview endpoint; current preview access requires the verified owner session. These representative cases and automated tests do not replace clinician review or establish HIPAA readiness.

## Cross-device census synchronization
A stale dirty browser cache previously took precedence over a newer cloud revision on sign-in, which could make a phone show an older census. The client now resolves each load against the cloud revision: current-revision queued edits resume saving; older unsynced snapshots are preserved under an account-scoped device-draft recovery key before showing the latest cloud census. Identical content with reordered JSON keys does not create a false conflict. If preserving a draft fails due to device storage, the client keeps the original copy and reports the error instead of overwriting it.

Account → Review device drafts permits export or explicit recovery of selected records. It preserves the current snapshot before applying selected old versions; no automatic merge or deletion is performed. Existing account isolation and compare-and-swap writes remain unchanged. Foreground, page-show and visibility changes check cloud updates, with a 30-second check while visible. Refresh is paused during typing, modal review or note generation. Today and Census show the signed-in email, sync status and a Sync now action using existing styles; opening a screen refreshes status labels. Workspace reads include verified owner metadata, and the client rejects a mismatched cached identity.

Validation includes mocked browser-client regression tests for stale phone caches, queued laptop edits, recovery on storage failure, background/foreground refresh, no-overwrite while editing, offline recovery, JSON key order and first-account outbox resumption. Source checkpoint: 3334be5e579105bbebb1bd2f8ba02bc4fe3203ef, baseline/before-census-sync-fix-2026-11-17. Existing production patient snapshots were inspected only for counts/revisions and were not edited.

## Note-generation client reliability
Completed server note requests could appear to do nothing because the UI showed no persistent generation state, input synchronization could re-enable a pending build, and results were discarded when the chart or note changed during the request. A per-patient in-flight lock now prevents duplicate builds and survives rerenders/input events. Notes show an explicit generating/reviewing status and persistent inline errors. The completed draft is written to the current patient object (not a detached object replaced during cloud refresh) and the editor updates directly. If the clinician edits during generation, the generated result is retained in Version history while the newer edits remain intact. Background census refresh pauses during note generation. Account changes cannot redirect a result into another user's workspace; detached results remain scoped to the original account and are recovered into history on its next load, or may be exported from Account when the patient is no longer present.

Read-only production diagnostics on 2026-11-17 found multiple completed `note.generated` events and saved note bodies, rather than a universal provider outage. Validation includes mocked client tests for duplicate requests, pending-state rendering, provider failures, manual/chart edits during generation, cloud object replacement, account switching and sync failures. No production patient content was changed. Source checkpoint: eb7fdb903616d16d5f841d18410165d361450693, baseline/before-note-reliability-2026-11-17.

## Delegated admin access
Admin authorization now uses the current remotely verified Auth user: the protected owner account or server-managed `app_metadata.roundsai_admin === true`. User-editable metadata and client actor fields cannot grant access. Every admin API, model preview and Edge bridge enforces the role; the retired shared-key bridge no longer authorizes requests. User details show an Admin access switch and role badges. Admins can grant or revoke other users, but cannot change the protected owner or themselves. Changes record the acting email and target in admin history, preserve existing passwords/metadata/censuses, and remove reviewer access on revocation. Question review records the actual acting administrator. Temporary beta passwords must still be changed before admin access.

Validation: 79 automated tests, including delegated access, forged claims, revoked access, owner/self protection, audit failure and metadata preservation; HTML script syntax checked separately. Source checkpoint c0f1ec131c4d3b17812d24f86b322dc436967ca8, branch baseline/before-admin-roles-2026-11-17. Application role changes do not grant GitHub, Vercel or Supabase dashboard access.
