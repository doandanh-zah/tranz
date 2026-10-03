# Architecture

## Status model

This document deliberately separates three levels of certainty:

- **Validated:** observed in a real working baseline.
- **Implemented and tested:** built in this repository and covered by automated or browser checks. Any bounded live evidence is called out separately; this label alone is not a production claim.
- **Proposed:** the MVP design direction, still requiring implementation or verification.
- **Long-term:** a direction that must not constrain the MVP prematurely.

Agents and contributors must preserve these labels when updating the architecture.

## Validated baseline

The official Agora Conversational AI Next.js quickstart was validated end to end on 2026-09-28.

Validated capabilities:

- a browser client can join Agora RTC and publish microphone audio;
- an Agora Conversational AI agent can join the same channel;
- RTM delivered live transcripts; state, metric, and error delivery are SDK contracts not separately evidenced by the Phase 00 record;
- the managed STT -> LLM -> TTS pipeline works without separate vendor keys;
- server routes can mint combined RTC and RTM-capable tokens;
- agent start and stop can be controlled by a server runtime;
- the official sample passes lint, typecheck, API contract verification, and production build.

Validated limitations and observations:

- an accepted start request does not prove the agent has joined the channel;
- duplicate stop requests can conflict while the agent is already shutting down;
- the successful baseline used microphone audio, not meeting-tab audio;
- the baseline speaks through TTS, while the Tranz MVP is intended to remain silent;
- browser runtime differences can affect RTC behavior.

See [ADR 0001](docs/decisions/0001-agora-convoai-baseline.md) for evidence.

## Implemented local MVP (updated 2026-10-02)

Status: **implemented and tested with bounded live validation**, not a completed MVP. Decisions are recorded in [ADR 0002](docs/decisions/0002-local-mvp.md); evidence in [docs/evidence](docs/evidence/).

```text
Google Meet tab ──tabCapture stream ID──► service worker ──► offscreen document
                                                               │ Capture: tab + mic mix,
                                                               │ tab re-routed to speakers,
                                                               │ gain gates for pause/mute
                                                               ▼
                                          Runtime: Agora RTC publish (never subscribes),
                                          RTM transcript → segments (revisioned)
                                                               │ HTTP + bearer token
Side panel (React) ◄── 750 ms polling ──► Fastify backend on 127.0.0.1:4318
        │                                 ├─ persists bounded, revision-matched local translations
        └─ Chrome Translator API EN→VI    │
           (on-device fast path)          │
                                          ├─ sessions: lifecycle, heartbeat watchdog, end reasons
                                          ├─ agora: scoped RTC/RTM tokens (10 min), agent start/stop/cleanup
                                          ├─ translation fallback / assistance / notes via ChatGPT plan (codex app-server) or an OpenAI-compatible API
                                          └─ encrypted local JSON store (AES-256-GCM, single process)
```

| Area | Implemented | Evidence level | Not yet proven |
| --- | --- | --- | --- |
| Pairing and auth | Random local bearer token handed automatically to the configured extension (`/api/pair`), rate limit, loopback bind | Automated tests; unpacked build; real Cốc Cốc side panel | Hosted identity (out of scope) |
| Capture | Tab + mic mix, pause/mute gates, stop releases tracks, offscreen closed after stop | Real Chromium tab capture with synthetic tone/mic; real Meet tab reported active capture and microphone-fed speech reached Agora | Incoming Meet-tab participant audio, audible playback, device changes |
| Agora lifecycle | Server-owned channel/UID, 10-minute tokens with renewal, wait for agent join, RTM channel subscription, RTC/RTM degraded gate, watchdog, orphan cleanup after lost start | Tests; **live Agora synthetic sessions**, including one started from the real Meet side panel: join, transcript, stop, cleanup | Real network loss and recovery; incoming Meet-tab audio; the agent's LLM still runs and is billed |
| AI provider | ChatGPT plan through the official `codex app-server` (OAuth sign-in, tools disabled, output schema) or an API key; see ADR 0003 | Tests with a Codex stand-in; **live eval 6/6**; real Meet-side-panel translation and grounded assistance | Usefulness and latency in a real multi-person meeting |
| Translation | Final lines only; shared sequential Chrome EN→VI translator; bounded revision-checked persistence; ChatGPT/API fallback; stale results rejected | Tests; mock fast/fallback paths in unpacked browser; real Cốc Cốc pack + five synthetic sentences (10.4–34 ms after download); earlier real-plan Meet run | Quality/latency in a real multi-person meeting; browser pack availability beyond tested builds |
| Assistance | Reply, catch-up, composer; evidence filtered; clarification fallback | Tests incl. prompt injection as data; mock in browser; real plan in eval and Meet-side-panel run | Grounding accuracy beyond synthetic cases |
| Notes and retention | Background notes after stop, keep/delete, restart recovery | Tests; mock in browser; real provider artifact plus save/delete cleanup; ChatGPT auto-finalize regression test | Quality in a real meeting; chunking over 60,000 characters |

