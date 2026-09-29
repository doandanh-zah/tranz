# ADR 0002: Local MVP implementation boundaries

- Status: implementation decision under the user's 2026-09-29 end-to-end MVP authorization; runtime validation pending.
- Stack: TypeScript, React/Vite MV3 extension, Node 22 Fastify loopback backend, npm lockfile.
- Authentication: local single-owner random bearer token, never browser-shipped provider credentials. Bind to 127.0.0.1; exact extension origin paired in server configuration. This is not a hosted multi-user identity system.
- Storage: AES-256-GCM encrypted local JSON with atomic writes, mode 0600, single backend process. Profiles persist; transcript and artifacts persist only for opt-in sessions. No audio files. No cloud database required for local review. Replace with transactional storage before multi-process deployment.
- AI: user-approved OpenAI-compatible adapter configured locally; no fallback fabricated output when configuration or providers fail.
- Capture: Chrome 116+ service-worker tabCapture stream ID consumed by offscreen document. Playback routed to speakers; microphone never locally played. Mixed source audio has no participant identity claim.
- Silent client: never subscribe/play agent media. This isolates agent TTS from meeting output but does not claim elimination of provider TTS processing/cost. Validate live before approval.
- Review: stacked phase PRs; none merged. Phase 09 and public release excluded.

Sources: [Chrome capture](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture), [Agora agent SDK](https://github.com/AgoraIO-Conversational-AI/agent-server-sdk-ts), [Agora join contract](https://docs-md.agora.io/en/conversational-ai/rest-api/agent/join.md).

Revisit: hosted beta, multiple users/processes, real-media evidence of dropped speech, provider retention incompatibility, or unacceptable cost.

## Phase 07 addendum — notes, retention and deletion (2026-09-29)

- Stopping a session never waits for the AI provider. If AI is configured and a final transcript exists, one notes job starts in the background; concurrent `finalize` calls are serialised per session and return the same artifact.
- Temporary (non-retained) sessions keep transcript, translations, snapshot and notes in process memory only; the encrypted file stores cleanup metadata with content blanked. They are dropped one hour after the last activity once stopped, or on restart.
- `Keep this session` sets `retain` and persists the content encrypted. Nothing is recoverable after a restart for a temporary session.
- Deletion removes the session record including snapshot, transcript, translations and notes. Late provider completions check session identity and are discarded, so deleted data is not recreated.
- A job interrupted by a restart is restored as a retryable error (or `ready` if its artifact was already saved). Shutdown does not start new notes jobs.
- Deletion is local only; it cannot recall data already processed by Agora or the AI provider.

## Phase 08 addendum — runtime hardening (2026-09-29)

- Pausing no longer ends the session: the backend accepts transcript lines while `paused` or `reconnecting`, and the runtime keeps transient upload/heartbeat failures for retry instead of stopping. It stops only when the backend says the session is over, or after about 60 seconds of failed heartbeats.
- RTC `RECONNECTING` and RTM `CONNECTING`/`SUSPENDED`/`DISCONNECTED` gate outgoing audio (`reconnecting`); recovery resumes automatically unless the user paused. RTC `DISCONNECTED` and RTM `FAILED` stop the session. Previously a successful RTC reconnect stopped the session and RTM state was not observed.
- Only ASR module errors from the agent stop the session. LLM/TTS errors from the passive agent are ignored because Tranz does not use its replies.
- Every stop records an `endedReason` (first reason wins) that the panel explains. The watchdog records `inactive` (no heartbeat for 75 s) or `time-limit` (one hour).
- The worker closes the offscreen document after every stop, which guarantees capture tracks are released even if the runtime misbehaves. It returns specific, user-written error messages.
- If an agent start request fails, the backend lists agents in the session channel and stops any still running (best effort, same app-credential auth the SDK uses for `stopAgent`). Not yet exercised against live Agora.
- AI provider errors are classified (key/model 503, rate limit 429, timeout 504, provider or format failure 502) without echoing provider bodies or keys.
- Stored sessions are capped at 500 and transcript lines at 3,000 per session, with the limit reported.

Revisit additionally if live Agora shows transcript loss while the agent LLM/TTS runs, if `agents.list` auth differs from `stopAgent`, or if the offscreen bundle size (about 2.9 MB, loaded locally only when a session starts) measurably delays start.
