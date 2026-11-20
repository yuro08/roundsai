# Beta functional verification — November 20, 2026

## Repairs
- Bulk Generate checks unchanged, confirmed individual updates and continues on the first click. Clarifications stop the affected patient; editing clears confirmation. Async checker responses preserve newer edits.
- Larger note requests accept long histories while provider context remains bounded. Explicit execution budgets and Eastern encounter dates apply.
- Current updates supersede historical support. Final note review uses actual source facts rather than template examples, with targeted unsupported-content checks and one corrective pass. Persistent failure preserves the prior note.
- Unsupported disposition text is omitted when no explicit disposition source is supplied. Missing-information filler is excluded from copyable notes.
- Bulk notes show cloud sync state; batch microphones are disabled during checking.
- Ordinary sign-out affects this device only; password changes retain global session invalidation.
- Existing branding, layout and navigation are preserved.

## Verification
147 automated tests passed locally after these changes. JavaScript syntax and diff checks passed. The execution workspace became unavailable during final publication; the same final edits were reconstructed using exact-match guarded replacements.

| Flow | Evidence |
| --- | --- |
| Bulk progress notes | Actual client orchestration with real deployed API and AI provider; two fictional patients, one Generate action, both drafts ready |
| Current versus old chart | Current T-piece update retained over historical mechanical ventilation; explicit LTAC plan preserved |
| ICD toggle | Supported catalog codes with toggle on; no codes when off |
| Long chart | Approximately 280 KB source history accepted |
| Cloud persistence | Separate fresh login restored both patients, updates and notes |
| Concurrent saves | Stale revision rejected with 409; cloud state preserved |
| Discharge and restore | Archived note retained and two active patients restored |
| Chart intake | Real deployed text and synthetic-image intake returned the expected fictional room |
| Revision | Explicit chest-pain denial added while preserving current oxygen support |
| Other AI tools | H&P, quick presentation, heads-up and evidence API calls passed; evidence returned three matching numeric PMID links |
| Account password | Eight-character password change followed by successful fresh login and preserved census/notes |
| Desktop UI | Actual app with fictional API fixtures: selection, updates, confirmation, generation, individual copy, open/revise, tasks and handoff |
| Admin | Login page reachable; authorization regressions covered by automated tests; signed-in admin modifications not exercised |

Real-provider output review exposed unsupported boilerplate; the source-only review and correction checks were strengthened and the real progress/H&P checks repeated. The final deterministic disposition and filler changes passed automated tests, without an additional provider run. These checks do not establish universal clinical accuracy.

## Remaining beta limits
- Multi-patient Scan Census / Dictate Census remain previews; use Add one patient and its supported capture options.
- Some Scribe shortcuts, including photo update of an existing chart, are unavailable and now explain supported alternatives.
- Notifications and chat are not enabled.
- Physical iPhone microphone, camera and background behavior were not verified.
- External signup confirmation-email delivery was not verified; confirmed beta-account workflow was tested.
- AI drafts require clinician review. Automated checks are not clinician approval.

## Data and release
Only an isolated, non-admin, tagged QA account and fictional patient data were used. That account, its fictional workspace, notes, activity and sessions were removed after testing. Existing user census records, notes and credentials were not changed.

Source rollback baseline: `34d746c0d67e4af78c76351d787c881471fb45d5`. Preserve user records and additive database schema when rolling back application source.
