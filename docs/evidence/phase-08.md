# Phase 08 — hardening và bàn giao bản tích hợp

Ngày: 2026-09-29. Branch `feat/mvp-hardening` (xếp chồng trên `feat/learning-notes`).

## Lỗi đã xác nhận và sửa

| Rủi ro trong kế hoạch (mục 6) | Kết quả triage | Sửa |
| --- | --- | --- |
| Pause khi transcript đang flush | **Lỗi thật:** server từ chối segment khi `paused` → flush lỗi → runtime tự `stop()` | Server nhận segment khi `paused`/`reconnecting`; lỗi mạng tạm thời được giữ để thử lại; chỉ dừng khi server báo session đã kết thúc |
| Heartbeat lỗi một lần là dừng | **Lỗi thật** | Chỉ dừng sau 4 lần lỗi liên tiếp (~60 s) hoặc khi server trả 404/409 |
| RTC reconnect thành công | **Lỗi thật:** gọi `stop()` khi đã kết nối lại | Tự tiếp tục gửi audio (trừ khi người dùng pause) |
| RTM mất kết nối/hết hạn | **Thiếu:** không theo dõi trạng thái RTM | Lắng nghe `linkState` trước login; `FAILED` → dừng có lý do; `SUSPENDED/CONNECTING/DISCONNECTED` → `reconnecting`, chặn audio |
| Lỗi agent bất kỳ dừng phiên | **Rủi ro thật:** lỗi LLM/TTS của agent thụ động làm mất transcript | Chỉ lỗi ASR dừng phiên |
| UI nuốt lỗi stop cục bộ | **Lỗi thật:** worker thay mọi lỗi bằng câu chung; UI bỏ qua lỗi stop | Worker giữ thông báo cụ thể; đóng offscreen document sau stop để bảo đảm giải phóng track; UI báo nếu không xác nhận được việc giải phóng |
| Dừng không rõ lý do | **Thiếu** | `endedReason` cho mọi lần dừng, panel giải thích |
| Start accepted nhưng response mất → agent mồ côi | **Rủi ro thật** | Backend liệt kê agent trong kênh và dừng (best effort; chưa chạy với Agora thật) |
| Lỗi provider gộp chung | **Thiếu** | Phân loại 401/403/404/429/5xx/timeout/sai schema, không lộ key |
| Mở lại panel giữa phiên | **Thiếu:** trạng thái mute sai, không phát hiện runtime đã mất | Lệnh `status` từ offscreen; cảnh báo nếu backend còn phiên nhưng không có capture |
| Transcript history full/duplicate, revision rollback | Đã có dedupe; thêm: dòng final không bao giờ lùi về partial ở cả client và server | Test |
| Dialog xóa focus/Escape | Đã làm ở Phase 06 (native `<dialog>`) | Browser check |
| Offscreen bundle 2.9 MB | Chỉ tải cục bộ khi bắt đầu phiên; chưa đo tác động thực | Ghi vào ADR, BACKLOG |
| Store single-process | Giữ nguyên cho MVP local | Ghi rõ giới hạn; thêm trần 500 session, 3.000 dòng/phiên |

## Kiểm chứng

### Automated — `npm run verify`

Lint, strict typecheck, build extension/backend và **24/24 test** đạt. Test mới Phase 08:

- segment được nhận khi pause/reconnect, bị từ chối sau stop;
- dòng final không lùi về partial, revision cũ bị bỏ qua;
- lý do dừng đầu tiên được giữ; lý do không hợp lệ → 400;
- watchdog dừng phiên im lặng (`inactive`), phiên quá 1 giờ (`time-limit`), xóa phiên tạm đã hết hạn, giữ phiên được lưu;
- start thất bại → dọn kênh, báo lỗi, không chặn phiên mới;
- giới hạn 3.000 dòng được báo;
- phân loại lỗi provider (401/404/429/500, JSON sai, sai schema) và không lộ API key.

Build vẫn cảnh báo chunk offscreen > 500 kB (đã ghi nhận, không tăng ngưỡng).

### Browser — `npm run verify:ui` (43/43)

