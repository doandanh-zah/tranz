# Product Definition

## Vision

Tranz helps people participate confidently in English meetings while building durable English skills from their own real conversations.

The product is not only a translator and not only a meeting recorder. Its value comes from connecting three moments:

1. prepare the assistant with trusted context;
2. understand and respond during the meeting;
3. learn from the exact language used after the meeting.

## Primary user

The first target user is a Vietnamese professional who:

- regularly joins English-language browser meetings;
- can communicate in English but struggles with speed, accents, technical language, or response formulation;
- needs answers grounded in real project or company information;
- wants to improve practical workplace English rather than study generic lessons.

Initial examples include founders, developers, product managers, operators, salespeople, and community leads working with international teams.

## Jobs to be done

### Before a meeting

> Help me give the assistant enough accurate context so it can support me without inventing facts.

### During a meeting

> Help me understand what was said and form a concise, natural answer before the conversation moves on.

### After a meeting

> Show me the language I missed or could have used better, so I improve from real work rather than disconnected exercises.

## User problems

- Fast speech leaves too little time to translate mentally.
- Accents, idioms, and project-specific vocabulary reduce comprehension.
- Knowing the answer does not guarantee the user can express it quickly in English.
- Generic AI suggestions may fabricate project facts or use an unsuitable tone.
- Existing transcripts are often too noisy to use during a live meeting.
- Vocabulary lists created after a meeting are often generic and disconnected from the user's actual mistakes.
- Recording and transcript tools can create privacy uncertainty.

## Value proposition

Tranz provides a private, context-aware assistance layer beside a browser meeting:

- original transcript and translation remain connected;
- suggestions are short enough to use during a live conversation;
- answers are grounded in user-controlled context;
- uncertainty produces clarification language, not invented claims;
- the meeting becomes personalized learning material after it ends.

## Core product loop

### 1. Prepare

The user creates or selects a context profile containing:

- identity and role;
- company or project summary;
- verified facts and constraints;
- meeting goal and expected outcomes;
- expected questions;
- domain glossary;
- preferred tone and English level.

The user reviews the context that will be available to the assistant before capture begins.

### 2. Participate

The side panel provides:

- live original transcript;
- line-linked Vietnamese translation;
- visible confidence or uncertainty states where available;
- detected questions;
- one primary suggested response and optional alternatives;
- actions for shorter, simpler, more professional, or clarification-oriented wording;
- a catch-up explanation for the most recent conversation window;
- a Vietnamese-to-English reply composer.

The interface must remain useful without requiring continuous typing or scrolling.

### 3. Improve

When the user ends the session, Tranz produces:

- a concise summary;
- decisions and action items;
- questions that required clarification;
- suggested improvements to the user's responses;
- vocabulary and phrases taken from the meeting;
- Vietnamese meanings and contextual English examples;
- user-controlled saved learning items.

## MVP requirements

### Meeting setup

- `PR-001`: Users can create, edit, select, and delete a context profile.
- `PR-002`: Users can review the exact context attached to a meeting session.
- `PR-003`: Users can choose English as the source and Vietnamese as the translation language.
- `PR-004`: Capture cannot start without an explicit user action.

### Live assistance

- `PR-010`: Tranz can capture the selected meeting tab and user microphone within supported browser constraints.
- `PR-011`: Users can see stable partial and final transcript states.
- `PR-012`: Every translation remains associated with its source transcript segment.
- `PR-013`: Users can trigger a catch-up explanation for recent speech.
- `PR-014`: Tranz can detect likely questions and request a reply suggestion.
- `PR-015`: Suggestions use meeting evidence and user-provided context only.
- `PR-016`: Insufficient evidence produces a clarification or uncertainty response.
- `PR-017`: Users can mute, pause, resume, and stop assistance.
- `PR-018`: Permission, connection, agent, and transcript failures are visible and recoverable.

### Post-meeting

- `PR-020`: Ending a session is idempotent and produces one final processing job.
- `PR-021`: Users can review summary, decisions, action items, vocabulary, and improved responses.
- `PR-022`: Users can delete a session and its derived material.
- `PR-023`: Transcript retention is opt-in.
- `PR-024`: Raw audio is not retained by default.

## Experience requirements

- A suggestion should be readable without leaving the meeting flow.
- The product must not impersonate the user or speak automatically during the MVP.
- Original English remains visible so translation supports learning rather than replacing it.
- Listening, paused, reconnecting, and stopped states are always obvious.
- The assistant must never present an inferred project fact as confirmed.
- Destructive data actions require clear scope and confirmation.

## Non-goals for the MVP

- Native Zoom or Microsoft Teams desktop support.
- Broad multilingual coverage.
- Perfect participant-level diarization.
- Autonomous meeting participation.
- Automatic voice replies.
- Permanent audio recording.
- Full flashcard scheduling or spaced-repetition algorithms.
- Enterprise teams, shared workspaces, administration, or billing.
- Training Tranz models on private meeting content.

## Initial success targets

These are targets to validate, not current performance claims:

- partial transcript visible within 2 seconds of speech;
- translation visible within 3 seconds;
- useful suggested reply within 5 seconds of a detected question;
- session start success above 95% during private beta;
- zero raw-audio retention unless explicitly enabled;
- zero project facts invented in the grounded-answer evaluation set;
- improving user-rated helpfulness for suggestions and learning material.

## Long-term product direction

After the MVP proves real usage and privacy expectations, Tranz may expand toward:

- reusable context libraries for multiple projects and roles;
- personalized language-level adaptation;
- spaced repetition based on meeting vocabulary and repeated mistakes;
- pronunciation and speaking-practice sessions generated from past meetings;
- multilingual source and translation pairs;
- participant diarization and speaker-specific notes;
- native desktop meeting support;
- private team knowledge sources with explicit access controls;
- enterprise retention, audit, residency, and administration features;
- integrations with calendars, notes, CRMs, and task systems;
- cross-meeting learning progress without retaining unnecessary meeting content.

Long-term features remain backlog items until user research, cost, privacy, and technical feasibility support them.

## Product risks

- Real-time assistance may create more distraction than value if the interface is too dense.
- Latency may make automatic question detection less useful than user-triggered assistance.
- Capturing both tab audio and microphone audio may behave differently across meeting platforms.
- Context quality may be insufficient to produce trustworthy suggestions.
- Users and meeting participants may have different expectations about recording and transcription.
- Provider costs may remain high after ambassador credits end.
- Users may become dependent on translation unless learning features preserve original English.

## MVP decisions taken during implementation (2026-09-29)

These are working choices for the local MVP, to be revisited with measured use:

- Reply suggestions are user-triggered only; a heuristic marks a likely question but never calls the AI by itself.
- Only final transcript lines are translated, one at a time; partial text is shown untranslated.
- Notes are created automatically once after a session stops (when AI is configured); stopping never waits for them.
- Nothing is retained unless the user opts in before start or presses `Keep this session` afterwards.
- The transcript mixes tab and microphone audio; speakers are never identified.
- AI runs on the user's ChatGPT plan by default (sign-in, no API key), accepting multi-second latency ([ADR 0003](docs/decisions/0003-chatgpt-subscription-provider.md)).

## Open product decisions

- Should reply suggestions eventually become automatic or hybrid?
- How much recent transcript should be visible by default?
- Which post-meeting artifacts should be saved automatically, if any?
- How should Tranz communicate low-confidence transcript or translation segments?
- Which context fields are required versus optional?
- What is the right private-beta user profile and session length?
- Which consent guidance is required for initial markets?
