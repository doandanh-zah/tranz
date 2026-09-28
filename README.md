# Tranz

> A real-time AI English meeting copilot for Chrome.

Tranz helps Vietnamese professionals understand fast or difficult English conversations, respond with confidence using their own context, and turn every meeting into material for long-term language improvement.

**Status:** Discovery and technical validation. The Agora Conversational AI baseline is proven; product implementation has not started.

## The problem

In an English meeting, users often face three problems at once:

- the other person speaks too quickly or uses unfamiliar language;
- the user understands the question but cannot form a good answer quickly enough;
- useful vocabulary and corrections disappear as soon as the call ends.

Most tools address only transcription or translation. Tranz is designed around the complete meeting loop: prepare, participate, and improve.

## Product loop

### Before the meeting

The user supplies a reusable context profile:

- their role and preferred communication style;
- project or company background;
- the meeting goal;
- important facts the assistant may use;
- expected questions and domain vocabulary.

### During the meeting

Tranz provides a compact Chrome side-panel experience with:

- real-time English speech-to-text;
- English-to-Vietnamese translation alongside the original transcript;
- question detection;
- short, context-grounded reply suggestions;
- safer fallback replies when context is insufficient;
- a catch-up action for explaining the recent conversation;
- a Vietnamese-to-natural-English reply composer.

### After the meeting

Tranz turns the session into:

- a concise meeting summary;
- decisions and action items;
- vocabulary and phrases taken from the real conversation;
- contextual examples and improved answers;
- material that can later feed flashcards and spaced repetition.

## MVP scope

- Chrome-based meetings, with Google Meet as the first validation target.
- English-to-Vietnamese transcription and translation.
- Separate handling of meeting-tab audio and the user's microphone.
- Explicit start and stop controls.
- Pre-meeting context profiles.
- Short answer suggestions grounded in user-provided context.
- Post-meeting summary, action items, and vocabulary review.
- Session deletion and opt-in transcript retention.

## Non-goals for the first version

- Native Zoom or Microsoft Teams desktop applications.
- Broad multilingual support.
- Perfect speaker diarization for every participant.
- Autonomous participation or speaking on the user's behalf.
- Permanent raw-audio storage.
- Full spaced-repetition scheduling.
- Enterprise administration, billing, or team workspaces.

## Product principles

1. **Glanceable under pressure.** Suggestions must be readable in seconds, not paragraphs.
2. **Grounded, not invented.** Tranz may use only supplied context and meeting evidence. When context is insufficient, it should recommend clarification instead of fabricating facts.
3. **Original and translation stay connected.** Users should be able to learn from the English, not become dependent on a detached translation.
4. **Privacy is visible.** Listening, storage, and deletion states must always be obvious.
5. **The meeting comes first.** Tranz must reduce cognitive load instead of becoming another conversation to manage.

## Technical direction

### Validated

On 2026-09-28, the official Agora Conversational AI Next.js quickstart was validated end to end with an existing Agora project:

- RTC, RTM, and Conversational AI were enabled and control-plane ready;
- the browser joined a live session and published microphone audio;
- the agent joined and returned live transcript and TTS output;
- Agora-managed STT, LLM, and TTS worked without separate vendor keys;
- doctor, lint, typecheck, API contract checks, and production build passed.

The full evidence and constraints are recorded in [ADR 0001](docs/decisions/0001-agora-convoai-baseline.md).

### Still to validate

The successful voice-agent baseline does not yet prove the final Tranz architecture. The next technical spikes must determine:

- how reliably a Chrome extension can publish meeting-tab audio and microphone audio;
- whether the production assistant can operate silently without injecting TTS into the meeting;
- how transcripts, translations, and suggested replies should be separated and synchronized;
- the latency and cost of question-triggered answer generation;
- failure behavior when audio, RTM, the agent, or the browser tab disconnects.

No production architecture will be treated as final until those spikes pass.

## Privacy and security commitments

- Capture starts only after an explicit user action.
- The UI always shows when Tranz is listening.
- Raw audio is not stored by default.
- Transcript retention is opt-in and user-controlled.
- Users can delete sessions and derived learning material.
- Meeting content is not used for model training by Tranz.
- Permissions are requested only when required for a shipped feature.
- Agora App Certificates and provider credentials remain server-side.
- Browser clients receive scoped, expiring tokens rather than long-lived secrets.
- Production use must include clear consent guidance for meeting participants.

## Delivery roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 00 | Official Agora end-to-end baseline | Complete |
| 01 | Product scope, README, private repository, Git workflow | In progress |
| 02 | Manifest V3 extension shell and side panel | Planned |
| 03 | Meeting-tab and microphone audio feasibility | Planned |
| 04 | Agora real-time transcript integration | Planned |
| 05 | Live English-to-Vietnamese translation | Planned |
| 06 | Context-grounded answer suggestions | Planned |
| 07 | Post-meeting learning loop | Planned |
| 08 | Privacy, reliability, accessibility, and store readiness | Planned |
| 09 | Private beta and measured iteration | Planned |

Every phase has its own branch, acceptance criteria, verification report, and review gate. Work stops after each phase until the result is accepted.

## Git workflow

`main` must remain reviewable and releasable.

```text
main
  └── phase branch
        ├── small conventional commits
        ├── tests and evidence
        ├── pull request
        ├── review gate
        └── squash merge
```

Branch examples:

```text
feat/phase-02-extension-foundation
spike/phase-03-audio-capture
feat/phase-04-agora-realtime
fix/idempotent-agent-stop
docs/product-scope
```

Commit prefixes:

```text
feat:     product capability
fix:      defect correction
docs:     documentation only
test:     test coverage or fixtures
chore:    tooling and maintenance
refactor: behavior-preserving restructuring
```

Rules:

- no force-push to `main`;
- no direct feature work on `main` after repository bootstrap;
- one phase per pull request;
- no secrets, real meeting audio, or private transcripts in Git;
- no merge before acceptance criteria and verification evidence are documented.

## Initial success targets

These are product targets, not validated performance claims:

- partial transcript visible within 2 seconds of speech;
- translation visible within 3 seconds;
- a useful suggested reply within 5 seconds of a detected question;
- session start success above 95% during private beta;
- zero raw-audio retention unless explicitly enabled;
- user-rated helpfulness for suggestions and learning material.

## Repository boundaries

The official Agora sample used for Phase 00 remains a local, ignored baseline under `agora-baseline/`. It is not part of the Tranz product repository and must not be pushed or modified as product code.

This repository currently contains product documentation only. Application scaffolding begins in Phase 02 after Phase 01 review.

## License

No license has been granted. This is a private project.
