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
| 04 | Agora lifecycle; PR #4 open; hardened and **verified live** in Phase 08 with synthetic speech (join, RTM transcript, pause/resume, token renewal past 10 min, stop, cleanup) | Real network-loss recovery; Google Meet |
| 05 | Translation; PR #5 open; batched and verified with the real ChatGPT plan in PR #9 | Latency 5–13 s, above the 3 s target |
| 06 | Context and grounded assistance; PR #6 open | Real-provider grounding evaluation (`npm run eval:grounding`) |
| 07 | Notes, keep/delete, restart recovery; PR #7 open | Real note quality; chunking over 60,000 characters deferred |
| 08 | Runtime hardening, live Agora fixes (RTM subscribe, WASM CSP), docs, evidence, review guide; PR #8 open | AI provider gate; Google Meet; user review |
| — | ChatGPT-plan provider (user request): PR #9 open; live eval 6/6 | You sign in with ChatGPT in the panel |
| — | Simpler Vietnamese UI with automatic pairing (user review feedback): PR #10 open; Chromium harness 43/43 | Your review in the real side panel |
| — | Monochrome black-and-white theme built with Zahlook (user request): PR open on `feat/monochrome-dark-ui`, stacked on #10; Chromium harness 43/43 | Your review in the real side panel |
| 09 | Not authorized | Requires separate approval |

## Authorized remaining implementation checklist

- [x] Synchronize handbook with actual implementation and distinguish observed facts from proposals.
- [x] Complete context CRUD, immutable snapshots, grounded replies, catch-up and Vietnamese reply composer.
- [x] Close capture and Agora runtime gates with synthetic audio — Chromium capture and live Agora (synthetic speech) done; Google Meet playback still needs a person in a signed-in Meet call.
- [x] Validate revision-linked translation, failure/retry and cost bounds with a configured AI provider — ChatGPT plan via Codex (ADR 0003).
- [x] Wire and validate post-meeting processing, opt-in retention, saved learning and complete local deletion (mock provider).
- [x] Complete responsive side-panel UX, keyboard/focus, recovery states and unpacked-extension verification (tab rendering; real panel frame pending).
- [x] Harden provider failures, cancellation/stale events, logging, permissions, storage and session limits.
- [x] Run applicable automated and browser checks and record separate evidence.
- [x] Commit and push each phase to a focused stacked PR, preserving unrelated WIP.
- [x] Deliver an explicitly blocked implementation candidate for user review.
- [ ] Merge only after explicit user approval; no merge currently authorized.

## To unblock the live gates (user actions)

1. Agora is configured. Rebuild and restart the backend, reload the extension, then Settings → **Sign in with ChatGPT**.
2. `npm run eval:grounding` for the synthetic provider evaluation.
3. Follow the live checklist in [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md) with a Google Meet test call using synthetic speech.

## Boundaries

- One phase per branch/PR; existing PRs remain open.
- Do not create `CLAUDE.md`.
- Do not modify, move, delete, track or commit `agora-baseline/`.
- Never expose provider credentials, environment files, private transcripts or recordings.
- No raw-audio storage by default; no real meeting content as fixtures.
- No automatic Phase 09, public beta recruitment, paid infrastructure, production deployment, store publication or P2 work.
