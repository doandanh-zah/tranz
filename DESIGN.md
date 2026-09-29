# Product Design Guide

## Design status

This document defines the intended Tranz experience. The MVP interface now implements it (see the implementation sections at the end); it was verified by rendering the unpacked extension build in Chromium at 320–600 px with a mock AI provider. Verification inside the real Chrome side-panel frame, with a screen reader, and during a live meeting is still pending.

## Experience goal

Tranz should feel like a calm meeting copilot: present when needed, quiet when not needed, and understandable in a glance.

The interface is not a transcript dashboard. Its primary job is to reduce the user's cognitive load while another person is speaking.

## Design principles

### Glanceable under pressure

- Keep the current thought, translation, and best next action visible without scrolling.
- Prefer one strong suggestion over a wall of alternatives.
- Use short labels and direct verbs.
- Place secondary detail behind deliberate actions.

### Original and translation stay connected

- English remains the primary learning source.
- Vietnamese translation appears beside or directly beneath its source segment.
- Translation must never look like an independent statement when its source is uncertain.
- Partial and final transcript states must be visually distinct without causing layout jumps.

### Trust is visible

- Distinguish confirmed context, meeting evidence, inference, and uncertainty.
- Never style an unsupported suggestion as a confident answer.
- When evidence is insufficient, promote clarification language such as asking the speaker to repeat or confirm.
- Make the context profile used for the session inspectable.

### User control is obvious

- Listening, paused, reconnecting, processing, and stopped states must remain visible.
- Start, pause, resume, and stop controls must not depend on hidden menus.
- Destructive actions state exactly which transcript, artifacts, or saved learning items will be deleted.
- Recording or retention behavior must never be implied only by color.

### Progressive disclosure

- The live view prioritizes comprehension and response support.
- Full transcript history, provenance, and settings are available without dominating the live view.
- Advanced controls appear only when they are relevant to the current state.

### Purposeful visual language

- Favor calm density, sharp hierarchy, and restrained accents.
- Avoid decorative gradients, glass effects, oversized headings, and animation that competes with the meeting.
- Every color, icon, badge, and motion must communicate state or action.

## Core experience flows

### Before the meeting

1. Select or create a context profile.
2. Review the exact context snapshot and retention preference.
3. Select the meeting tab and grant narrowly requested permissions.
4. Confirm source and translation languages.
5. Start assistance through an explicit action.

The ready screen should explain what Tranz can hear, what it will store, and what it cannot do.

### During the meeting

The default live view has three priorities:

1. **Now:** the most recent stable English segment and linked Vietnamese translation.
2. **Respond:** the detected question or user-selected text and one grounded response suggestion.
3. **Control:** session health, listening state, catch-up, pause, and stop.

Older transcript segments should remain accessible but visually recede. Suggestions should support quick actions such as `Shorter`, `Simpler English`, `More professional`, and `Ask for clarification`.

### After the meeting

The result view should reveal information in this order:

1. processing status and any partial failures;
2. concise summary;
3. decisions and action items;
4. questions or moments the user struggled with;
5. improved replies;
6. vocabulary and phrases from the meeting;
7. save and delete controls allowed by the active retention policy.

## Side-panel information architecture

```text
Session header
├─ meeting title or tab
├─ connection and listening state
└─ pause / stop

Live focus
├─ current English segment
├─ linked Vietnamese translation
└─ confidence or uncertainty treatment

Response support
├─ detected question or selected context
├─ primary suggested reply
├─ compact transformations
└─ copy / mark useful

Recent conversation
├─ chronological transcript
└─ catch-up action

Context and session details
├─ active context snapshot
├─ permissions and retention
└─ diagnostics when needed
```

## Responsive behavior

Chrome side-panel width can change, so the interface must be designed for constrained horizontal space.

- **Narrow, 320-399 px:** one column, translation below source, sticky session controls, compact actions, no horizontal scrolling.
- **Standard, 400-559 px:** one column with more generous line length and optional inline compact actions.
- **Wide, 560 px and above:** source and translation may use paired columns when readability is preserved; response support remains visually dominant.

The first implementation must be verified at 320, 360, 400, 480, and 600 px panel widths. A desktop page preview does not replace side-panel verification.

## Required interface states

Every relevant flow must define and test:

- initial loading;
- signed out or session expired;
- no context profile;
- context ready;
- permission request;
- permission denied;
- tab unavailable or closed;
- connecting;
- listening;
- paused;
- reconnecting or degraded;
- partial transcript;
- final transcript;
- no speech detected;
- translation delayed or failed;
- suggestion loading, ready, unsupported, and failed;
- stopping;
- post-meeting processing;
- partial post-processing failure;
- completed;
- offline;
- deleted.

Loading states must preserve the last reliable content when safe. Error states must explain impact and offer a real recovery action.

## Transcript behavior

- Prefer stable text over continuous character-level churn.
- Update partial text in place; do not append it as a new final segment.
- Preserve the user's reading position when new segments arrive.
- Offer an explicit jump-to-live action after the user scrolls away.
- Use timestamps only when they aid navigation or evidence.
- Never infer speaker identity when diarization is unavailable.
- Mark uncertain words without making the transcript unreadable.

## Suggestion behavior

- Display one recommended reply first and at most two alternatives by default.
- Keep the source question visible with the suggestion.
- Indicate whether the answer is grounded in profile context, meeting context, or both.
- Prefer concise, speakable language over polished paragraphs.
- Never submit, play, or speak a suggestion automatically.
- Keep copying and marking a suggestion useful available from the keyboard.

## Visual system direction

The final tokens are intentionally deferred to Phase 02. The initial direction is:

