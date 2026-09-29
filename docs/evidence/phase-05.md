# Phase 05 — linked translation

- OpenAI-compatible server-only adapter, JSON schema validation, 25-second timeout, maximum 3 concurrent provider calls, per-session request limit.
- Translate only final English segments; store source revision, deduplicate concurrent work, reject stale completions and deleted sessions.
- Missing credentials return a real unavailable state, never sample translations.
- `npm run verify` passed including delayed-translation revision protection.
- Live translation quality/latency is pending local AI key configuration. No real meeting content used in fixtures.
