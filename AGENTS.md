# Agent Operating Guide

This file defines the mandatory working contract for every coding agent operating in the Tranz repository.

## Read order

Before changing the repository, read the following in order:

1. `README.md`
2. `AGENTS.md`
3. `PRODUCT.md`
4. `ARCHITECTURE.md`
5. `DESIGN.md` for interface work
6. `WORKFLOW.md`
7. `TODOS.md`
8. `BACKLOG.md` only for context, never as automatic authorization
9. relevant files under `docs/decisions/`

Also inspect the worktree, current branch, recent commits, and repository-specific instructions before editing.

## Source-of-truth boundaries

- `PRODUCT.md` owns product intent, MVP boundaries, and long-term product goals.
- `ARCHITECTURE.md` owns system boundaries, runtime flows, trust boundaries, and technical hypotheses.
- `DESIGN.md` owns UX behavior and interface principles.
- `WORKFLOW.md` owns delivery phases and Git operations.
- `TODOS.md` owns work authorized for the current phase.
- `BACKLOG.md` contains deferred work and does not grant permission to implement it.
- ADRs record decisions and evidence. New architecture decisions require an ADR or an update to an existing one.

When documents disagree, stop and surface the conflict. Do not silently choose the most convenient interpretation.

## Phase gate

Only work inside the phase explicitly approved by the user.

- Do not begin the next phase automatically.
- Do not pull items from `BACKLOG.md` because the current phase is complete.
- Do not bundle unrelated fixes or polish into the active phase.
- At the end of a phase, report evidence and stop for review.
- If an assumption would materially change scope, architecture, privacy, cost, or product behavior, ask before proceeding.

## Current repository state

- Version `0.1.0` is a product-definition and technical-baseline milestone.
- The Agora Conversational AI baseline is proven end to end.
- Tranz application code has not been scaffolded.
- The current product architecture includes validated facts, proposed MVP boundaries, and long-term hypotheses. Keep these labels distinct.

## Agora baseline boundary

The local `agora-baseline/` directory contains the official Agora quickstart used for Phase 00 validation.

- It is intentionally ignored by the product repository.
- Do not add, move, delete, rewrite, or commit it unless the user explicitly approves that exact action.
- Do not copy the sample wholesale into Tranz.
- Reuse only patterns that have been understood and justified for the product.
- Use official Agora documentation and verified SDK contracts for integration details; do not invent API fields.
- Treat an accepted agent-start request as intermediate state. Runtime join and usable transcript evidence are required before claiming success.

## Engineering rules

- Preserve user changes and unrelated dirty work.
- Prefer small, reviewable changes.
- Add loading, empty, error, disconnected, permission-denied, and recovery states to every relevant user flow.
- Make session start and stop operations idempotent.
- Protect against stale responses and duplicate lifecycle events.
- Keep privileged credentials and App Certificates on the server.
- Use scoped, expiring browser tokens.
- Do not store raw audio by default.
- Never use real meeting content as fixtures or test data.
- Do not describe a proposed component, provider, database, or latency target as validated unless evidence exists.

## Git rules

- `main` must remain reviewable and releasable.
- Work on a branch named `type/short-description`.
- Use conventional commits with lowercase, present-tense descriptions.
- Keep one phase per pull request.
- Do not force-push `main`.
- Do not bypass hooks with `--no-verify`.
- Do not merge a phase before the user reviews its evidence.
- Never commit `.env` files, credentials, private transcripts, recordings, or generated meeting data.

Allowed commit prefixes:

- `feat:`
- `fix:`
- `docs:`
- `test:`
- `chore:`
- `refactor:`

## Verification rules

Verification must match the risk of the change.

- Documentation changes: links, Markdown structure, terminology consistency, secret scan, and clean Git diff.
- Extension changes: lint, typecheck, build, unpacked-extension load, permissions, and relevant viewport checks.
- Audio changes: tab audio, microphone, playback preservation, start/stop, permission denial, tab close, and reconnect.
- Agora changes: token contract, RTC join, RTM events, transcript flow, duplicate stop, cleanup, and live-session evidence.
- Privacy changes: data inventory, retention behavior, deletion, permission scope, logs, and secret handling.

Never claim browser, audio, accessibility, latency, or production verification that was not actually performed.

## Documentation synchronization

Update documents in the same change when behavior changes:

- product scope or requirements -> `PRODUCT.md` and `README.md` if the entry-point summary changes;
- system boundary or runtime flow -> `ARCHITECTURE.md` and the relevant ADR;
- UX behavior -> `DESIGN.md`;
- delivery or Git policy -> `WORKFLOW.md` and `CONTRIBUTING.md`;
- active phase tasks -> `TODOS.md`;
- deferred work -> `BACKLOG.md`;
- completed user-visible changes -> `CHANGELOG.md` and `VERSION` when applicable.

## Required completion report

Every implementation handoff must state:

- what changed;
- what did not change;
- files added or modified;
- verification commands and results;
- browser or live-runtime evidence, when relevant;
- known limitations and open risks;
- Git branch and commit status;
- whether the phase gate is complete or still blocked.

## Prohibited shortcuts

- Do not disable security, Strict Mode, permission checks, or failing tests to obtain a green result.
- Do not expose credentials in commands, logs, screenshots, documentation, or chat.
- Do not replace an official startup command with an undocumented workaround during a baseline check.
- Do not reset, clean, discard, or rewrite user work without explicit approval.
- Do not create fake transcripts, meetings, notifications, users, or success states and present them as real behavior.
