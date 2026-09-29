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
