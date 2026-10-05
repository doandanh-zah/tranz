# Phase 08V — compact conversation checkpoint

Date: 2026-10-05. Branch: `feat/chat-conversation`, stacked on `feat/10k-extension-ui` at `3bb6d99` / PR #14. Version remains `0.1.0`. This checkpoint covers the independently implementable UI portion of the user's feedback; the whole phase is not complete.

## Outcome and changes

- A chronological chat replaces the latest-only reading surface and collapsed duplicate history. Each sentence keeps its timestamp, English original, Vietnamese translation and reply selection together. Partial speech has a separate dashed bubble and is never translated.
- The scroll region is bounded to 42% of the viewport (240–420 px). New speech does not move a reader reviewing earlier sentences; “Xuống câu mới nhất” resumes following.
- Selecting another source sentence clears the old AI suggestion and invalidates its pending completion. Suggested replies remain separate from actual transcript and retain source/uncertainty labels.
- Header, title, preparation and reading spacing are smaller. Automatic-question details, reply transformations, composer and context are collapsed. Copy remains available directly.

## Files

- `apps/extension/src/views/Live.tsx`: chat rendering, partial/final handling, preserved scroll, selection and compact reply disclosures.
- `apps/extension/src/style.css`: bounded chat bubbles, compact spacing, distinct AI result surface and pointer targets.
- `scripts/verify-ui.mjs`: history selection, scroll preservation, follow/jump and bounded-height browser checks.
- `README.md`, `DESIGN.md`, `WORKFLOW.md`, `TODOS.md`, `CHANGELOG.md` and this evidence document: current scope, behavior, verification and remaining decision.

## Verification

- `npm run verify`: passed lint, TypeScript, **34/34 tests** and verification build.
- `TRANZ_CHROMIUM='<cached Chromium 1234 executable>' node scripts/verify-ui.mjs artifacts/ui-chat-final`: **65/65 passed** against the newly built unpacked extension. Covers worker load, permission inventory, chat selection/scroll behavior, 320–600 px, 200% root text, keyboard focus, reduced motion, on-device/fallback test doubles, reply/composer and post-meeting mock flows.
- `npm run build`: production extension refreshed in `dist/extension`; reload the unpacked extension before trying it.
- `git diff --check`: passed. Documentation links and changed-file secret patterns checked.
- Screenshots inspected: `artifacts/ui-chat-final/06-chat-compact-375.png` and `06-live-simulated-375.png`. Only synthetic sentences and mock/device-stand-in translations are used.
- Initial default browser launch failed because Playwright expects an uninstalled Chromium 1243. Reusing installed Chromium 1234 passed; no tests or security settings were disabled.

## Unchanged and remaining decision

Capture still mixes tab audio and the local microphone. Permissions, provider contracts, backend, translation logic, audio processing, retention and Agora baseline are unchanged. Therefore **counterpart-only translation is not implemented or claimed at this checkpoint**. Each chat sentence still says the speaker is unidentified.

The user was asked whether to:

1. listen only to Meet-tab audio and omit local microphone speech entirely (recommended); or
2. retain local speech on a separately identified path and translate only remote speech.

That question is pending. A reply is necessary because the choice changes capture/privacy and whether local speech appears in the transcript (AGENTS material-scope rule). After the choice, update PRODUCT/ARCHITECTURE/ADR/consent and run capture/live verification appropriate to the change.

## Gate and limitations

- Compact chat is implemented and tested with synthetic data in the actual extension document. A live Google Meet call, native side-panel frame resizing and VoiceOver were not re-tested for this checkpoint.
- Counterpart-only capture/translation remains pending, so Phase 08V stays incomplete.
- Local checkpoint commit only; no PR, push, merge or release for this follow-up yet. Existing PR #14 stays unchanged. Untracked `.claude/` and ignored `agora-baseline/`/environment files are preserved.
