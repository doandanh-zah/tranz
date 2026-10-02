# Google Meet integration evidence — 2026-10-02

## Scope and evidence boundary

This record covers one signed-in Google Meet test call using synthetic context and synthetic speech. It used the real unpacked Tranz extension, real browser side panel, configured Agora project and ChatGPT-plan provider. No real meeting content, account identifiers, tokens, transcript text or provider output are recorded here.

This is bounded integration evidence, not a production, beta or multi-person-meeting claim.

## Environment

- Branch: `fix/google-meet-e2e`, based on the unmerged `feat/monochrome-dark-ui` stack.
- Browser: Cốc Cốc, with the unpacked MV3 build loaded and the user signed into Google Meet.
- Backend: loopback Fastify server on `127.0.0.1:4318`.
- Providers: configured Agora project and an already-authenticated official Codex runtime for ChatGPT-plan requests.
- Data: synthetic profile, synthetic meeting facts and machine-generated speech only.

## Observed end-to-end flow

1. Opening Tranz from the active Meet tab displayed the real side panel.
2. Initial pairing exposed a compatibility defect: Cốc Cốc omitted `Origin` on the extension fetch while providing the Chromium `Sec-Fetch-*` metadata.
3. After the fix and extension reload, the panel paired automatically without showing or pasting the local bearer token.
4. Microphone permission completed and the ready checklist reached its ready state.
5. Starting Tranz changed the panel from connecting to listening; the browser marked the tab as sharing content and the Agora agent joined.
6. Synthetic speech played on the machine reached the microphone path, produced live English transcript through Agora and then a linked Vietnamese translation through ChatGPT.
7. A user-triggered reply suggestion used the selected synthetic context and exposed its evidence/uncertainty treatment. Catch-up and composer calls also returned real-provider output.
8. Stop succeeded. Manual finalization on the pre-fix backend produced a ready artifact in about 10 seconds, including a summary and vocabulary.
9. Save returned success, delete removed the session, a subsequent read returned 404, and the synthetic context profile was removed.
10. An authenticated Agora channel query found no active agent after cleanup.

## Defects fixed

### Originless Chromium extension pairing

The extension now supplies `chrome.runtime.id` in `X-Tranz-Extension-Id`. The backend accepts the originless form only when that ID matches `EXTENSION_ID` and the request also carries `Sec-Fetch-Site: none`, `Sec-Fetch-Mode: cors` and `Sec-Fetch-Dest: empty`. Exact extension-origin pairing remains supported. Tests reject missing metadata, `Origin: null`, web origins and wrong identities.

### ChatGPT automatic post-meeting notes

The backend previously enabled automatic finalization for an injected test AI or a configured API key, but not for the default ChatGPT-plan provider. The gate now enables automatic notes for `AI_PROVIDER=chatgpt`; a regression test covers ChatGPT, API-key and unconfigured OpenAI modes. The live artifact in this record was requested manually before the fix was loaded, so automatic background execution is automated-test evidence rather than a live claim.

## Verified cleanup and privacy behavior

- Tranz wrote no raw audio file.
- The test session started as temporary.
- Save, delete and read-after-delete were exercised in sequence.
- The synthetic context profile was deleted and no matching profile remained.
- The Agora channel contained zero active agents after stop/delete.
- Secrets, account identity, transcript text and generated answer text are intentionally absent from this record.

## Still unproven

- Incoming speech from another Meet participant reaching Tranz through tab audio rather than through the local microphone.
- Meeting playback remaining audible during active capture, pause and microphone mute.
- Meet-tab close behavior in the real panel.
- Controlled short/long network loss and recovery.
- Device switching, VoiceOver and manual resizing across the full 320–600 px range.
- Latency, grounding quality and learning-artifact usefulness in a real multi-person meeting.

Until those gates pass, describe the result as an integrated synthetic Google Meet run, not as a fully validated meeting copilot.
