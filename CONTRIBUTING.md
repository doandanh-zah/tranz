# Contributing to Tranz

Tranz is currently a private, phase-gated project. Contributions must stay within an explicitly approved phase and follow the repository sources of truth.

## Start here

Read these files before making changes:

1. [README.md](README.md)
2. [AGENTS.md](AGENTS.md)
3. [PRODUCT.md](PRODUCT.md)
4. [ARCHITECTURE.md](ARCHITECTURE.md)
5. [DESIGN.md](DESIGN.md) for interface work
6. [WORKFLOW.md](WORKFLOW.md)
7. [TODOS.md](TODOS.md)
8. relevant records under `docs/decisions/`

Read [BACKLOG.md](BACKLOG.md) for context only. A backlog item is not permission to implement it.

## Current repository setup

The repository contains a TypeScript npm workspace: the Chrome extension (`apps/extension`), the local backend (`apps/server`), shared contracts (`packages/shared`), tests (`tests`) and verification scripts (`scripts`).

Prerequisites: Git, GitHub CLI, Node.js 22.12+, npm and Chrome 116+.

```bash
npm ci
npm run setup     # private .env with generated ACCESS_TOKEN and DATA_KEY; never commit it
npm run verify    # lint, typecheck, unit/integration tests, build
npm run dev       # backend on 127.0.0.1:4318 (reads .env)
```

Browser checks: `npm run verify:ui` and `npm run verify:capture` load the built extension in Playwright Chromium (set `TRANZ_CHROMIUM` to a Chrome for Testing binary if the bundled one is missing). `npm run eval:grounding` calls the real configured AI provider with synthetic cases and costs a few requests.

The ignored local `agora-baseline/` directory is reference evidence from Phase 00. Do not modify, copy wholesale, track, or push it without explicit approval.

## Choose approved work

- Confirm the active phase in [TODOS.md](TODOS.md).
- Confirm the requested change belongs to that phase.
- Ask before expanding scope or resolving a product or architecture ambiguity.
- Do not start planned phases or deferred backlog items automatically.

## Create a branch

Update your view of the agreed base, then create a focused branch:

```bash
git status --short --branch
git switch -c type/short-description
```

Use branch prefixes such as `docs/`, `feat/`, `fix/`, `test/`, `chore/`, or `refactor/`.

Never discard unrelated work, rewrite shared history, or force-push `main`.

## Make changes

- Keep changes small enough to review confidently.
- Preserve product, architecture, UX, privacy, and phase boundaries.
- Add explicit loading, empty, error, permission, disconnected, and recovery behavior where relevant.
- Keep privileged credentials on the server.
- Use synthetic, non-sensitive fixtures rather than real meeting content.
- Update documentation in the same change when behavior or decisions change.

## Verify changes

Run checks proportionate to the change. For documentation-only changes, verify at least:

```bash
git diff --check
git status --short
```

Also check local Markdown links, terminology, accidental secrets, and tracked files. For code changes run `npm run verify`; for UI, capture or lifecycle changes also run the browser scripts above and state which live checks (real Agora, Google Meet, provider) were not performed.

Do not claim a check passed unless it was actually run against the current change.

## Commit changes

Use a concise conventional commit:

```bash
git add <intended-files>
git commit -m "docs: describe the change"
```

Review the staged diff before committing. Never stage `.env` files, credentials, private transcripts, recordings, generated meeting data, or the ignored Agora baseline.

## Open a pull request

Follow the pull-request contract in [WORKFLOW.md](WORKFLOW.md). A PR should identify the phase, summarize the change, state exclusions, list verification evidence, disclose limitations, and describe privacy or permission impact.

Stop for review after opening the PR. Do not merge or begin the next phase without approval.

## Secret and privacy rules

- Never commit Agora App Certificates, API keys, tokens, or production identifiers.
- Treat transcripts, context profiles, suggestions, recordings, and learning material as sensitive user data.
- Redact sensitive values from terminal output, logs, screenshots, issues, and PR descriptions.
- Raw audio is not stored by default.
- Transcript retention must remain opt-in and deletable.
- Use the smallest browser permission set that can support the approved feature.

If a secret is exposed, stop, avoid repeating it, rotate it through the provider, and record only the remediation outcome.

## Documentation synchronization

Use the ownership rules in [AGENTS.md](AGENTS.md). At minimum:

- scope changes update `PRODUCT.md`;
- runtime or trust-boundary changes update `ARCHITECTURE.md` and an ADR when material;
- UX behavior changes update `DESIGN.md`;
- process changes update `WORKFLOW.md` and this guide;
- current approved work updates `TODOS.md`;
- deferred work updates `BACKLOG.md`;
- completed notable changes update `CHANGELOG.md`.

## Definition of done

A contribution is done when:

- it satisfies the approved acceptance criteria;
- the diff is focused and free of unrelated work;
- required checks pass and evidence is reported honestly;
- privacy and security boundaries remain intact;
- documentation matches the changed behavior;
- the branch is pushed and the PR is ready for user review;
- no work from the next phase has begun.
