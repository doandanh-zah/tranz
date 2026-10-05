# Tranz extension design package

Date: 2026-10-05. Phase 08U, UI/UX rebuild only, stacked on `feat/fast-translation`.

## Authorization and adaptation

The user requested the Downloads `10k-websites-skill.zip` and explicitly chose to adapt it to the existing React extension while keeping the meeting flow. The local skill is extracted under ignored `.codex/skills/10k-websites/`. Its complete skill and reference files were read before implementation.

The original skill targets a cinematic static marketing website. For this approved adaptation, React, the extension runtime, true-black monochrome theme and restrained motion remain. Video generation, scroll scrubbing, lead forms, hosting and public deployment are outside this phase. No generation credits are spent. The design-first package, single primary action, subject-derived vector motif, deliberate copy, complete failure states and adversarial browser review carry over.

## 1. Brand premise

Follow the conversation. Tranz connects what a person hears in English with what they understand in Vietnamese and what they choose to say next. The signature is a two-language bridge, with EN and VI at its endpoints. It identifies the actual supported pair without pretending to be an audio meter.

## 2. Palette

Preserve `--canvas: #000000`, `--text: #ffffff`, a white primary action and state-only green, yellow and red. Add quiet neutral surfaces for readiness and response focus. Interactive outlines use a separately measured stronger neutral than decorative dividers. No gradients, blur, glow or shadows.

## 3. Type trio

Heavy local system display sans for titles and wordmark; system text sans for Vietnamese copy and English conversation; local mono for language endpoints, times and real counts. No remote font request. Type remains rem-based and respects text scaling.

## 4. Experience map

| Moment | Main content | Primary action | Motion |
| --- | --- | --- | --- |
| Prepare | Language bridge, readiness checklist, translation mode, optional context | Bắt đầu nghe | One brief view entrance, no looping decoration |
| Listen | Session health, controls, original and linked translation | Gợi ý câu trả lời when usable | Existing real listening indicator only |
| Respond | Source question, suggested English, evidence and caution | Existing reply / composer actions | Short feedback on interactive controls |
| Finish | Notes, retention and deletion scope | Cuộc họp mới | Stable notes while processing |
| Context | Optional trusted facts, profile list or editor | Tạo ngữ cảnh mới / Lưu ngữ cảnh | View entrance only |
| Saved | Actual saved sessions, time and summary | Mở lại for a saved meeting | View entrance only |
| Settings | Account, translation mode, privacy, collapsed diagnostics | Existing sign-in or refresh action | View entrance only |

## 5. Opening copy

- Kicker: `Trợ lý cuộc họp tiếng Anh`
- Title: `Sẵn sàng cho cuộc họp`
- Subline: `Nghe tiếng Anh, đọc tiếng Việt, trả lời tự tin.`
- Main action: `Bắt đầu nghe`
- Readiness heading: `Chuẩn bị trước khi nghe`
- Supporting note: `Chỉ bắt đầu khi bạn bấm nút. Không lưu âm thanh.`

No promised translation latency, fictitious testimonials or generated meeting content. Existing consent and provider-fallback disclosures stay visible and accurate.

## 6. Supporting views

Keep existing Vietnamese labels and English meeting content. Give context, saved sessions and settings distinct labeled introductions and meaningful empty-state icons. Show counts only from actual loaded profiles or retained sessions. Keep live source and translation together, with source English above brighter Vietnamese. Keep context, history and diagnostics available through existing disclosures. Keep pause, mute and stop directly visible.

## 7. Vector layer

Draw an inline bridge SVG by hand, with two paths and a crossing node. It is decorative (`aria-hidden`) and static. Use existing Lucide controls for navigation and real states. No particle system or simulated waveform. No external assets.

## 8. Engineering and acceptance

- Preserve API, audio/Agora lifecycle, Translator API, permissions, credentials, retention and deletion contracts.
- Keep navigation in normal flow, with a keyboard skip link to the main region.
- Animate view entry once using opacity and transform; never animate transcript updates. Disable all motion live when reduced motion is requested.
- Verify the unpacked build and narrow permission set, controls and error recovery at 320, 360, 375, 400, 480 and 600 px, plus 200% text scaling.
- Measure text/control contrast and check focus, dialog cancel/restore, coarse-pointer targets, overflow and script errors.
- Record browser evidence as synthetic build verification. A tab-rendered extension document does not prove the native side-panel frame, VoiceOver or real meeting quality.

## 9. Copy gate

New viewer-facing copy ships as authored above. Scan changed copy for stock filler and em dashes, inspect Vietnamese accents and line wrapping, then review built screenshots. Existing functional disclosures retain their meaning.
