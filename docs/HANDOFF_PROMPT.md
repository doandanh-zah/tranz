# Prompt handoff — tiếp tục hoàn thiện Tranz MVP

Copy phần dưới vào task mới. Cần dùng **working directory hiện tại có WIP**, không chỉ clone từ GitHub vì một số file chưa commit.

---

Bạn tiếp tục dự án Tranz tại:

`/Users/doandothanhdanh/Desktop/ZAH_CODE/Tranz`

Repository private: https://github.com/doandanh-zah/tranz

## Yêu cầu của tôi

Hoàn thiện MVP end-to-end theo kế hoạch trong `docs/MVP_DELIVERY_PLAN.md`. Tôi đã duyệt triển khai Phase 02–08 và sẽ review bản tích hợp ở cuối. AI provider dùng OpenAI-compatible; API key được cấu hình cục bộ, không yêu cầu tôi gửi secret trong chat.

Hãy làm phần đã được duyệt đến khi hoàn tất hoặc gặp blocker thật sự; không dừng xin duyệt lại từng bước thông thường. Không tự merge bất kỳ PR nào, không deploy production, publish extension hoặc bắt đầu Phase 09/P2. Nếu còn thiếu live verification, báo implementation candidate còn blocked, không tuyên bố MVP đã hoàn thành.

## Đọc trước khi sửa

1. README.md
2. AGENTS.md
3. PRODUCT.md
4. ARCHITECTURE.md
5. DESIGN.md
6. WORKFLOW.md
7. TODOS.md
8. BACKLOG.md — context only
9. CHANGELOG.md
10. docs/decisions/0001-agora-convoai-baseline.md
11. docs/decisions/0002-local-mvp.md
12. docs/MVP_DELIVERY_PLAN.md
13. docs/evidence/phase-02.md đến phase-05.md

Tài liệu cũ còn các mô tả “chưa scaffold” hoặc “Phase 01 only”. Đối chiếu với user authorization ngày 2026-09-29 trong WORKFLOW/TODOS và code hiện tại; không xóa lịch sử hoặc tự mở rộng scope. Đồng bộ handbook để phân biệt baseline validated, implementation tested và runtime chưa chứng minh.

## Trạng thái handoff cần xác minh lại

- Version: 0.1.0.
- Branch: `feat/grounded-assistance`, tạo từ `feat/linked-translation`.
- HEAD lúc handoff: `b0457aa` — `feat: add revision-linked vietnamese translation`.
- Branch hiện tại chưa có commit riêng/PR.
- `main` chưa merge; không thay đổi main.
- Có WIP local phải giữ nguyên.

PR stack đang mở:

- #1 `docs/project-handbook` → `main`.
- #2 `feat/mvp-foundation` → `docs/project-handbook`.
- #3 `feat/audio-capture` → `feat/mvp-foundation`.
- #4 `feat/agora-lifecycle` → `feat/audio-capture`.
- #5 `feat/linked-translation` → `feat/agora-lifecycle`.

Application WIP:

- Modified: `apps/extension/src/main.tsx`, `apps/server/app.ts`.
- Untracked: `apps/extension/src/App.tsx`, `apps/extension/src/style.css`, `apps/server/assistance.ts`, `apps/server/learning.ts`, `tests/assistance.test.ts`.
- Planning handoff cũng sửa `TODOS.md` và thêm hai tài liệu trong `docs/`; kiểm tra Git thay vì giả định worktree sạch.
- `learning.ts` chưa đăng ký vào server; UI gọi finalize/save nhưng luồng này chưa hoạt động end-to-end.

Không reset, clean, discard hay stage toàn bộ bằng `git add .`. Review diff và chỉ commit các file đúng phase. Không sửa, track, di chuyển hoặc xóa `agora-baseline/`; không tạo CLAUDE.md.

## Implementation hiện có

- TypeScript, React/Vite MV3 extension và Fastify backend bind 127.0.0.1:4318.
- Auth local single-owner bằng bearer token, exact-origin pairing; không phải multi-user SaaS.
- Shared Zod contracts; encrypted local JSON store single process.
- Tab capture + microphone ở offscreen document, tab playback riêng, pause/mute/stop.
- Agora server-owned channel/UID, token RTC/RTM riêng 10 phút, join readiness, client không subscribe/play TTS, heartbeat watchdog.
- OpenAI-compatible adapter có timeout/concurrency/request limits; dịch final segment gắn revision.
- Context CRUD/immutable snapshot, reply/catch-up/composer đang WIP.
- UI Session/Context/Library/Settings đã dựng local nhưng chưa rendered/browser-validated.

Không playback TTS không có nghĩa provider ngừng tạo TTS hoặc ngừng tính phí. Mix audio không xác định speaker. Không tuyên bố grounding đúng chỉ vì evidence IDs hợp lệ.

## Bắt đầu công việc

1. Kiểm tra Git status, branch, log, PR và dung lượng đĩa; giữ mọi WIP.
2. Đọc kế hoạch và triage các rủi ro ở mục 6 trước khi tiếp tục.
3. Chạy `npm run verify`, xem lint/typecheck/tests/build và diff. Lần gần nhất đạt 6 tests, có warning offscreen bundle >500 kB; không coi đó là browser/audio evidence.
4. Hoàn thiện Phase 06 trong branch hiện tại; tách code Phase 07/08 khi commit.
5. Hoàn tất các gate capture/Agora thật với synthetic audio, cấu hình AI local, rồi Phase 07 và Phase 08. Nếu một gate bị chặn, ghi chính xác điều còn thiếu và tiếp tục phần độc lập an toàn.
6. Mỗi phase có commit/PR/evidence riêng. Tiếp tục stack branch từ phase trước; không merge/rebase/force-push shared history tự động.

## Bắt buộc kiểm chứng

- Unpacked Chrome extension; widths 320/360/400/480/600 px, keyboard, focus/dialog, reduced motion, zoom, overflow.
- Tab audio, microphone, playback preservation, permission denial, mute/pause/resume, stop khi đang start, tab close và cleanup.
- Agora accepted request → runtime join → usable real transcript; renewal, RTM/RTC failure, duplicate start/stop, cleanup remote failure.
- Translation/reply/catch-up/composer với provider thật sau khi config; schema/timeout/429/missing key; stale responses và prompt injection.
- Finalize idempotent từ góc nhìn user; retention off/on, save/reopen, delete source + derived data, in-flight completion sau delete và restart.
- No raw audio storage, no provider secrets in bundle/logs/chat, narrow permissions, no fabricated transcript/success.

Chỉ dùng fixtures synthetic và ghi rõ test/mock. Chưa có Tranz real-browser/audio/provider evidence trong handoff; Agora Phase 00 baseline không thay thế các gate này.

## Kết quả tôi muốn nhận

Bản MVP chạy được, hướng dẫn cài/chạy/review, tài liệu evidence tiếng Việt, danh sách file/branch/commit/PR, test results và browser/live evidence, phần còn thiếu/rủi ro nói rõ. Đồng bộ source-of-truth docs và TODOS. Dừng chờ tôi review; không merge hoặc release.
