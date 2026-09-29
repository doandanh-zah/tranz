# Tranz

> A real-time AI English meeting copilot for Chrome.

Tranz helps Vietnamese professionals understand difficult English conversations, respond using trusted personal and project context, and turn each meeting into practical material for improving their English.

**Version:** `0.1.0`

**Stage:** Product definition and technical validation

**Current delivery phase:** Phase 01 — project handbook and repository governance

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

The official Agora Conversational AI Next.js quickstart has been validated end to end. RTC, RTM, microphone publication, live transcripts, TTS, agent lifecycle, API contracts, typechecking, linting, and production build were verified.

This proves the Agora voice-agent baseline, but it does not yet prove the final silent meeting-copilot architecture. Meeting-tab capture, silent operation, translation latency, and context-grounded suggestions remain explicit validation tasks.

No Tranz application code has been scaffolded yet.

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

## MVP boundaries

- Browser meetings only, with Google Meet as the first target.
- English-to-Vietnamese support first.
- Explicit start and stop controls.
- No permanent raw-audio storage by default.
- No autonomous participation or speaking on the user's behalf.
- No claim of final architecture until the audio and silent-assistant spikes pass.

## Repository boundary

The official Agora sample used for technical validation remains in the ignored local directory `agora-baseline/`. It is reference evidence, not Tranz product code, and must not be committed or pushed.

Application scaffolding begins only after the current phase is reviewed and the next phase is explicitly approved.

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
