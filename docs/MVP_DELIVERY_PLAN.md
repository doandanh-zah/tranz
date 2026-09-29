# Tranz — kế hoạch hoàn thiện MVP và nghiệm thu

Ngày chụp trạng thái: 2026-09-29. Tài liệu lập kế hoạch/handoff, không phải chứng nhận MVP đã hoàn thành.

## 1. Mục tiêu và quyền thực hiện

Người dùng đã yêu cầu triển khai MVP từ đầu đến cuối, review sau, và chọn AI adapter OpenAI-compatible với API key cấu hình cục bộ. Yêu cầu mới nhất là lập kế hoạch phase và prompt handoff; dừng thay đổi application code trong lượt lập kế hoạch này.

Khi người dùng yêu cầu tiếp tục bằng prompt handoff:

- Thực hiện phạm vi MVP của Phase 02–08 theo thứ tự phụ thuộc, không cần xin duyệt lại mỗi bước thông thường.
- Vẫn giữ một phase mỗi branch/PR; không merge PR nào nếu chưa có phê duyệt merge rõ ràng.
- Không coi việc code/build thành công là vượt qua gate audio/Agora/browser.
- Thiếu credential, consent hay quyết định kiến trúc có ảnh hưởng lớn: báo đúng blocker; tiếp tục phần độc lập nếu còn.
- Không mở rộng sang Phase 09 tuyển beta users, publish Chrome Web Store, production deployment hoặc P2.
- `TODOS.md` là nơi ghi công việc đang được phép thực hiện; kế hoạch này mô tả thứ tự và tiêu chí, không cấp thêm phạm vi ngoài yêu cầu của user.

## 2. Định nghĩa MVP có thể review

Một người dùng cài extension Chrome, kết nối backend local, chuẩn bị context, mở Google Meet, chủ động bắt đầu capture, xem transcript tiếng Anh kèm bản dịch tiếng Việt, yêu cầu gợi ý/catch-up hoặc soạn câu tiếng Anh từ tiếng Việt, dừng phiên, xem learning notes, chọn giữ hoặc xóa dữ liệu.

Điều kiện bắt buộc:

1. Luồng thật chạy trong unpacked extension, không chỉ trang web preview.
2. Audio tab và microphone được xử lý mà không làm mất playback của cuộc họp.
3. Tranz không phát âm thanh của agent; mute/pause/stop có ngữ nghĩa đúng và kiểm chứng được.
4. Transcript và AI output là dữ liệu thực; fixtures chỉ dùng trong test và phải ghi rõ synthetic.
5. Credentials của provider chỉ ở backend; token RTC/RTM có scope và hết hạn.
6. Raw audio không lưu. Transcript/derived content chỉ lưu bền khi người dùng chọn; xóa phải bao phủ dữ liệu nguồn và dữ liệu sinh ra.
7. Mọi lỗi có trạng thái trung thực và hướng khôi phục; không có silent failure hoặc success giả.
8. Có bằng chứng test, browser và live-provider riêng biệt; latency, chất lượng grounding và privacy chưa đo phải được đánh dấu chưa xác thực.

Bản hiện tại chọn **local, single-owner MVP** theo ADR 0002. Không phải SaaS multi-user hay bản sẵn sàng public beta. Nếu user muốn hosted MVP, cần chốt identity, storage, deployment, retention của provider và chi phí trước khi thay kiến trúc.

## 3. Snapshot repository

- Repo private: https://github.com/doandanh-zah/tranz
- `main` chưa bị merge/thay đổi trong lượt triển khai.
- Version hiện tại: `0.1.0`; chưa tag/release mới.
- Branch đang làm: `feat/grounded-assistance`.
- HEAD: `b0457aa` — `feat: add revision-linked vietnamese translation`.
- Branch hiện tại được tạo từ `feat/linked-translation`, chưa có commit riêng hoặc PR.
- Worktree có WIP; phải giữ nguyên, không reset/clean/stash hoặc checkout tùy tiện.

