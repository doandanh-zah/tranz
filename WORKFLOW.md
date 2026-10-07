# Delivery and Git Workflow

## Operating model

Tranz uses a phase-gated workflow. Each phase has a bounded objective, explicit acceptance criteria, one review branch, and a stop point.

Finishing a phase does not authorize the next one. Work resumes only after the user reviews the evidence and explicitly approves the next scope.

## Phase lifecycle

1. **Propose:** define the objective, boundaries, risks, and acceptance criteria.
2. **Approve:** obtain explicit user approval for that exact phase.
3. **Branch:** create one branch from the agreed base.
4. **Implement:** change only what the phase requires.
5. **Verify:** run proportionate checks and preserve evidence.
6. **Document:** synchronize source-of-truth documents and decisions.
7. **Pull request:** open one focused PR with results and known limitations.
8. **Review:** stop for user review and address requested changes on the same branch.
9. **Merge:** merge only after approval and passing checks.
10. **Close:** update the phase status and wait for the next instruction.

## Delivery roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 00 | Validate the official Agora Conversational AI baseline | Complete |
| 01 | Establish product, architecture, design, agent, and Git documentation | PR #1 open; synchronised in Phase 08 |
| 02 | Scaffold the Chrome extension and backend foundation | Implemented; PR #2 open |
| 03 | Validate meeting-tab and microphone audio capture | Implemented; PR #3 open; Chromium synthetic capture passed; real Meet tab capture activated and mic path passed; incoming tab audio/playback pending |
| 04 | Integrate Agora real-time session and transcript lifecycle | Implemented; PR #4 open; live synthetic Agora join/transcript/stop/cleanup passed |
| 05 | Add linked English-to-Vietnamese translation | Implemented; PR #5 open; real ChatGPT translation passed in eval and Meet side panel |
| 06 | Add context-grounded reply suggestions | Implemented; PR #6 open; real ChatGPT synthetic eval and Meet-side-panel actions passed |
| 07 | Add post-meeting learning artifacts | Implemented; PR #7 open; real-provider synthetic artifact plus local save/delete passed |
| 08 | Harden privacy, accessibility, reliability, and Chrome Web Store readiness | Implemented; PR #8 open; store readiness out of scope |
| 08R | Harden and verify the integrated Google Meet flow | PR #12 open on `fix/google-meet-e2e`; automatic pairing and ChatGPT auto-finalize regressions fixed; bounded live evidence recorded |
| 08T | Replace slow live translation with an on-device EN→VI fast path and explicit ChatGPT fallback | PR #13 open on `feat/fast-translation`; no cloud API or billing change |
| 08U | Rebuild the existing extension UI/UX using the user-approved React adaptation of 10K Websites | PR #14 on `feat/10k-extension-ui`, stacked on `feat/fast-translation`; native-panel/screen-reader acceptance and user review pending |
| 08V | Compact chat history and counterpart-only translation requested after UI review | `feat/chat-conversation`, stacked on PR #14; UI checkpoint verified, capture strategy awaits user choice; no PR/merge yet |
| 08W | Wispr-inspired extension UI/UX follow-up | [Draft PR #15](https://github.com/doandanh-zah/tranz/pull/15) on `feat/wispr-inspired-ui` from Phase 08V; one-viewport meeting follow-up included; presentation only, no merge/release; native-panel/screen-reader acceptance pending |
| 09 | Run a measured private beta | Not authorized |

Detailed future work belongs in [BACKLOG.md](BACKLOG.md). Only [TODOS.md](TODOS.md) defines the current approved checklist.

## Git flow

### Branches

- Keep `main` reviewable and releasable.
- Create branches from the current remote `main` unless the user names another base.
- Use `type/short-description`, for example `docs/project-handbook` or `feat/extension-shell`.
- Use one phase per branch and pull request.
- Do not merge, rebase, or force-push `main` without explicit authorization.
- Preserve unrelated local changes and never clean or reset them as a shortcut.

### Commits

Use lowercase conventional commit subjects:

```text
docs: add project handbook
feat: add session setup shell
fix: make session stop idempotent
test: cover transcript finalization
chore: configure extension build
refactor: isolate agora session adapter
```

Commits should be cohesive and must not contain secrets, environment files, private transcripts, recordings, or generated meeting data.

### Pull requests

Every PR must contain:

- the approved phase and objective;
- a concise summary of changes;
- explicit in-scope and out-of-scope boundaries;
- verification commands and results;
- live or browser evidence when required;
- privacy, permission, and migration impact;
- known limitations and follow-up decisions;
- a checklist confirming documentation synchronization.

The default merge strategy is squash merge after approval. Do not merge merely because automated checks pass.

## Acceptance criteria

A phase is ready for review only when:

- every implementation and verification item in `TODOS.md` is complete or explicitly reported as blocked; review and merge are subsequent gates;
- implementation matches the approved scope;
- relevant automated checks pass;
- required manual or live verification has been performed;
- claims are limited to the evidence actually collected;
- documentation and ADRs match the implementation;
- the diff excludes unrelated changes and ignored local reference code;
- the branch is pushed and a focused PR is open.

Documentation-only work requires, at minimum:

- valid local Markdown links;
- consistent phase and version language;
- a secret scan outside ignored reference directories;
- `git diff --check`;
- confirmation that excluded local baselines are not tracked.

## Evidence rules

- Record commands and outcomes, not only `works for me`.
- Distinguish automated, manual, browser, live-provider, preview, and production evidence.
- Treat an accepted API response as intermediate when runtime readiness is required.
- Do not use mock data to claim a real integration works.
- Redact secrets and private meeting content from logs, screenshots, and PRs.
- State skipped checks and why they were skipped.

## Pull request template

```markdown
## Phase

Phase NN — name

## Summary

- ...

## In scope

- ...

## Out of scope

- ...

## Verification

- `command` — result

## Privacy and permissions

- ...

## Known limitations

- ...

## Documentation

- [ ] Sources of truth updated
- [ ] ADR added or updated when required
```

## Release and versioning

- `VERSION` is the canonical human-readable repository version.
- `CHANGELOG.md` records notable completed work.
- Versions follow Semantic Versioning once application artifacts exist.
- During product definition, `0.x.y` versions may represent reviewed repository milestones.
- Update versions deliberately in a release change; do not bump them for every commit.
- Tags and releases require explicit user approval.

## Decision records

Create or update an ADR when a change materially affects:

- system or trust boundaries;
- provider selection;
- browser permissions or capture strategy;
- storage, retention, or deletion behavior;
- authentication or authorization;
- a difficult-to-reverse dependency or deployment choice.

An ADR should state context, decision, evidence, alternatives, consequences, and revisit conditions.

## Blocked work and escalation

Stop and ask for direction when:

- documents or requirements conflict;
- the next step changes approved scope;
- a choice materially affects privacy, cost, architecture, or user-visible behavior;
- required credentials, external access, or consent are missing;
- verification would require destructive action;
- unrelated user changes overlap the required files.

Report the exact blocker, completed safe checks, available options, and the decision needed. Do not hide a blocker behind a partial success claim.

## Phase completion report

At the review gate, report:

- outcome and user-visible impact;
- files changed;
- verification evidence;
- what remains unverified;
- privacy or security impact;
- branch, commit, and PR;
- whether the phase is ready for review, blocked, or approved;
- confirmation that the next phase has not started.

## Current user authorization — 2026-09-29

The user explicitly authorized end-to-end MVP implementation and deferred their review until delivery. This overrides intermediate user-review pauses for Phases 02–08 for this implementation run. Keep one phase per branch/PR, using stacked branches from the preceding phase. Do not merge any PR or release publicly without explicit approval. Phase 09 recruitment and real-user research, store publication, paid infrastructure provisioning, and P2 expansion are not included. Report unmet runtime gates honestly rather than declaring them complete.
