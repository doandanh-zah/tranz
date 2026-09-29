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

At version `0.1.0`, the tracked repository contains product and engineering documentation only. Application scaffolding, package-manager commands, and local runtime setup will be defined in Phase 02.

Current prerequisites:

- Git;
- GitHub CLI for repository and pull-request operations;
- a Markdown-capable editor.

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

Also check local Markdown links, terminology, accidental secrets, and tracked files. Application-specific lint, typecheck, tests, builds, extension loading, browser behavior, audio behavior, and live Agora checks will be added when those components exist.

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
