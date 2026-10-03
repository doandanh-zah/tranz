# ADR 0004: On-device Translator API for the live translation fast path

- Status: accepted by the user's request on 2026-10-03; implemented and verified with synthetic text.
- Complements: [ADR 0003](0003-chatgpt-subscription-provider.md). ChatGPT remains the assistance, notes and translation-fallback provider.

## Context

Real ChatGPT-plan requests take roughly 5–15 seconds because each request starts a Codex thread and turn, waits for model completion and validates structured output. Batching prevents backlog growth but cannot meet the product's three-second live-translation target. Enabling a billable cloud translation API would require choosing and modifying a Google Cloud project whose ownership and cost boundary were not established for Tranz.

Chrome 138 introduced the built-in Translator API for extension documents. It supports English and Vietnamese, downloads a language pack when needed, and performs subsequent translation on the device.

## Decision

- The side panel detects `Translator`, checks EN→VI availability and warms one shared translator when the panel opens.
- The first language-pack download is visible with progress and never blocks meeting start.
- Final transcript lines are translated sequentially on the device. Partial text remains untranslated.
- The authenticated backend accepts at most eight translated results at once, bounds output length, and persists only final segments whose id and revision still match. A stale browser result is ignored.
- When the API is absent, its language pair is unavailable, or local translation fails or exceeds ten seconds, the existing bounded ChatGPT/API-provider batch route is the fallback.
- The panel polls transcript state every 750 ms instead of 1.5 seconds. Push delivery remains deferred.
- ChatGPT continues to handle grounded replies, catch-up, the Vietnamese-to-English composer and post-meeting notes.
- No Google Cloud service was enabled, no cloud project was changed, and no new credential or billing path was created.

## Evidence (2026-10-03)

An isolated disposable profile in Cốc Cốc 152 reported EN→VI as `downloadable`. Creating the translator downloaded the pack in 8,725.5 ms. Five synthetic sentences then translated in 34.0, 12.4, 12.5, 10.4 and 13.1 ms. No real meeting content was used.

Automated coverage proves one download/session, serialized translation, revision protection, output bounds, no AI-provider call on the fast path, and explicit provider fallback. The unpacked extension verification passed 45/45 checks at 320–600 px.

## Consequences

- After the one-time pack download, translation compute stays on the user's device and does not consume Codex limits.
- The panel must be open to execute the browser translator. If it closes, transcript capture continues; untranslated final lines catch up when it reopens.
- Older/unsupported Chromium builds still work but use the slower configured AI provider for translation. The UI discloses the active mode.
- Language quality and latency in a real multi-person meeting remain unproven. The measured values above cover only synthetic sentences in one installed browser.
- Only EN→VI is in scope. Additional language pairs remain backlog work.

## Revisit

Revisit if the browser removes or materially changes the API, the on-device model quality is inadequate in real meetings, pack download is unreliable, or another local engine provides better measured accuracy without expanding the privacy or installation burden.
