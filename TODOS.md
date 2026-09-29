# Current Approved Work

## Authorization and current request

On 2026-09-29 the user authorized end-to-end MVP implementation through Phases 02–08, with user review deferred until integrated delivery, and selected an OpenAI-compatible text provider with locally configured credentials.

The user invoked the handoff prompt on 2026-09-29 and asked to continue Phases 06–08 until completion or a real blocker, then stop for integrated review. No merge, production deployment, store publication, Phase 09 or P2 work is authorized.

- [x] Inspect actual branch, worktree, commits and open PR stack.
- [x] Record phased delivery plan, acceptance gates, evidence and limitations in [MVP delivery plan](docs/MVP_DELIVERY_PLAN.md).
- [x] Prepare [handoff prompt](docs/HANDOFF_PROMPT.md) preserving uncommitted work.
- [x] User invokes continuation (2026-09-29).

## Implementation status — not completion claims

| Phase | Current state | Remaining gate |
| --- | --- | --- |
| 00 | Official Agora voice-agent baseline validated | Does not validate Tranz capture/silent topology |
| 01 | Handbook; PR #1 open; synchronised with the implementation in Phase 08 | User review; merge not authorized |
| 02 | Foundation; PR #2 open; unpacked extension loads, narrow manifest verified | Real side-panel frame check |
| 03 | Capture; PR #3 open; real Chromium tab capture with synthetic audio passed (pause, mute, stop, denial) | Google Meet, audible playback, device change |
| 04 | Agora lifecycle; PR #4 open; hardened in Phase 08; mock-provider tests pass | **Blocked:** no Agora credentials in `.env` — real join, RTM transcript, renewal, cleanup |
| 05 | Translation; PR #5 open; mock-provider UI checks pass | **Blocked:** no `AI_API_KEY` — real quality and latency |
| 06 | Context and grounded assistance; PR #6 open | Real-provider grounding evaluation (`npm run eval:grounding`) |
| 07 | Notes, keep/delete, restart recovery; PR #7 open | Real note quality; chunking over 60,000 characters deferred |
| 08 | Runtime hardening, docs, evidence, review guide; PR #8 open | Live gates above; user review |
| 09 | Not authorized | Requires separate approval |

## Authorized remaining implementation checklist

- [x] Synchronize handbook with actual implementation and distinguish observed facts from proposals.
- [x] Complete context CRUD, immutable snapshots, grounded replies, catch-up and Vietnamese reply composer.
- [ ] Close capture and Agora runtime gates with synthetic audio — Chromium capture done; Google Meet and live Agora blocked on credentials and a signed-in Meet test call.
- [ ] Validate revision-linked translation, failure/retry and cost bounds with configured AI provider — blocked on local `AI_API_KEY`.
- [x] Wire and validate post-meeting processing, opt-in retention, saved learning and complete local deletion (mock provider).
- [x] Complete responsive side-panel UX, keyboard/focus, recovery states and unpacked-extension verification (tab rendering; real panel frame pending).
- [x] Harden provider failures, cancellation/stale events, logging, permissions, storage and session limits.
- [x] Run applicable automated and browser checks and record separate evidence.
- [x] Commit and push each phase to a focused stacked PR, preserving unrelated WIP.
- [x] Deliver an explicitly blocked implementation candidate for user review.
- [ ] Merge only after explicit user approval; no merge currently authorized.

## To unblock the live gates (user actions)

1. `npm run setup`, then add `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (rotate the Phase 00 certificate first), `AI_API_KEY` and optionally `AI_BASE_URL`/`AI_MODEL` to `.env` yourself.
2. `npm run eval:grounding` for the synthetic provider evaluation.
3. Follow the live checklist in [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md) with a Google Meet test call using synthetic speech.

## Boundaries

- One phase per branch/PR; existing PRs remain open.
- Do not create `CLAUDE.md`.
- Do not modify, move, delete, track or commit `agora-baseline/`.
- Never expose provider credentials, environment files, private transcripts or recordings.
- No raw-audio storage by default; no real meeting content as fixtures.
- No automatic Phase 09, public beta recruitment, paid infrastructure, production deployment, store publication or P2 work.
