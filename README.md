# Tranz

> A real-time AI English meeting copilot for Chrome.

Tranz helps Vietnamese professionals understand difficult English conversations, respond using trusted personal and project context, and turn each meeting into practical material for improving their English.

**Version:** `0.1.0`

**Stage:** Local MVP implementation candidate — awaiting integrated review and live validation

**Current delivery phase:** Phases 02–08 implemented on stacked pull requests; none merged

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
| **Not yet proven** | Tranz with real Agora credentials (agent join, transcript over RTM, renewal, cleanup), Google Meet capture with audible playback, the real side-panel frame, and real AI provider quality and latency. |

Because the live gates are open, this is an **implementation candidate**, not a completed MVP.

## Run it locally

Requirements: Node.js 22.12+, npm, Chrome 116+.

```bash
npm ci
npm run setup      # creates a private .env with ACCESS_TOKEN and DATA_KEY; fill in provider values yourself
npm run build      # builds dist/extension and dist/server
npm run dev        # starts the backend on 127.0.0.1:4318
```

Load `dist/extension` with **chrome://extensions → Developer mode → Load unpacked**, copy the extension ID into `EXTENSION_ID` in `.env`, restart the backend, open Google Meet, click the Tranz toolbar icon and paste `ACCESS_TOKEN`. The Vietnamese review guide is [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md).

Checks: `npm run verify` (lint, typecheck, tests, build), `npm run verify:ui`, `npm run verify:capture` and, with an AI key, `npm run eval:grounding`.

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