Trust boundaries in the implementation: the App Certificate and any API key exist only in the backend `.env`; the ChatGPT login is held by the Codex runtime in `.tranz-data/codex-home`, and Codex runs with every tool disabled; the browser receives a pairing token (kept in `chrome.storage.session`) and 10-minute Agora tokens. EN→VI translation stays on-device when Chrome's Translator API is ready; transcript/profile text reaches the configured AI provider for assistance and notes, and also for translation only when the local fast path is unavailable or fails. Transcript text also reaches Agora's managed pipeline; raw audio is never written anywhere by Tranz.

## Proposed MVP system

The diagram and responsibilities below are the original design direction. Where the implemented local MVP above differs (no hosted identity, local encrypted file instead of a database, polling instead of push), the implementation section is authoritative for current behaviour.

```text
┌──────────────────────── Chrome ────────────────────────┐
│                                                        │
│  Meeting tab ── tab audio ─┐                           │
│                            ├─ Capture runtime          │
│  User microphone ──────────┘  (offscreen context)     │
│                                      │                 │
│  Side panel                          │                 │
│  ├─ context selection                │                 │
│  ├─ transcript + translation         │                 │
│  ├─ reply suggestions                │                 │
│  └─ session controls                 │                 │
└───────────────────────┬──────────────┴─────────────────┘
                        │ scoped session/token requests
                        ▼
┌──────────────────── Tranz backend ─────────────────────┐
│  authentication and authorization                     │
│  session lifecycle and idempotency                     │
│  Agora token and agent orchestration                   │
│  context grounding and suggestion requests             │
│  translation and post-meeting processing               │
│  retention and deletion policy enforcement             │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
                ▼                       ▼
┌──────── Agora real-time plane ─────┐  ┌── Product data ─┐
│ RTC audio and agent membership     │  │ context profiles │
│ RTM transcript/state/metrics       │  │ session metadata │
│ Conversational AI processing       │  │ opt-in transcript│
└────────────────────────────────────┘  │ learning items   │
                                        └──────────────────┘
```

This diagram is a proposed boundary map, not a locked deployment topology.

## Proposed component responsibilities

### Chrome extension

The extension owns the user-facing meeting lifecycle.

Expected components:

- **Side panel:** persistent UI for setup, transcript, translation, suggestions, and session status.
- **Extension service worker:** coordinates permissions, tab selection, session commands, and extension lifecycle events.
- **Offscreen capture context:** owns DOM and media APIs required for long-running tab and microphone capture.
- **Local session store:** holds ephemeral UI state that can survive side-panel remounts without storing sensitive history permanently.
- **Optional content integration:** limited, platform-specific UI integration only when it provides clear value and can use narrow permissions.

The extension must not contain Agora App Certificates, provider keys, or long-lived application secrets.

### Tranz backend

The backend is the security and orchestration boundary.

Responsibilities:

- authenticate the Tranz user;
- authorize access to context profiles and sessions;
- create scoped, expiring Agora credentials;
- start, observe, renew, and stop agent sessions;
- make start and stop operations idempotent;
- build grounding context from user-approved data;
- request translation and reply suggestions;
- schedule post-meeting processing exactly once;
- enforce retention and deletion policies;
- emit privacy-safe operational telemetry.

The exact framework and deployment platform are not selected. TypeScript is preferred for the first implementation to share contracts with the extension and align with the validated Node.js baseline.

### Agora integration

Agora is the preferred real-time AI foundation while the open MVP hypotheses are tested.

Required boundaries:

- RTC carries published audio and channel membership.
- RTM carries transcript, agent state, metrics, and errors.
- server-side code creates agent sessions and credentials.
- runtime join and event evidence determine readiness.
- provider configuration is isolated behind product-owned session orchestration.

The MVP must validate a silent configuration or another safe pattern that prevents agent TTS from being injected into the user's meeting.

### Product data store

The storage technology is intentionally undecided. The logical responsibilities are:

- user identity reference;
- context profiles and versioned context snapshots;
- session metadata and lifecycle state;
- opt-in transcript segments;
- derived summaries, actions, vocabulary, and improved replies;
- deletion markers or jobs when immediate deletion spans multiple systems;
- consent and retention preferences.

Raw audio is excluded from default storage.

### Post-meeting processor

The first implementation may run inside the backend. It should be separable when volume or reliability requires a queue.

Responsibilities:

- finalize transcript segments;
- deduplicate lifecycle events;
- produce summary, decisions, actions, vocabulary, and improved replies;
- write derived artifacts only if retention settings allow it;
- expose progress and recoverable failures to the extension.

## Core runtime flows

### Pre-meeting flow

1. The user authenticates and selects or creates a context profile.
2. The extension displays the exact context snapshot that will be used.
3. The user selects a supported meeting tab and grants required permissions.
4. The backend creates an authorized session record.
5. No capture starts until the user explicitly confirms.

