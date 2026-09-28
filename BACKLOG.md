# Product Backlog

This file contains future priorities and deferred ideas. It is not an execution queue and does not authorize implementation.

Only work listed in [TODOS.md](TODOS.md) and explicitly approved by the user is in scope. When a future phase is approved, move only its agreed tasks into `TODOS.md` with acceptance criteria.

## Priority model

- **P0:** required to validate the central product and privacy assumptions.
- **P1:** important for a credible private beta after the core loop works.
- **P2:** valuable expansion that must not complicate the MVP prematurely.

Status values are `planned`, `research`, `blocked`, or `deferred`. None means authorized.

## P0 — prove the core meeting loop

### Phase 02 — extension and backend foundation

**Status:** planned

- Select and document the extension, backend, shared-contract, test, and package structure.
- Scaffold a Manifest V3 Chrome extension with side panel, service worker, and offscreen context.
- Scaffold a typed backend with health and authenticated session boundaries.
- Establish lint, typecheck, unit tests, builds, environment validation, and CI.
- Implement only local fixture states needed to verify the shell; do not present them as live behavior.
- Produce the first real side-panel design system and responsive state gallery.

### Phase 03 — audio feasibility

**Status:** research

- Validate supported Chrome tab-audio capture behavior on Google Meet.
- Validate microphone capture without breaking meeting playback or input.
- Determine whether streams can remain separate and meaningfully labeled.
- Exercise permission denial, tab closure, device change, pause, resume, cleanup, and browser suspension.
- Record constraints in an ADR before selecting the production capture path.

### Phase 04 — Agora real-time lifecycle

**Status:** planned; depends on Phase 03

- Design server-side token issuance and agent orchestration contracts.
- Prove silent assistant operation or select an alternative safe topology.
- Normalize RTC and RTM lifecycle events.
- Implement runtime readiness, renewals, reconnect, idempotent stop, and cleanup.
- Measure first partial and final transcript latency.
- Rotate the Phase 00 App Certificate before production use.

### Phase 05 — linked translation

**Status:** planned; depends on stable transcript segments

- Translate English partial or final segments according to measured quality and latency.
- Keep every translation linked to its source revision.
- Handle delayed, failed, corrected, and low-confidence output.
- Evaluate workplace and technical vocabulary with a representative synthetic set.

### Phase 06 — grounded reply suggestions

**Status:** planned; depends on context and transcript contracts

- Implement context profiles and immutable session snapshots.
- Detect questions through a measured automatic, manual, or hybrid trigger.
- Generate short, speakable answers grounded in approved context and meeting evidence.
- Surface evidence and uncertainty.
- Evaluate hallucination, latency, tone, context injection, and prompt-injection resistance.

### Phase 07 — post-meeting learning loop

**Status:** planned

- Finalize sessions exactly once.
- Generate summary, decisions, action items, improved replies, vocabulary, and phrases.
- Link learning items to their meeting context without exposing unnecessary transcript text.
- Support review, save, and deletion behavior under the session retention policy.

## P1 — private-beta readiness

### Phase 08 — hardening and store readiness

**Status:** planned

- Complete accessibility and keyboard verification.
- Define authentication, authorization, encrypted storage, retention, deletion, and recovery behavior.
- Minimize and justify Chrome permissions.
- Add privacy-safe observability, rate limits, abuse controls, and cost limits.
- Prepare privacy policy, consent guidance, data inventory, and Chrome Web Store materials.
- Run dependency, supply-chain, extension, and AI-security reviews.

### Phase 09 — measured private beta

**Status:** planned

- Define participant profile, consent, session length, and success criteria.
- Track session reliability and latency without logging private content by default.
- Collect structured feedback on distraction, comprehension, suggestion usefulness, and learning value.
- Revisit architecture and roadmap using measured results.
- Document the path from free Agora credits to sustainable unit economics.

## P2 — deferred expansion

**Status:** deferred until the private beta validates the core loop

- multiple source and translation language pairs;
- speaker diarization and participant-specific notes;
- native Zoom, Microsoft Teams, and desktop clients;
- spaced repetition, progress history, and pronunciation practice;
- calendar, notes, CRM, task, and knowledge-base connectors;
- team context libraries and fine-grained knowledge access;
- enterprise administration, audit, data residency, and retention policies;
- provider abstraction and regional routing;
- billing, subscriptions, and usage budgets;
- optional exports and user-controlled interoperability.

## Research questions

- Does automatic suggestion timing help more than it distracts?
- Which transcript and translation latencies remain useful in real conversation?
- Can a silent Agora configuration meet cost and reliability goals?
- How should meeting participants be informed across target markets?
- What minimum context produces useful answers without increasing setup burden?
- Does the post-meeting learning loop improve recall over repeated use?
- Which data can be discarded immediately while preserving user value?

Research results should become evidence in an ADR, product decision, or measured beta report before changing the roadmap.