| Phase | Branch | PR | Trạng thái thực tế |
| --- | --- | --- | --- |
| 01 | `docs/project-handbook` | [#1](https://github.com/doandanh-zah/tranz/pull/1) | Handbook + ghi nhận quyền triển khai MVP; chưa review/merge |
| 02 | `feat/mvp-foundation` | [#2](https://github.com/doandanh-zah/tranz/pull/2) | Foundation đã commit, build/test; UX/browser gate chưa xong |
| 03 | `feat/audio-capture` | [#3](https://github.com/doandanh-zah/tranz/pull/3) | Capture đã commit; audio thật chưa được nghiệm thu |
| 04 | `feat/agora-lifecycle` | [#4](https://github.com/doandanh-zah/tranz/pull/4) | Lifecycle đã commit, mock tests; RTC/RTM Tranz thật chưa được nghiệm thu |
| 05 | `feat/linked-translation` | [#5](https://github.com/doandanh-zah/tranz/pull/5) | Adapter/translation đã commit; chất lượng/latency provider chưa đo |
| 06 | `feat/grounded-assistance` | Chưa có | Context, assistance và UI đang WIP local |
| 07 | Chưa tạo | Chưa có | `learning.ts` có bản nháp local nhưng chưa đăng ký routes |
| 08 | Chưa tạo | Chưa có | Hardening, rendered UX và integrated acceptance chưa hoàn thành |
| 09 | Chưa tạo | Chưa có | Không được triển khai trong phạm vi này |

PR đang xếp chồng: `main ← #1 ← #2 ← #3 ← #4 ← #5`. Giữ nguyên cấu trúc này; không tự rebase/force-push/merge để đơn giản hóa handoff.

WIP trước khi thêm tài liệu kế hoạch:

- Modified: `apps/extension/src/main.tsx`, `apps/server/app.ts`.
- Untracked: `apps/extension/src/App.tsx`, `apps/extension/src/style.css`, `apps/server/assistance.ts`, `apps/server/learning.ts`, `tests/assistance.test.ts`.
- App UI đang gọi các endpoint finalize/save chưa đăng ký; không mô tả post-meeting flow là đã hoạt động.

## 4. Kế hoạch các phase

### Phase 01 — đồng bộ handbook và quyền thực hiện

**Còn làm:** sửa các mô tả đã lỗi thời như “chưa scaffold”, status Phase 01-only và các checklist chưa phản ánh trạng thái mới. Giữ lịch sử baseline riêng với implementation hiện tại. Đồng bộ README, AGENTS, ARCHITECTURE, DESIGN, WORKFLOW, CONTRIBUTING, TODOS và CHANGELOG ở thay đổi tương ứng.

**Gate:** không có hai nguồn sự thật mâu thuẫn; local links và secret scan đạt; approval cuối và approval merge phân biệt rõ.

### Phase 02 — foundation và side-panel shell

**Đã có:** npm/TypeScript, React/Vite, Fastify local, schema dùng chung, bearer auth, exact-origin policy, rate limit, MV3 manifest, CI workflow, setup script.

**Còn làm:** xác thực cài lại từ lockfile; startup/setup docs; load extension thật; pairing origin/extension ID; state gallery có fixture rõ nhãn; hoàn thiện design tokens, bố cục và accessibility của shell. Đọc lại việc chọn storage single-process trong ADR 0002.

**Gate:** `npm ci`, lint, typecheck, test, build; health và authenticated API đúng; signed-out/invalid token/backend-offline/config-missing có UI; load unpacked thành công; manifest không có quyền thừa.

**Đầu ra:** source, ADR, runbook, evidence; PR #2 được giữ cho review.

### Phase 03 — chứng minh capture audio

**Đã có:** tabCapture stream ID qua service worker, offscreen context, microphone mix, tab playback riêng, gain mute/pause, track cleanup, tab-close handler.

**Còn làm:** kiểm thử bằng audio synthetic trong Google Meet test tab; microphone permission trước capture; playback giữ nguyên; mute chỉ chặn microphone vào Tranz; pause chặn cả hai nguồn gửi provider nhưng không lưu buffer; resume không gửi lại audio cũ; stop trong lúc permission/start đang chờ; device changes, tab close và browser lifecycle.

**Gate:** có evidence riêng cho tab audio, microphone, playback, pause/resume, permission denial và stop. Nếu topology không hoạt động, sửa/ghi ADR trước khi tuyên bố Phase 04 đã được chứng minh.

**Lưu ý:** audio đang mix; chưa có participant attribution. Không gán lời nói cho người dùng nếu không có dữ liệu nguồn đáng tin cậy.

### Phase 04 — Agora realtime và reliability

**Đã có:** server-owned channel/UID, token RTC/RTM riêng có hạn, agent orchestration, chờ agent join ở RTC, client không subscribe/play TTS, heartbeat watchdog, start/stop serialization, cleanup metadata mã hóa.

**Còn làm:** kiểm tra silent topology có mất transcript khi agent thinking/speaking không; token renewal thật; RTM mất kết nối; provider lỗi; stop/start chồng lấn; backend restart; cleanup remote không thành công; SDK logging không rò transcript/token. Xác minh giới hạn timeout và tình huống provider đã tạo agent nhưng request trả về bị mất.

**Gate:** agent accepted → runtime joined → speech published → transcript nhận được → stop/cleanup xác nhận. Test duplicate lifecycle và reconnect; không có agent trùng hoặc local capture còn chạy khi UI báo đã dừng.

**Giới hạn:** không play TTS chỉ chứng minh client không phát tiếng; không chứng minh provider không sinh TTS/LLM hay không tính phí. Phải đo và công bố giới hạn này.

### Phase 05 — translation có liên kết nguồn

**Đã có:** OpenAI-compatible adapter backend, cấu hình local, JSON schema validation, timeout, concurrency cap, request budget; translation cho final segments với revision và chống stale completion.

**Còn làm:** API key/provider local; danh sách model tương thích JSON response; retry UI; stale/deleted-session cases; xử lý translation backlog khi nhiều câu liên tục; đánh giá thuật ngữ và tốc độ trên synthetic transcript; không tạo vòng lặp retry vô hạn.

**Gate:** bản dịch luôn gắn đúng segment/revision; source text còn đọc được khi provider lỗi; missing key/429/timeout/malformed output thể hiện đúng; đo latency thực thay vì khẳng định target đã đạt.

### Phase 06 — context và trả lời có căn cứ

**Đã có WIP:** CRUD profile, immutable snapshot, reply/catch-up/composer API, lọc evidence ID, clarification fallback, context test và UI nháp.

**Còn làm:** review/format/refactor WIP trước commit; nối đầy đủ UI với API; question detection là heuristic có quyền chọn thủ công; evidence người dùng inspect được; không lấy ID hợp lệ làm bằng chứng câu trả lời đúng. Kiểm thử prompt injection, thiếu context, context mâu thuẫn, edit/delete profile khi session tồn tại và stale response khi chuyển session.

**Gate:** create/edit/delete/select context; snapshot đúng; manual reply, catch-up và Vietnamese composer chạy thật; thiếu bằng chứng trả clarification; không bịa project facts trong bộ đánh giá đã định nghĩa. Test mock chỉ kiểm tra contract, không chứng minh model quality.

**Git:** hoàn thiện branch `feat/grounded-assistance`, chỉ commit file thuộc Phase 06; không gom `learning.ts` hoặc hardening ngoài phạm vi vào commit này.

### Phase 07 — notes, learning, retention và deletion

**Đã có WIP:** `apps/server/learning.ts` định nghĩa finalize/save, schema artifact và bảo vệ deleted-session; chưa được đăng ký trong app.

**Còn làm:** wire routes, tests, UI integration; trigger finalize sau stop/tab-close theo policy; retry post-processing an toàn; xác định hành vi crash/restart. Hoàn thiện summary, decisions, actions, vocabulary và illustrative improved replies. Không suy đoán đó là lời của user.

**Privacy:** retention off không ghi transcript/artifact xuống disk; thời gian sống RAM phải rõ. Save phải là hành động có thông tin. Delete bao gồm snapshot, transcript, translation, artifacts và công việc đang chạy; job trễ không làm dữ liệu sống lại. Chỉ hứa xóa local; provider deletion/retention cần xác minh riêng.

**Gate:** duplicate finalize có một kết quả nhìn từ user; lỗi có retry; stop không phụ thuộc AI thành công; test persisted ciphertext, opt-in/off, expired ephemeral data, deletion trong lúc AI đang chạy, restart. Long-session giới hạn phải có UX rõ.

### Phase 08 — hardening và bàn giao integrated MVP

**Còn làm:** review toàn bộ code và contract; tách UI/components hợp lý; formatter; dependency/security audit; CI thật; scope Chrome permissions; rate/cost/session bounds; docs onboarding/privacy/provider inventory; runbook recovery và lưu khóa mã hóa.

**Browser:** load unpacked extension, kiểm tra 320/360/400/480/600 px; keyboard/focus/dialog; contrast; reduced motion; 200% text/zoom; overflow; loading/empty/error/offline/permission-denied; screenshot từ build thật.

**Integrated:** fresh setup → profile → start → transcript → translation → reply/catch-up/composer → pause/mute/resume → stop → notes → save → reopen → delete. Thử cả retention off, backend mất kết nối và provider lỗi.

**Gate:** không còn lỗi chặn luồng cốt lõi; mọi claim có evidence; liệt kê các giới hạn chưa giải quyết. Nếu thiếu live credentials hoặc Chrome/audio evidence, bàn giao là implementation candidate còn blocked, không gọi MVP hoàn tất.

**Đầu ra:** PR cuối, evidence matrix, hướng dẫn chạy, ảnh UI, danh sách rủi ro, báo cáo tiếng Việt. Review của user ở cuối; vẫn không tự merge/release.

### Phase 09 — measured private beta, ngoài phạm vi hiện tại

Chỉ đề xuất sau khi người dùng review MVP: nhóm thử nghiệm, consent thực tế, reliability/latency, helpfulness, learning value và cost. Không tự mời người, gửi tin nhắn, publish hay triển khai production.

## 5. Thứ tự tiếp tục được đề xuất

1. Chụp Git/WIP, đọc đủ source-of-truth và ADR; đối chiếu snapshot trong tài liệu này.
2. Chạy lại kiểm tra hiện tại, lưu log vào evidence artifact phù hợp; không dựa vào log `/tmp` lâu dài.
3. Hoàn thiện Phase 06 và tách file thuộc Phase 07/08 ra khỏi commit Phase 06 mà vẫn giữ chúng trong worktree.
4. Khép các gate Phase 02–04: unpacked extension, capture và live Agora. Có thể thực hiện sớm song song về thứ tự công việc nếu không phải tạo agent phụ; không cần viết lại code đã có.
5. Hoàn thiện AI configuration/Phase 05 validation và Phase 07.
6. Phase 08 integrated hardening, đồng bộ docs và báo cáo để user review.

Không đặt ETA trước khi biết provider key và runtime Chrome/audio hoạt động. Ưu tiên rủi ro capture/lifecycle trước polishing bổ sung.

## 6. Các điểm kỹ thuật phải review trước khi bàn giao

Đây là các rủi ro cần test/triage, không phải tất cả đã được xác nhận thành lỗi runtime:

- Pause trong khi transcript flush đang bay: tránh API từ chối batch làm dừng nhầm session.
- Stop trong lúc `getUserMedia`, join hoặc start đang chờ: tránh resource bị tạo lại sau cleanup hoặc Promise tự chờ nhau.
- UI không được nuốt lỗi stop cục bộ rồi báo stopped chỉ vì server stop trả thành công.
- RTM disconnect/expiry phải có recovery hoặc stop trung thực, không chỉ theo dõi RTC.
- Transcript history callback là full history: tránh append trùng, revision rollback và mất partial cuối.
- Request provider accepted nhưng client timeout: quản lý remote orphan và tính phí.
- Evidence ID hợp lệ không đủ bảo đảm nội dung grounding đúng; cần model evaluation synthetic.
- Modal deletion cần focus trap/restore và Escape; ARIA attributes riêng lẻ chưa đủ.
- Profile/session deletion phải nói rõ phạm vi snapshots và provider copies.
- Offscreen bundle khoảng 2.9 MB minified có warning >500 kB; đo startup/cost thực tế, không chỉ tăng warning threshold.
- Single-process encrypted JSON không có transaction/multi-process coordination; không dùng như production storage mặc định.
- Cập nhật checklist phase chỉ sau khi acceptance tương ứng thật sự đạt.

## 7. Evidence hiện có và giới hạn

Kiểm tra gần nhất trong lượt triển khai: `npm run verify` đạt lint, typecheck, **6 tests**, build extension/backend. Tests gồm auth/origin, partial capture cleanup, concurrent lifecycle, encrypted persistence, stale translation và context snapshot/clarification fallback.

`git diff --check` đạt tại snapshot. `agora-baseline/` vẫn ignored, không có file tracked. Chưa có Tranz browser screenshot, unpacked load, real audio/RTC/RTM, live AI output, latency benchmark hoặc production evidence. Phase 00 baseline evidence không thay thế những kiểm tra này.

Môi trường: Node 22.23.2; npm install đã hoàn tất sau khi giải phóng npm download cache. Ổ trong từng cạn dung lượng; kiểm tra dung lượng trước thao tác lớn. Attempt cài dependencies ra ổ ngoài đã hủy; repo dùng local node_modules bình thường. Không xóa dữ liệu người dùng để giải phóng chỗ.

## 8. Mẫu báo cáo cuối

- Đã thay đổi gì và phạm vi không thay đổi.
- File/branch/commit/PR; các thay đổi local chưa commit.
- Commands + kết quả, tách automated/browser/live-provider.
- Evidence cho từng acceptance gate.
- Giới hạn, blockers và quyết định user còn cần đưa ra.
- Cách chạy và review MVP.
- Chưa merge, chưa release/production, chưa bắt đầu Phase 09.