Extension unpacked thật trong Chrome for Testing 1234 headless; AI mock `[MOCK]`; session mô phỏng. Thêm so với Phase 07: banner giải thích lý do dừng tự động. Kết quả: `phase-08/ui-results.json`, ảnh `phase-08/*.png`.

### Browser — `npm run verify:capture` (9/9)

Chrome for Testing 1234 có cửa sổ (đặt ngoài màn hình, vì headless không mở được luồng tab capture). Một tab "cuộc họp" synthetic phát sóng 440 Hz; extension lấy stream ID bằng `chrome.tabCapture` và chạy class `Capture` thật; micro được thay bằng sóng 880 Hz synthetic (micro thật không bao giờ được mở). Kết quả đo RMS của luồng gửi đi:

| Bước | RMS |
| --- | --- |
| Đang nghe (tab + mic) | ~0,50 |
| Pause | 0,00000 |
| Resume | ~0,50 |
| Tab im lặng, chỉ mic | ~0,46 |
| Mute mic (tab im lặng) | 0,00000 |
| Mute mic, tab phát lại | ~0,18 |

Stop kết thúc mọi track nguồn và track gửi đi. Từ chối quyền micro (mô phỏng bằng `NotAllowedError`) sau khi đã có tab stream → tab track được giải phóng. Kết quả: `phase-08/capture-results.json`.

**Giới hạn:** chạy `Capture` trong trang extension, không qua đường worker → offscreen với quyền activeTab thật (Playwright không bấm được icon toolbar); không có loa nên không chứng minh âm thanh cuộc họp vẫn nghe được; không phải Google Meet; từ chối quyền là mô phỏng.

### Bảo mật và quyền

- `npm audit --omit=dev`: 0 lỗ hổng.
- Quét bundle extension: không có giá trị secret; chỉ có chữ "ACCESS_TOKEN" trong hướng dẫn UI.
- `git ls-files`: không track `agora-baseline/`, `.env`, `.tranz-data/`.
- Quyền manifest giữ nguyên (CSP thêm `'wasm-unsafe-eval'` cho Agora RTM): `sidePanel`, `offscreen`, `tabCapture`, `activeTab`, `storage`; host duy nhất `http://127.0.0.1:4318/*` (kiểm tra trong trình duyệt).

### Provider thật

`npm run eval:grounding` đã được viết (6 tình huống synthetic: fact có căn cứ, fact không có căn cứ, tin đồn mâu thuẫn, prompt injection, bản dịch giữ thuật ngữ, composer không thêm số). **Chưa chạy được:** repo không có `.env`/`AI_API_KEY`. Script báo `BLOCKED` và thoát mã 2.

## Góp ý của người dùng: trang trắng (2026-09-29)

- **Cửa sổ Chrome for Testing trắng:** do `verify:capture`/`verify:live` phải chạy có cửa sổ. Nay cửa sổ được thu nhỏ bằng CDP ngay khi mở, tab cuộc họp synthetic mở ở nền bằng `chrome.tabs.create({active:false})`, và mọi trang test có dòng chữ "Tranz automated test page… safe to ignore".
- **Panel Tranz trắng:** các lệnh kiểm tra từng build lại `dist/extension` mà Chrome đang load. Nay `npm run verify` và các harness build vào `artifacts/verify-build`; chỉ `npm run build` ghi `dist/`. `index.html` có nội dung chờ tĩnh ("Loading Tranz… If this stays… Reload") và App được bọc error boundary, nên panel không còn trắng tinh khi thiếu file hoặc lỗi render.

- **Tiếng "Hello team…" lặp lại trên loa:** giọng nói synthetic của test live phát ra loa (tab test tự phát, và Tranz cố ý route âm thanh tab ra loa như trong cuộc họp thật). Test gia hạn token đã bị dừng theo yêu cầu, agent được dọn sạch (Agora báo 0 agent). Nay test chạy im lặng: xem [live-agora.md](live-agora.md).

## Không thay đổi

Quyền manifest (CSP được bổ sung `'wasm-unsafe-eval'` sau lần chạy live, xem [live-agora.md](live-agora.md)); định dạng lưu trữ (tương thích ngược, thêm trường tùy chọn); không merge, không release, không deploy, không bắt đầu Phase 09.
