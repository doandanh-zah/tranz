# ADR 0001: Use Agora as the preferred real-time AI baseline

- **Status:** Accepted for continued validation
- **Date:** 2026-09-28
- **Decision scope:** Technical baseline, not final product architecture

## Context

Tranz needs low-latency audio transport, speech recognition, conversational context, and real-time transcript delivery. Agora was selected for the first technical baseline because project credits are expected to be available through the founder's ambassador relationship and the local Agora CLI provides an official, repeatable onboarding path.

The central question in Phase 00 was narrow: can an official Agora Conversational AI client and cloud agent complete one real browser-based voice conversation end to end?

## Baseline used

- Official `AgoraIO-Conversational-AI/agent-quickstart-nextjs` sample.
- Node.js 22 and pnpm.
- Agora CLI 0.2.4.
- Existing `talking-agent` Agora project.
- RTC, RTM, and Conversational AI enabled.
- Agora-managed default STT, LLM, and TTS pipeline.
- No separate provider keys and no source modifications.

The sample remains in the ignored local directory `agora-baseline/`. It is evidence and a reference implementation, not Tranz product code.

## Evidence

- Agora CLI install doctor passed.
- Project doctor confirmed valid auth, project access, credentials, token capability, RTC, RTM, and Conversational AI readiness.
- The official sample's local doctor passed.
- `pnpm run verify` passed:
  - ESLint;
  - TypeScript typecheck;
  - API contract verification;
  - Next.js production build.
- Token generation and agent invitation returned HTTP 200.
- A live browser session published microphone audio.
- The user confirmed live transcript output and audible TTS response.
- Agent stop returned HTTP 200 and the development server was shut down cleanly.

## Observations

1. Agora is a viable foundation for a browser-based real-time voice AI session.
2. RTM is required for transcript, state, metric, and error delivery in the validated sample.
3. App Certificate handling must stay on the server; the browser should receive scoped RTC and RTM-capable tokens.
4. Successful agent invitation is not sufficient evidence by itself. Runtime join, audio publication, transcript, response, and cleanup must all be verified.
5. The sample received a second stop request while the agent was already shutting down. That request returned a conflict and surfaced as a server error. Tranz must make session termination idempotent.
6. Deep project doctor reports a non-blocking warning about missing Agora-managed metadata comments in `.env.local`, even after the template-aware env writer runs. Project binding and App ID matching still pass.
7. The Codex in-app browser could not complete RTC because its SDP parser rejected an ICE attribute. A normal Chromium browser completed the live test after microphone permission was granted.

## Decision

Use Agora as the preferred real-time AI foundation for the next validation phases, while keeping the integration behind product-owned boundaries.

This decision does **not** yet establish that Agora Conversational AI's default voice-agent flow is the final Tranz architecture. Tranz is intended to be a silent meeting copilot, so Phase 03 and Phase 04 must prove the following before architecture is locked:

- meeting-tab audio and microphone capture can be handled reliably;
- the assistant can provide transcript and data responses without injecting unwanted TTS into the meeting;
- transcript events can support translation and question-triggered suggestions at acceptable latency;
- reconnect, duplicate stop, partial failure, and cleanup behavior are safe and predictable.

## Constraints carried forward

- Keep Agora and provider secrets server-side.
- Never commit real `.env` files.
- Preserve RTC and RTM token capability.
- Wait for runtime join evidence rather than treating an accepted start request as success.
- Make start and stop operations idempotent.
- Default to no raw-audio retention.
- Keep the official baseline isolated from product history.
- Rotate the Phase 00 App Certificate before production use because it appeared in local task output during validation.

## Revisit conditions

Revisit this decision if:

- silent operation is unsupported or unreliable;
- tab-audio transport introduces unacceptable latency or quality loss;
- translation and reply suggestions cannot meet measured UX targets;
- cost remains unsustainable even with expected credits;
- privacy or Chrome Web Store requirements cannot be met with the integration model.
