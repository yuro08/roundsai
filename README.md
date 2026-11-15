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
