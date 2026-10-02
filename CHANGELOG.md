# Changelog

All notable changes to Tranz are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

Implementation candidate on stacked, unmerged review branches. Live Agora and ChatGPT are proven with synthetic data; bounded Google Meet integration evidence exists, while incoming participant audio/playback and real multi-person usefulness remain pending.

### Added

- Local single-owner MVP: Chrome MV3 extension (side panel, service worker, offscreen capture) and loopback Fastify backend with encrypted local storage.
- Meeting-tab and microphone capture with pause, microphone mute and stop; no raw-audio storage.
- Server-owned Agora session lifecycle with scoped 10-minute tokens, agent-join readiness, reconnect gating, watchdog and end reasons.
- Revision-linked English-to-Vietnamese translation of final transcript lines.
- Context profiles with immutable session snapshots; grounded reply suggestions, Vietnamese catch-up and a Vietnamese-to-English composer with cited sources and clarification fallback.
- Post-meeting notes (summary, decisions, next steps, illustrative phrases, vocabulary), opt-in keep and deletion.
- Verification scripts: unpacked-extension UI checks, real Chromium tab-capture checks with synthetic audio, and a synthetic grounding evaluation for a configured provider.

### Changed (after user review)

- The side panel is in Vietnamese, connects to the local backend automatically (no access-token step) and opens on a three-step checklist with one **Bắt đầu nghe** button; context is optional.
- The interface uses a true-black monochrome theme in the tone of X's dark mode (white text and one white main action, hairline separators, state-only colours, no glass or blur), with simpler setup copy, collapsed technical detail and the data-flow disclosure always visible under the start button. Text now scales with the browser text size.
- Backend error messages are in Vietnamese.

### Added (ChatGPT plan)

- Default AI provider uses the ChatGPT subscription through the official Codex runtime, with **Sign in with ChatGPT** in Settings and all Codex tools disabled ([ADR 0003](docs/decisions/0003-chatgpt-subscription-provider.md)).
- Batched translation of up to 8 final lines per request.

### Fixed

- Agora RTM transcripts never arrived: the runtime now subscribes to the RTM channel and the extension CSP allows WebAssembly for RTM (found in the first live Agora run).
- The side panel no longer shows a blank page while loading or after a rendering error.
- Automatic pairing now works in Chromium variants that omit the extension `Origin`: the extension supplies its runtime ID and the backend also requires the observed extension fetch metadata. Requests with a web origin, `Origin: null`, a wrong ID or incomplete metadata remain rejected.
- Stopping a ChatGPT-plan session now automatically starts post-meeting notes even when no API-key provider is configured.

### Security

- Consent and Settings disclose that Agora's managed pipeline runs a language model on the transcript.
- Provider credentials stay in the backend `.env`; the extension receives only a pairing token and short-lived Agora tokens.
- Temporary sessions never write transcript, context or notes to disk; kept sessions are AES-256-GCM encrypted.

## [0.1.0] - 2026-09-29

### Added

- Initial private GitHub repository.
- Product definition for the before, during, and after-meeting experience.
- MVP scope, non-goals, privacy commitments, and measurable success targets.
- Phase-gated delivery and Git workflow.
- Agora Conversational AI baseline decision record.
- Verified official Agora Next.js quickstart with live RTC audio, RTM transcript, and TTS.
- Project handbook covering product, architecture, design, contribution, backlog, and agent rules.

### Security

- Kept the official Agora baseline and local environment files outside product history.
- Documented server-side credential and scoped-token requirements.
- Recorded the requirement to rotate the Phase 00 App Certificate before production use.
