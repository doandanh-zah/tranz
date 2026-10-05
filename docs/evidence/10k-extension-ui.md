# Phase 08U: 10K extension UI/UX rebuild

Date: 2026-10-05. User-approved adaptation of the supplied 10K Websites skill to the existing React extension. [PR #14](https://github.com/doandanh-zah/tranz/pull/14). Branch: `feat/10k-extension-ui`, based on `feat/fast-translation` at `ba1c856`. Implementation commit: `583fe02`; review-link documentation follows in a separate commit. Version remains `0.1.0`; no release or merge.

## Outcome

The existing meeting flow now has a coherent language-bridge identity and stronger task hierarchy: grouped real setup progress, labeled navigation, English/linked-Vietnamese reading focus, a primary reply action, clearer supporting views, neutral form/result surfaces, keyboard skip navigation and short optional view entrances.

The complete upstream skill and six references were read. Its original static-site/video/hosting requirements were explicitly adapted after the user selected the existing extension. The [design package](../designs/10k-extension-ui.md) records the scope and design decisions. No generated media or generation credits were used.

## What changed

- `apps/extension/src/App.tsx`: labeled navigation icons, responsive masthead and keyboard skip target.
- `apps/extension/src/components.tsx`: static EN→VI bridge and shared view introduction.
- `apps/extension/src/style.css`: type hierarchy, stronger text/control contrast, spacing, setup/reading/result surfaces, narrow action placement, responsive active-session header, pointer targets and reduced-motion-aware entrance.
- `apps/extension/src/views/Home.tsx`: language bridge, completed-step count, preparation grouping and start-control reminder; consent stays visible.
- `apps/extension/src/views/Live.tsx`: session title separate from time/state and clearer primary reply action.
- `apps/extension/src/views/ContextProfiles.tsx`, `Library.tsx`, `Settings.tsx`: view introductions and relevant empty-state imagery.
- `scripts/verify-ui.mjs`: 375 px coverage, settled screenshots, contrast, skip-link focus, setup text scaling, active-session header checks and live motion preference changes.
- `README.md`, `DESIGN.md`, `WORKFLOW.md`, `TODOS.md`, `CHANGELOG.md`: synchronized current phase and UI behavior.
- Added this evidence and `docs/designs/10k-extension-ui.md`.

## What did not change

Backend, shared contracts, API, capture, Agora, ChatGPT, on-device translation, manifest/CSP/permissions, token scope, polling, retention/deletion and explicit start/stop handlers were not modified. No raw-audio storage was introduced. `main`, prior PRs, `.claude/` and the ignored official Agora baseline were preserved. Skill files live under ignored `.codex/skills/10k-websites/` and are not committed.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run verify` | Passed lint, typecheck, 34/34 tests and isolated build |
| `npm run lint` / `npm run typecheck` after verification-script updates | Passed |
| `TRANZ_CHROMIUM='<cached Chromium 1234 executable>' npm run verify:ui -- artifacts/ui-10k-final` | Passed 59/59; actual unpacked extension build loaded, service worker registered and narrow permissions confirmed |
| `npm run build` | Passed; updates `dist/extension` for manual reload |
| `git diff --check`, local Markdown link validation and changed-file secret-pattern scan | Passed |
| Built screenshots + independent read-only review | Reviewed setup, live, context/editor, saved sessions, Settings, notes, enlarged text and delete dialog |
| `npm run demo:ui -- --live` + in-app browser | Synthetic local preview connected; mock translation and reply with sources/caution rendered |

The build still reports the existing large Agora offscreen chunk (~2.9 MB). Bundle restructuring is deferred; no new dependency, external font, image or video was added.

### Browser evidence

Disposable Chromium profile, throwaway backend and synthetic transcript. No `.env` or real meeting content is read by the UI harness. The Translator API and AI output are test stand-ins; these checks prove rendering/wiring, not provider quality or live audio.

Local, ignored screenshot/result folders:

- `artifacts/ui-10k-before/`: baseline, 45/45 checks.
- `artifacts/ui-10k-final/`: final 59/59 checks and settled screenshots.
- Key screens: `14-chatgpt-checklist-360.png`, `06-live-simulated-375.png`, `06-active-context-320.png`, `06-active-context-text-200.png`, `12-library-360.png`, `15-chatgpt-settings-360.png`, `02-home-text-200-400.png`, `08-live-text-200-400.png`.

Home/live widths: 320, 360, 375, 400, 480 and 600 px. Settings: 320, 375 and 600 px. Notes: 320 and 600 px. Setup/live and active-session context navigation: actual 200% root text size at 400 px. No horizontal overflow was observed. The skip link transfers focus into `main`; dialog focus, Escape and return focus pass. Existing recovery, mock sign-in, source citations, consent, fallback translation, save/delete and automatic stop explanation pass.

Measured token contrast on `#101112`: muted text **7.46:1**, secondary text **13.33:1**, interactive outline **4.49:1**. White primary label/background: **21:1**. Decorative dividers are separate from interactive outlines. These are specific measured colours, not a blanket accessibility certification.

Reduced motion disables both the real-state pulse and view entrance; changing the preference back restores the motion rule. Screenshot capture waits for view entrance completion. Independent review caught a potential crowded masthead when an active session is viewed from another screen; the header now wraps safely and suppresses the secondary brand caption, and new narrow/enlarged-text checks pass.

## Remaining gates and risks

- The harness opens the real extension document in a Chromium tab. Manual resizing of the native side-panel frame and VoiceOver were not performed for this UI change.
- Incoming Meet-tab participant audio, audible playback, real network-loss recovery and real multi-person meeting quality remain pending from previous phases.
- The demo uses clearly marked synthetic data and a mock AI provider. It cannot start a real meeting from its browser page.
- New `dist/extension` files require the user to press Reload for their unpacked extension before opening the panel.
- Phase 08U implementation and scoped automated/browser verification are ready for review. Native-panel and screen-reader acceptance remain pending; the phase is not claimed fully accepted. User review/merge approval is outstanding; no next phase begins automatically.
