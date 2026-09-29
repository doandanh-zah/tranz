# ADR 0003: ChatGPT subscription as the default AI provider

- Status: accepted by the user's request on 2026-09-29 ("use ChatGPT OAuth like OpenClaw, not an API key"); implemented and verified live with synthetic data.
- Supersedes: the "OpenAI-compatible API key" choice in ADR 0002 as the *default*; the API-key adapter remains available with `AI_PROVIDER=openai`.

## Context

The user pays for a ChatGPT plan and does not want separate API billing. ChatGPT plans include no API key. OpenAI supports using the plan in third-party tools through "Sign in with ChatGPT" for Codex; OpenClaw documents this and drives the official `codex app-server` runtime with that login ([OpenClaw OAuth](https://docs.openclaw.ai/concepts/oauth), [OpenClaw OpenAI provider](https://docs.openclaw.ai/providers/openai)).

## Decision

`AI_PROVIDER=chatgpt` (default) makes the backend start the official Codex CLI as `codex app-server` and speak its JSON-RPC protocol (field names from `codex app-server generate-ts`, codex-cli 0.155.1):

- **Sign-in:** `account/login/start {type: "chatgpt"}` returns an OpenAI authorization URL (PKCE, `redirect_uri=http://localhost:1455/auth/callback`); the panel opens it in a new tab and the person signs in on OpenAI's page. Codex stores the tokens in its own home. Tranz never sees the password or tokens. The default Codex home is `.tranz-data/codex-home`, separate from the person's own Codex (`CODEX_HOME` overrides it).
- **Requests:** one ephemeral thread per request with Tranz's own `baseInstructions`, `sandbox: read-only`, `approvalPolicy: never`, an empty working directory, `effort: low`, and `outputSchema` generated from the route's zod schema; the final `agentMessage` is parsed and validated.
- **Lock-down:** shell, unified exec, apps, plugins, browser, computer use, memories, image tools, skills, hooks, goals and sleep are disabled; web search is disabled; MCP servers are cleared. Every server-initiated request (approvals, tool calls, user input) is refused. If a turn contains any item other than user/agent messages, reasoning, plan or compaction, the answer is discarded.
- **Batching:** automatic translation sends up to 8 final lines per request (`translate-batch`) so a slower provider does not fall behind.

## Evidence (2026-09-29, ChatGPT Plus)

- Spike: JSON output schema honoured; a prompt-injection request to run shell commands produced no tool items.
- `npm run eval:grounding` with the real plan: 6/6 heuristic checks, 5.1–13.4 s per request.
- Model comparison for translation: default about 7–9 s; `gpt-6-luna` about 7–8 s; `gpt-5.6-luna` about 13–15 s. No lighter model was faster.
- Sign-in start with a fresh Tranz-owned home returned `https://auth.openai.com/oauth/authorize` with PKCE and the localhost:1455 callback. Completing sign-in requires the person.
- Automated tests use a synthetic `codex` stand-in (`tests/fixtures/fake-codex.mjs`).

## Consequences

- Latency: 5–15 s per request, above the 3 s translation target in PRODUCT.md. Translations arrive late and in batches; suggestions and notes are usable but not instant.
- Usage counts toward the plan's Codex limits; exhaustion shows as a retryable error.
- Requires the Codex CLI on the same machine as the backend; the OAuth callback uses port 1455.
- Meeting text and context reach OpenAI under the person's ChatGPT account terms.
- The Codex protocol is marked experimental; field names are pinned to the generated types and may need updates when the CLI changes.

## Revisit

If latency proves unusable in real meetings, if OpenAI changes plan use in third-party tools, or if the app-server protocol changes incompatibly.
