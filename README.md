# Tranz

> A real-time AI English meeting copilot for Chrome.

Tranz helps Vietnamese professionals understand difficult English conversations, respond using trusted personal and project context, and turn each meeting into practical material for improving their English.

**Version:** `0.1.0`

**Stage:** Local MVP implementation candidate — integrated synthetic review complete; bounded live gates remain

**Current delivery phase:** Phase 08U extension UI/UX rebuild in [PR #14](https://github.com/doandanh-zah/tranz/pull/14), stacked on Phase 08T / PR #13; none merged

## Product loop

### Before a meeting

Users prepare a reusable context profile containing their role, project facts, meeting goal, vocabulary, expected questions, and preferred communication style.

### During a meeting

Tranz is intended to provide:

- real-time English speech-to-text;
- English-to-Vietnamese translation beside the original transcript;
- question detection and short reply suggestions;
- answers grounded in context supplied by the user;
- clarification and catch-up actions when the conversation becomes difficult;
- a Vietnamese-to-natural-English reply composer.

### After a meeting

Tranz produces a concise summary, decisions, action items, improved answers, and vocabulary or phrases taken from the real conversation.

## Current status

Three levels of certainty are kept apart:

| Level | What it covers |
| --- | --- |
| **Validated baseline** | The official Agora Conversational AI quickstart ran end to end on 2026-09-28 (RTC, RTM, live transcript, TTS). See [ADR 0001](docs/decisions/0001-agora-convoai-baseline.md). |
| **Implemented and tested** | A local, single-owner MVP: Chrome MV3 extension + loopback Fastify backend. Automated tests, the unpacked extension rendered in Chromium at 320–600 px with a mock AI provider and simulated transcript, and real Chromium tab capture with a synthetic tone. See [docs/evidence](docs/evidence/). |
| **Live, synthetic speech** | The real Tranz runtime against the configured Agora project with macOS-generated speech played in a real tab: agent join, transcript over RTM, pause/resume, token renewal past 10 minutes, stop and cleanup (`npm run verify:live`). |
| **Live, ChatGPT plan** | Translation, grounded replies, catch-up and composer through the user's ChatGPT Plus plan via the official Codex runtime (`npm run eval:grounding`, 6/6 synthetic cases, 5–13 s per request). |
| **On-device translation** | Cốc Cốc 152 downloaded the built-in EN→VI pack in 8.7 s in an isolated profile, then translated five synthetic sentences in 10.4–34 ms each. Unsupported browsers transparently retain the ChatGPT fallback. See [ADR 0004](docs/decisions/0004-on-device-fast-translation.md). |
| **Google Meet integrated, synthetic input** | In a signed-in Google Meet call on 2026-10-02, the real side panel paired automatically, started tab capture, joined Agora, received microphone-fed synthetic speech, displayed transcript and Vietnamese translation, and produced context-grounded reply/catch-up/composer output through ChatGPT. Stop, notes generation, save/delete, context deletion and empty Agora-channel cleanup were verified. |
| **Not yet proven** | Incoming participant audio from the Meet tab, audible meeting playback while capture is active, tab-close recovery in Meet, real network-loss recovery, screen-reader use, and usefulness/latency in a real multi-person meeting. |

Because important live gates remain, this is an **implementation candidate**, not a completed MVP or private beta.

## Run it locally

Requirements: Node.js 22.12+, npm, Chrome 116+, and the [Codex CLI](https://github.com/openai/codex) for the default ChatGPT-plan AI provider. Chrome/Chromium 138+ is required for the on-device translation fast path; older supported builds fall back to ChatGPT.

```bash
npm ci
npm run setup      # creates a private .env with ACCESS_TOKEN and DATA_KEY; add Agora values yourself
npm run build      # builds dist/extension and dist/server
npm run dev        # starts the backend on 127.0.0.1:4318
```

Load `dist/extension` with **chrome://extensions → Developer mode → Load unpacked**, copy the extension ID into `EXTENSION_ID` in `.env` and restart the backend. Open Google Meet and click the Tranz toolbar icon: the panel (in Vietnamese) connects by itself and shows a three-step checklist; press **Đăng nhập ChatGPT** to use your ChatGPT plan for AI ([ADR 0003](docs/decisions/0003-chatgpt-subscription-provider.md)); set `AI_PROVIDER=openai` and `AI_API_KEY` to use an API key instead. The Vietnamese review guide is [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md).

Checks: `npm run verify` (lint, typecheck, tests, build into `artifacts/verify-build`), `npm run verify:ui`, `npm run verify:capture`, `npm run verify:live` (real Agora, synthetic speech), `npm run verify:translator` (browser capability; add `-- --translate` to download/benchmark synthetic sentences) and `npm run eval:grounding`. Only `npm run build` writes `dist/`; press Reload in `chrome://extensions` afterwards.

UI review without the extension: `npm run demo:ui` (add `-- --live` for a simulated meeting) serves the panel at http://127.0.0.1:5173 against a throwaway backend with synthetic data and a mock AI; it reads nothing from `.env`, and the demo token it prints only unlocks that backend.

## Project documentation

| Document | Purpose |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | Product vision, users, MVP, non-goals, requirements, and long-term direction |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Validated baseline, proposed MVP architecture, trust boundaries, and long-term architecture |
| [DESIGN.md](DESIGN.md) | UX principles, meeting flows, interface states, accessibility, and design direction |
| [WORKFLOW.md](WORKFLOW.md) | Phase-gated delivery process, Git flow, review gates, and release workflow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup expectations, branches, commits, pull requests, and verification |
| [TODOS.md](TODOS.md) | Checklist for the currently approved phase |
| [BACKLOG.md](BACKLOG.md) | Prioritized future work that is not authorized by the current phase |
| [CHANGELOG.md](CHANGELOG.md) | Completed changes grouped by version |
| [AGENTS.md](AGENTS.md) | Mandatory operating instructions for coding agents |
| [ADR 0001](docs/decisions/0001-agora-convoai-baseline.md) | Agora baseline evidence and carried-forward constraints |
| [ADR 0002](docs/decisions/0002-local-mvp.md) | Local MVP stack, storage, retention and runtime decisions |
| [ADR 0003](docs/decisions/0003-chatgpt-subscription-provider.md) | ChatGPT subscription (Codex) as the default AI provider |
| [ADR 0004](docs/decisions/0004-on-device-fast-translation.md) | Browser on-device EN→VI fast path with ChatGPT fallback |
| [Evidence](docs/evidence/) | Per-phase verification records and the MVP acceptance matrix (Vietnamese) |

## MVP boundaries

- Browser meetings only, with Google Meet as the first target.
- English-to-Vietnamese support first.
- Explicit start and stop controls.
- No permanent raw-audio storage by default.
- No autonomous participation or speaking on the user's behalf.
- No claim of final architecture until the audio and silent-assistant spikes pass.

## Repository boundary

The official Agora sample used for technical validation remains in the ignored local directory `agora-baseline/`. It is reference evidence, not Tranz product code, and must not be committed or pushed.

Phases 02–08 were implemented under the user's 2026-09-29 end-to-end authorization as stacked pull requests. Nothing is merged or released without explicit approval.

## Delivery model

Tranz uses phase-gated delivery:

1. approve one bounded phase;
2. work on one phase branch;
3. verify the defined acceptance criteria;
4. open a focused pull request with evidence;
5. stop for review before merging or beginning the next phase.

See [WORKFLOW.md](WORKFLOW.md) for the full contract.

## Privacy baseline

- Capture begins only after an explicit user action.
- Listening and retention states must remain visible.
- Transcript retention is opt-in and deletable.
- Meeting content is not used for model training by Tranz.
- App Certificates and provider credentials stay server-side.
- Browser clients receive scoped, expiring tokens.

## License

No license has been granted. This is a private project.