- a neutral, low-distraction foundation;
- one restrained accent for primary actions and live state;
- semantic colors reserved for success, warning, error, and privacy states;
- highly readable sans-serif typography with a distinct treatment for transcript content;
- an 8 px spacing rhythm with optical exceptions documented in the design system;
- compact radii and borders that clarify grouping without turning every element into a card.

Color alone must never carry status. Icons require labels or accessible names.

## Motion and feedback

- Use motion to explain entry, replacement, connection, and completion.
- Avoid continuous pulsing except for a subtle, accessible live indicator.
- Keep common transitions brief and interruptible.
- Respect `prefers-reduced-motion` and provide equivalent non-motion feedback.
- Do not animate transcript changes in a way that impairs reading.

## Accessibility requirements

- Meet WCAG 2.2 AA contrast targets.
- Support keyboard operation for all controls and meaningful transcript actions.
- Keep focus visible and restore it logically after dialogs or state changes.
- Announce important connection and error changes without reading every transcript update aloud.
- Use semantic headings, regions, buttons, lists, and status messages.
- Provide at least a 44 by 44 CSS-pixel target for primary touch or pointer actions where panel space allows.
- Support zoom and text scaling without clipping or hidden actions.
- Do not rely on hover for essential information.
- Respect reduced motion and increased contrast preferences.

## Content style

Interface copy should be calm, specific, and non-judgmental.

- Prefer `We could not hear the meeting tab` over `Something went wrong`.
- Prefer `Ask them to repeat the last sentence` over `Low confidence` alone.
- Prefer `Delete this transcript and its generated learning items` over `Delete data`.
- Never imply that a suggestion is guaranteed correct.
- Avoid grading the user's English during a live meeting.

## Design validation checklist

Before a UI phase is complete, verify:

- the primary task is clear at each supported width;
- all required states have real, reachable representations;
- transcript updates do not create disorienting layout shifts;
- keyboard order and focus recovery are correct;
- screen-reader labels and status announcements are meaningful;
- contrast and reduced-motion behavior pass automated and manual checks;
- permission, privacy, retention, and deletion language is explicit;
- the extension has been loaded and exercised as an unpacked Chrome extension;
- screenshots or recordings reflect the actual build, not static mockups.

## Long-term design direction

Future experiences may include reusable context libraries, learning progress, speaking practice, multiple language pairs, team knowledge, and native desktop capture. These should reuse the same trust and control principles without forcing enterprise or learning-dashboard complexity into the MVP side panel.

## MVP capture controls

Microphone mute disables microphone samples sent to Agora; it does not mute the meeting application. Pause disables both tab and microphone samples sent to Agora while preserving meeting playback. The browser capture handle stays open to allow resume; the UI must disclose that the provider session remains connected and may incur charges. Stop releases all local capture tracks immediately and requests remote cleanup. No captured audio is buffered for later upload while paused.

## MVP assistance behaviour (implemented in Phase 06)

Implementation status: rendered in the unpacked extension build with a mock AI provider and simulated transcript. Real provider quality, latency and live-meeting usefulness are not yet validated.

- Suggestions are user-triggered only. Tranz never requests a reply automatically, which bounds cost and distraction; revisit after measured use.
- Question detection is a heuristic over the last five final lines (a trailing question mark or an interrogative first word). It is labelled `Detected question (automatic guess)`; the user can pick any final line with `Use for reply`.
- The live view shows the latest final English line with its linked Vietnamese translation. In-progress text appears separately as `Hearing…` and is never translated. Final lines are translated one at a time.
- Each result states whether it cites the user's context, transcript lines, both or nothing, and always says `verify before using`. Cited sources are expandable. A valid citation does not prove the answer is correct.
- A reply that cites no known source is replaced with a clarification request and marked uncertain.
- `Catch me up` explains recent speech in Vietnamese. The composer rewrites a Vietnamese draft as spoken English without adding facts.
- Transcript history keeps the reader's position and offers `Jump to latest`; every line says the speaker is not identified.
- Deletion uses a native modal dialog: focus moves into it, Escape cancels, and focus returns to the control that opened it.

## MVP after-meeting behaviour (implemented in Phase 07)

Implementation status: rendered in the unpacked build with a mock AI provider; real note quality is not validated.

- Stop never waits for AI. When a session with final transcript stops and AI is configured, notes are created once in the background; the panel shows `Writing notes…`, then the notes, or the error with `Retry notes`.
- Notes order: summary (Vietnamese), decisions, next steps, illustrative phrases, vocabulary. Notes state that speakers are not identified, and illustrative phrases say they are not a record of what anyone said.
- Temporary sessions say they live only in backend memory. `Keep this session` explains what will be saved before saving it.

## MVP runtime transparency (implemented in Phase 08)

- Every automatic stop explains why it happened (meeting tab closed, capture ended, transcriber left or failed, connection lost, credentials not renewed, backend unreachable or shut down, one-hour limit, runtime silent). A user stop shows no extra message.
- While the real-time connection recovers, audio sending is gated and the status reads `Reconnecting`; it resumes automatically unless the user paused.
- When the panel reopens during a session it reads pause/mute state from the audio runtime, and warns if the backend lists a session that has no capture running in this browser.
- In a stopped session, untranslated lines offer `Translate` instead of implying a pending job.

## ChatGPT sign-in (implemented, ADR 0003)

- Settings shows **Sign in with ChatGPT** when the ChatGPT-plan provider is active. It opens OpenAI's own sign-in page in a new tab; the panel waits (up to five minutes) and then shows the account and plan, with a sign-out action.
- The panel says that requests take several seconds and count toward the plan's Codex limits. Translation shows `Translating… (can take several seconds)` and arrives in batches.
- Wherever AI is unavailable, copy points to Settings instead of mentioning API keys.
