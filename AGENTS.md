# RoundsAI — approved baseline

## Owner instruction
Lou Rivera loves the current app. Preserve its look and feel. Improve functionality and add requested features incrementally. Do not redesign, restyle, replace navigation, or change typography, colors, spacing, cards, or mobile layout unless Lou explicitly requests that specific change. Fit additions into the existing design. Preserve the original rounds wordmark with aqua AI badge.

## Source checkpoint
Approved source commit: `97f27e6e76c991855e04286accf0ba958f845de4`.
Checkpoint branch: `baseline/approved-look-2026-11-16`.
Live app: https://roundsai-five.vercel.app/.
This preserves code and tracked assets, not database contents, Auth configuration, secrets or hosting settings. Database changes require separately planned compatible migrations and recovery; never blindly roll back schema or user data with application code.

## Preserve existing behavior
- White/teal interface, current phone design and responsive wider desktop layout.
- Today, Census, Scribe, Rounds and Learn navigation.
- Photo/text/browser-dictation intake with editable review before saving.
- Patient heads-up reminders, notes, ICD toggle, tasks, sign-out, quick/detailed presentations and PubMed evidence.
- Today's Rapid Fire and clinician-reviewed question approval.
- Email/password signup/sign-in, confirmed accounts, session refresh, account-specific census storage, revision conflict protection and local draft recovery.
- Discharge archives charts and notes; restoration returns patients to active census.
- One fictional Alex Morgan example initializes new account workspaces.

## Change discipline
1. Inspect current repository and relevant live behavior. Other conversations may have made newer changes; preserve them.
2. Before substantial feature work, create a source checkpoint from current HEAD and record its exact SHA.
3. Keep each change focused and reversible. Record changes, verification and rollback SHA in commits, PRs or change notes.
4. Preserve user data and manual edits. Never replace existing account censuses with examples.
5. Run appropriate checks and accurately distinguish mocked tests, real database tests, visual checks and live end-to-end verification.
6. Follow current user preview/publishing instructions; do not infer blanket permission to publish future changes.
7. HIPAA readiness and external confirmation-email delivery were not fully verified at this checkpoint. Use fictional cases for beta testing pending separate review.