### Live-session flow

1. The extension starts tab and microphone capture.
2. The backend provides short-lived session credentials.
3. Audio is published through the validated or newly proven real-time path.
4. The extension waits for runtime readiness, not only an accepted start request.
5. Transcript events are normalized into partial and final segments.
6. Translation remains linked to its source segment.
7. Likely questions or explicit user actions request grounded suggestions.
8. Suggestions include provenance or uncertainty state where useful.
9. Connection, permission, and agent errors update visible recoverable state.

### End-session flow

1. The user presses Stop, the tab closes, or the session reaches a terminal failure.
2. Capture stops locally immediately.
3. One idempotent server operation stops the remote session.
4. The backend deduplicates duplicate leave or disconnect events.
5. Post-meeting processing begins only once.
6. The user sees processing, ready, partial-failure, or deleted state.
7. Data is retained or discarded according to the session's explicit policy.

## Conceptual data model

The following entities are proposed and intentionally storage-agnostic:

- `User`
- `ContextProfile`
- `ContextSnapshot`
- `MeetingSession`
- `TranscriptSegment`
- `TranslationSegment`
- `Suggestion`
- `MeetingArtifact`
- `LearningItem`
- `RetentionPolicy`
- `LifecycleEvent`

Important relationships:

- a session references an immutable context snapshot rather than a mutable profile;
- translations and suggestions reference source transcript segments;
- derived artifacts record the session and generation version;
- deletion covers both source and derived data;
- lifecycle events use stable idempotency keys.

## Trust boundaries

### Untrusted browser boundary

The extension and meeting page are untrusted clients.

- Never deliver App Certificates or provider keys to the browser.
- Validate all session IDs, user IDs, and requested operations server-side.
- Treat transcript and RTM payloads as untrusted input.
- Use narrow Chrome permissions and request optional permissions at the moment of use.

### Tranz backend boundary

- Own secret storage and token issuance.
- Enforce tenant and session ownership.
- Apply rate limits to token, start, suggestion, and stop operations.
- Redact transcripts and credentials from operational logs.
- Keep production, preview, and development credentials separate.

### External provider boundary

- Document which meeting data each provider receives.
- Keep provider use limited to explicit product features.
- Make retention, training, and subprocessor behavior visible in policy documentation.
- Support provider replacement behind internal contracts where practical.

## Reliability requirements

- Start and stop are idempotent.
- Duplicate and out-of-order events are expected.
- Partial transcripts can be replaced by final segments without duplication.
- Reconnect does not create a second active agent for the same logical session.
- Tab close, browser shutdown, and lost connectivity have cleanup paths.
- Post-processing is retryable and exactly-once from the user's perspective.
- Stale responses cannot overwrite a newer session or context selection.
- Visible UI distinguishes degraded operation from confirmed success.

## Observability requirements

Operational signals should include:

- session-start attempts and outcomes;
- RTC join time;
- first partial and first final transcript latency;
- translation latency;
- suggestion latency;
- reconnect and permission failures;
- agent start and stop outcomes;
- duplicate lifecycle events;
- post-meeting processing outcomes.

Telemetry must avoid raw audio, transcript text, context content, or credentials by default.

## Deployment environments

At minimum, the architecture should support:

- **local:** development credentials and unpacked extension;
- **preview:** isolated non-production credentials and test data;
- **production:** rotated secrets, restricted origins, monitoring, deletion workflows, and policy documentation.

Environment-specific URLs and credentials must be injected at build or runtime without being committed.

## Long-term architecture direction

Long-term evolution may introduce:

- a dedicated real-time session service;
- asynchronous job queues for post-meeting processing;
- region-aware data and media routing;
- organization-level identity and knowledge connectors;
- policy and audit services for enterprise tenants;
- pluggable STT, translation, LLM, and TTS providers;
- a learning service for spaced repetition and progress history;
- native desktop capture clients;
- analytics based on privacy-safe aggregates;
- per-tenant encryption and retention controls.

These are directions, not current commitments. The MVP should remain a modular monolith unless measured needs justify separation.

## Open technical decisions

Partly answered by the implementation: the MVP mixes tab and microphone audio (no labelling); translates final text only; triggers suggestions by user action; stores data in an encrypted single-process file; pairs the extension with a local token; and reattaches the side panel to the running offscreen runtime. Each remains open for the hosted product.

- Can tab audio and microphone audio be published separately and labeled reliably?
- Does the preferred Agora path support silent operation without wasting TTS work?
- Should translation run on partial text, final text, or both?
- What triggers suggestions: automatic question detection, user action, or hybrid?
- Which storage technology best supports deletion and encrypted transcript retention?
- Which authentication method fits an extension and future web account portal?
- How should the extension recover after its service worker or side panel is suspended?
- What is the minimum permission set for Google Meet validation?
- How is session ownership proven during token renewal and remote stop?

Each material decision should be recorded in `docs/decisions/` with evidence and revisit conditions.
