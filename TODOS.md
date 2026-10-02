# Current Approved Work

## Authorization and current request

On 2026-10-02 the user authorized integrated Phase 08R hardening for the complete Google Meet → extension → transcript/translation/assistance → post-meeting learning flow. The review branch is `fix/google-meet-e2e`; merge, release, store publication and Phase 09 remain unauthorized.

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
| 02 | Foundation; PR #2 open; unpacked extension loads, narrow manifest verified | User review; merge not authorized |
| 03 | Capture; PR #3 open; Chromium synthetic capture passed; real Meet side panel activated tab capture and mic speech reached Agora | Incoming participant audio, audible playback, device change |
| 04 | Agora lifecycle; PR #4 open; hardened and **verified live** in Phase 08 with synthetic speech (join, RTM transcript, pause/resume, token renewal past 10 min, stop, cleanup) | Real network-loss recovery; Google Meet |
| 05 | Translation; PR #5 open; batched and verified with the real ChatGPT plan in PR #9 | Latency 5–13 s, above the 3 s target |
| 06 | Context and grounded assistance; PR #6 open; live eval 6/6 plus real Meet-side-panel reply/catch-up/composer | Quality in a real multi-person meeting |
| 07 | Notes, keep/delete, restart recovery; PR #7 open; real synthetic artifact/save/delete passed | Real meeting quality; chunking over 60,000 characters deferred |
| 08 | Runtime hardening, live Agora fixes (RTM subscribe, WASM CSP), docs, evidence, review guide; PR #8 open | User review; merge not authorized |
| — | ChatGPT-plan provider (user request): PR #9 open; live eval 6/6 and signed-in panel use passed | Multi-person meeting quality |
| — | Simpler Vietnamese UI with automatic pairing (user review feedback): PR #10 open; Chromium harness 43/43; Cốc Cốc pairing fixed and exercised | User review |
| — | Monochrome black-and-white theme built with Zahlook: stacked branch/PR; Chromium harness 43/43; real Meet side panel exercised | Manual full-width and screen-reader review |
| 08R | Integrated Google Meet hardening on `fix/google-meet-e2e` | Incoming Meet-tab audio/playback, tab-close and network-loss checks remain |
| 09 | Not authorized | Requires separate approval |

## Phase 08R checklist

- [x] Synchronize handbook with actual implementation and distinguish observed facts from proposals.
- [x] Complete context CRUD, immutable snapshots, grounded replies, catch-up and Vietnamese reply composer.
- [x] Open the real side panel in a signed-in Google Meet call and start the Tranz runtime.
- [x] Fix automatic pairing for Chromium variants that omit `Origin`, without accepting web origins or incomplete metadata.
- [x] Verify synthetic microphone speech reaches real Agora transcript, real ChatGPT translation and context-grounded assistance.
- [x] Verify stop, real-provider learning artifact, save/delete, profile deletion and empty Agora-channel cleanup.
- [x] Fix ChatGPT-plan sessions so stop automatically launches post-meeting notes without requiring `AI_API_KEY`.
- [ ] Verify incoming participant audio from the Meet tab and audible local playback with a second participant/device.
- [ ] Verify Meet tab close and controlled network-loss recovery in the real panel.
- [ ] Complete screen-reader and manual multi-width panel review.
- [x] Validate revision-linked translation, failure/retry and cost bounds with a configured AI provider — ChatGPT plan via Codex (ADR 0003).
- [x] Wire and validate post-meeting processing, opt-in retention, saved learning and complete local deletion (mock provider).
- [x] Complete responsive side-panel UX, keyboard/focus, recovery states and unpacked-extension verification (tab rendering; real panel frame pending).
- [x] Harden provider failures, cancellation/stale events, logging, permissions, storage and session limits.
- [x] Run applicable automated and browser checks and record separate evidence.
- [x] Commit and push each phase to a focused stacked PR, preserving unrelated WIP.
- [x] Deliver an explicitly blocked implementation candidate for user review.
- [ ] Merge only after explicit user approval; no merge currently authorized.

## Remaining live gates

1. Join the Meet test call from a second participant/device and speak through that participant so incoming tab audio can be distinguished from the local microphone.
2. Confirm meeting playback remains audible during capture, pause and microphone mute.
3. Run the tab-close, controlled network-loss and VoiceOver/manual-width checks in [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md).

## Boundaries

- One phase per branch/PR; existing PRs remain open.
- Do not create `CLAUDE.md`.
- Do not modify, move, delete, track or commit `agora-baseline/`.
- Never expose provider credentials, environment files, private transcripts or recordings.
- No raw-audio storage by default; no real meeting content as fixtures.
- No automatic Phase 09, public beta recruitment, paid infrastructure, production deployment, store publication or P2 work.
