# Current Approved Work

## Authorization and current request

On 2026-09-29 the user authorized end-to-end MVP implementation through Phases 02–08, with user review deferred until integrated delivery. The user selected an OpenAI-compatible text provider with locally configured credentials.

The latest request is to produce a phased plan and one handoff prompt. Application implementation is paused for this planning handoff. Resume when the user invokes the handoff or explicitly asks to continue; no additional phase-by-phase approval is needed within the already authorized MVP scope.

- [x] Inspect actual branch, worktree, commits and open PR stack.
- [x] Record phased delivery plan, acceptance gates, evidence and limitations in [MVP delivery plan](docs/MVP_DELIVERY_PLAN.md).
- [x] Prepare [handoff prompt](docs/HANDOFF_PROMPT.md) preserving uncommitted work.
- [ ] User invokes continuation or reviews the plan.

## Implementation status — not completion claims

| Phase | Current state | Remaining gate |
| --- | --- | --- |
| 00 | Official Agora voice-agent baseline previously validated | Does not validate Tranz capture/silent topology |
| 01 | Handbook and authorization recorded; PR #1 open | User review, stale-document synchronization; merge not authorized |
| 02 | Foundation committed; PR #2 open | Integrated shell/design and unpacked-extension verification |
| 03 | Capture committed; PR #3 open | Live audio, playback, permission and lifecycle evidence |
| 04 | Agora lifecycle committed; PR #4 open | Real RTC/RTM/transcript, renewals, failure/cleanup evidence |
| 05 | Linked translation committed; PR #5 open | Local AI configuration, live quality/latency and UI recovery |
| 06 | Context/assistance/UI WIP in local worktree | Review, complete, test, commit and open focused PR |
| 07 | Untracked processor draft; routes not registered | Integration, idempotency, retention/deletion and recovery tests |
| 08 | Pending integrated hardening | Browser, privacy, security, E2E evidence and handoff |
| 09 | Not authorized | Requires separate approval |

## Authorized remaining implementation checklist

- [ ] Synchronize handbook with actual implementation and distinguish observed facts from proposals.
- [ ] Complete context CRUD, immutable snapshots, grounded replies, catch-up and Vietnamese reply composer.
- [ ] Close capture and Agora runtime gates with synthetic audio; do not hide blocked verification.
- [ ] Validate revision-linked translation, failure/retry and cost bounds with configured AI provider.
- [ ] Wire and validate post-meeting processing, opt-in retention, saved learning and complete local deletion.
- [ ] Complete responsive side-panel UX, keyboard/focus, recovery states and real extension verification.
- [ ] Harden provider failures, cancellation/stale events, logging, permissions, storage and session limits.
- [ ] Run applicable automated, browser and live checks and record separate evidence.
- [ ] Commit and push each phase to a focused stacked PR, preserving unrelated WIP.
- [ ] Deliver integrated MVP or explicitly blocked implementation candidate for user review.
- [ ] Merge only after explicit user approval; no merge currently authorized.

## Boundaries

- One phase per branch/PR; existing PRs remain open.
- Do not create `CLAUDE.md`.
- Do not modify, move, delete, track or commit `agora-baseline/`.
- Never expose provider credentials, environment files, private transcripts or recordings.
- No raw-audio storage by default; no real meeting content as fixtures.
- No automatic Phase 09, public beta recruitment, paid infrastructure, production deployment, store publication or P2 work.
- Preserve the dirty worktree on `feat/grounded-assistance`; the plan records its exact snapshot.
