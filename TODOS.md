# Current Phase TODOs

## Phase 01 — project handbook and repository governance

**Objective:** create a coherent English source of truth for the product, architecture, design, delivery process, contribution rules, future backlog, current work, version history, and coding-agent behavior.

**Branch:** `docs/project-handbook`

**Version:** `0.1.0`

**Status:** pull request open; awaiting user review

## Approved checklist

- [x] Validate the official Agora Conversational AI baseline and record the decision.
- [x] Create the private Tranz GitHub repository.
- [x] Confirm English as the documentation language.
- [x] Confirm the root handbook file set and omit `CLAUDE.md`.
- [x] Confirm the `BACKLOG.md`, `TODOS.md`, and `CHANGELOG.md` responsibilities.
- [x] Confirm architecture coverage for both MVP boundaries and long-term direction.
- [x] Set the initial repository version to `0.1.0`.
- [x] Create `README.md`, `AGENTS.md`, `PRODUCT.md`, `ARCHITECTURE.md`, and `DESIGN.md`.
- [x] Create `WORKFLOW.md`, `CONTRIBUTING.md`, `BACKLOG.md`, `TODOS.md`, `CHANGELOG.md`, and `VERSION`.
- [x] Verify local Markdown links and handbook consistency.
- [x] Scan the tracked product scope for accidental secrets.
- [x] Run Git whitespace and tracked-file checks.
- [x] Commit and push the phase branch.
- [x] Open a pull request with verification evidence.
- [ ] Receive user review and requested changes.
- [ ] Merge only after explicit user approval.

## Acceptance criteria

- All agreed files exist at the repository root, except the intentionally omitted `CLAUDE.md`.
- Each document has one clear responsibility and links to related sources of truth.
- Validated facts, MVP proposals, and long-term ideas remain distinguishable.
- Agents are constrained to explicit phases and evidence-backed claims.
- Git flow requires a focused branch and user-reviewed PR before merge.
- No credential, environment file, private transcript, recording, or local Agora baseline is tracked.
- The branch passes the documentation verification defined in `WORKFLOW.md`.

## Explicitly out of scope

- Application or package scaffolding.
- Chrome extension implementation.
- Backend implementation.
- Meeting-tab or microphone capture changes.
- Agora product integration beyond the recorded baseline.
- UI mockups or browser validation.
- Translation, suggestions, storage, or post-meeting features.
- Starting Phase 02 or any item directly from `BACKLOG.md`.

## Review gate

After the Phase 01 pull request is open, stop. Address review feedback on the same branch, but do not merge or begin Phase 02 until the user explicitly approves it.
