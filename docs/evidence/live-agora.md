# Kiểm chứng Agora live với giọng nói synthetic

Ngày: 2026-09-29. Lệnh: `npm run verify:live` (và `-- --renewal`). Project Agora: project đã cấu hình trong `.env` của người dùng; credential chỉ được backend đọc, không in ra.

## Cách chạy

- Giọng nói synthetic tạo bằng `say` của macOS: "Hello team. This is a synthetic test of the Tranz transcript. The beta will be ready after QA sign off. Can you share when the next milestone is planned?", lặp lại với 3 giây im lặng.
- Một tab cục bộ phát âm thanh đó. Extension (bản copy tạm) lấy stream bằng `chrome.tabCapture` thật và chạy `Runtime` thật: publish RTC, login và subscribe RTM, backend tạm (cổng 4328) khởi động agent Conversational AI thật, rồi chờ agent vào kênh.
- Micro được thay bằng luồng im lặng; micro thật không được mở.
- Chrome for Testing 1234 có cửa sổ (thu nhỏ), vì headless không mở được luồng tab capture.
- **Im lặng trên loa** (sau góp ý của người dùng, từ lần chạy 5): tab synthetic chỉ phát sau khi đã bị capture (Chrome chuyển âm thanh tab vào luồng capture), và AudioContext của trang test xuất ra "không thiết bị" (`sinkId: {type: 'none'}`). Cờ `--mute-audio` không dùng được vì nó làm luồng tab capture thành im lặng.

## Lỗi tìm thấy nhờ chạy live (đã sửa)

| Lần chạy | Hiện tượng | Nguyên nhân | Sửa |
| --- | --- | --- | --- |
| 1 | Agent join nhưng 0 transcript; console báo CSP chặn WebAssembly | Agora RTM dùng WASM, CSP extension chỉ có `script-src 'self'` | Thêm `'wasm-unsafe-eval'` vào CSP (vẫn chặn `eval` JS) |
| 2–3 | Không lỗi console, track publish có âm lượng đúng nhịp nói, nhưng 0 message RTM | Runtime login RTM nhưng không `subscribe` kênh; `subscribeMessage` của toolkit chỉ gắn parser | Gọi `rtm.subscribe(channel)` như baseline; toolkit dùng `renderMode: TEXT` |
| 4 | 9/9 đạt (có phát ra loa) | — | — |
| 5 | 9/9 đạt, chạy im lặng | — | — |

## Kết quả (lần 4; lần 5 im lặng trong `live/live-agora.json`)

| Kiểm tra | Kết quả |
| --- | --- |
| Agent accepted → join kênh → runtime `listening` | Đạt, 8,2 s (lần 5: 10,0 s) |
| Transcript thật qua RTM (partial và final) | Đạt, dòng final đầu 1,5 s sau khi `listening` (lần 5: 2,3 s, vì giọng nói chỉ bắt đầu sau khi listening) |
| Nội dung khớp script synthetic | Đạt: "Hello, team." / "This is a synthetic test of the trans transcript." / "The beta will be ready after QA sign off." / "Can you share when the next milestone is planned?" |
| Pause báo về backend; không có dòng mới trong 15 s | Đạt, 0 dòng mới |
| Resume → transcript quay lại | Đạt, ~2 s |
| Stop: runtime giải phóng, session `stopped`, lý do `user` | Đạt |
| Hai lệnh stop trùng | Đạt, idempotent |
| Không còn agent trong kênh sau stop | Đạt, agent biến mất sau ~1,5 s |

Sai số nhận dạng nhỏ ("trans transcript" thay cho "Tranz transcript", câu đầu mất chữ "Can") là của STT với giọng synthetic, không phải của Tranz.

## Token renewal (`live/live-agora-renewal.json`)

Lần chạy im lặng `npm run verify:live -- --renewal`: **10/10 đạt**. Token RTC/RTM có hạn 600 s; runtime gia hạn khi Agora báo sắp hết hạn. Ở giây 692 phiên vẫn `listening` và transcript vẫn tăng (170 dòng ở giây 612, 188 dòng ở giây 672). Sau đó stop idempotent, agent rời kênh sau 2,9 s. Join tới listening lần này: 4,6 s; dòng final đầu: 2,5 s.

Lần chạy gia hạn trước (có tiếng) bị dừng ở giây 556 theo yêu cầu người dùng, trước mốc hết hạn; không dùng làm bằng chứng. Agent của lần đó đã được dọn (Agora báo 0 agent đang chạy).

## Phát hiện về privacy và chi phí

Agent "thụ động" **vẫn chạy LLM** trên transcript và sinh câu trả lời (quan sát được sự kiện `assistant.transcription`, ví dụ "What is the expected date for the next…"). Tranz bỏ qua các sự kiện này và không bao giờ phát audio của agent, nhưng:

- nội dung transcript đi qua LLM vendor do Agora quản lý;
- phần xử lý LLM/TTS đó bị tính phí vào project Agora.

Câu consent trong Prepare và mục Settings đã nói rõ điều này. Nếu không chấp nhận được, cần chuyển sang sản phẩm chỉ-STT của Agora hoặc một đường STT khác (quyết định kiến trúc, cần bạn duyệt).

## Chưa chứng minh

- Google Meet thật và việc người dùng vẫn nghe được cuộc họp.
- Đường đi qua service worker → offscreen document với quyền activeTab thật (test chạy cùng `Runtime` trong trang extension; Playwright không bấm được icon toolbar).
- Mất mạng thật và tự phục hồi (`Reconnecting`).
- Micro thật và nút Mute trong phiên live.
