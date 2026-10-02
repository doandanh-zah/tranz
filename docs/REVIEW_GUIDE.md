# Hướng dẫn cài đặt, chạy và review Tranz MVP

Tài liệu cho người review bản tích hợp trên branch hiện tại `fix/google-meet-e2e` (xếp chồng trên `feat/monochrome-dark-ui`). Đây là **implementation candidate**: Agora và ChatGPT thật đã được kiểm tra bằng dữ liệu synthetic; side panel thật cũng đã chạy trong một cuộc gọi Google Meet đã đăng nhập. Âm thanh người tham gia từ tab, playback nghe được và giá trị trong cuộc họp nhiều người vẫn chưa được chứng minh. Xem [ma trận nghiệm thu](evidence/mvp-acceptance.md) và [bằng chứng tích hợp Meet](evidence/google-meet-integration-2026-10-02.md).

## 1. Chuẩn bị

Yêu cầu: macOS/Linux, Node.js 22.12+, npm, Chrome 116+, Codex CLI (`codex --version`) cho provider ChatGPT.

```bash
git switch fix/google-meet-e2e
npm ci
npm run setup
```

`npm run setup` tạo `.env` (quyền 0600) với `ACCESS_TOKEN` và `DATA_KEY` ngẫu nhiên, và **không ghi đè** nếu `.env` đã tồn tại. Tự điền bằng tay trong `.env`, không dán vào chat hay commit:

| Biến | Ý nghĩa |
| --- | --- |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | Bắt buộc để bắt đầu nghe. Nên rotate certificate đã lộ ở Phase 00 trước khi dùng. |
| `AI_PROVIDER` | Mặc định `chatgpt`: dùng gói ChatGPT qua Codex CLI, đăng nhập bằng nút **Đăng nhập ChatGPT** trong checklist hoặc Cài đặt (xem [provider ChatGPT](evidence/chatgpt-provider.md)). Đặt `openai` để dùng `AI_API_KEY` thay thế. |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Chỉ cần khi `AI_PROVIDER=openai`. |
| `EXTENSION_ID` | ID của extension sau khi load unpacked (bước 3). |

## 2. Build và chạy backend

```bash
npm run verify     # lint, typecheck, test, build
npm run dev        # backend tại http://127.0.0.1:4318
```

Backend chỉ bind 127.0.0.1. Dữ liệu mã hóa nằm ở `.tranz-data/` (đã ignore).

## 3. Load extension

1. Mở `chrome://extensions`, bật **Developer mode**, chọn **Load unpacked** → thư mục `dist/extension`.
2. Copy ID của extension vào `EXTENSION_ID` trong `.env`, dừng rồi chạy lại `npm run dev`.
3. Sau mỗi lần `npm run build` (hoặc khi đổi `manifest.json`), bấm **Reload** trên trang extensions. Nếu panel chỉ hiện “Đang mở Tranz…” hoặc thông báo lỗi, đó là dấu hiệu cần Reload.

## 4. Luồng review đề xuất

1. Mở một Google Meet test call. Bấm icon Tranz trên thanh công cụ **khi đang ở tab Meet** (bắt buộc: Chrome chỉ cho capture tab mà extension được gọi).
2. Side panel (tiếng Việt) tự kết nối, không cần dán mã. Làm theo checklist: **Đăng nhập ChatGPT** (trên trang OpenAI), **Cho phép micro**, và mở từ tab Google Meet.
3. (Không bắt buộc) **Ngữ cảnh** → tạo ngữ cảnh với dữ liệu synthetic (ví dụ: "Beta ships after QA sign-off; launch date undecided").
4. **Cuộc họp** → mở "Tuỳ chọn cho cuộc họp này" nếu muốn chọn ngữ cảnh hoặc lưu phiên.
5. **Bắt đầu nghe** → trạng thái **Đang kết nối** cho tới khi bộ chuyển giọng nói Agora thật sự vào kênh, rồi **Đang nghe**.
6. Phát giọng nói synthetic (TTS từ máy khác hoặc file audio tự tạo) trong cuộc gọi. Kiểm tra dòng tiếng Anh, **Đang nghe…**, bản dịch tiếng Việt.
7. Thử **Gợi ý câu trả lời**, các nút **Ngắn hơn** / **Dễ nói hơn** / **Chuyên nghiệp hơn** / **Hỏi lại cho rõ**, **Tóm tắt vừa rồi** và ô **Tôi muốn nói…**.
8. **Tạm dừng** → đọc banner; tắt/bật micro; **Tiếp tục**; **Dừng**.
9. Xem **Ghi chú cuộc họp** tự tạo; **Lưu phiên này** nếu là phiên tạm; mở lại trong **Đã lưu**; **Xoá** và xác nhận.
10. Thử lỗi: tắt backend giữa phiên, đóng tab Meet, từ chối quyền micro, xóa `AI_API_KEY`.

Không dùng nội dung cuộc họp thật cho đến khi chính sách lưu giữ của provider được chấp thuận.

## 5. Kiểm tra tự động có sẵn

```bash
npm run verify           # lint, typecheck, test, build
npm run verify:ui        # extension unpacked trong Chromium, AI mock, 43 check
npm run verify:capture   # tab capture thật trong Chromium với âm synthetic, 9 check (cửa sổ thu nhỏ, im lặng)
npm run verify:live      # Agora thật + giọng nói synthetic (say), khoảng 2 phút, tốn phút Agora
npm run verify:live -- --renewal   # giữ phiên ~11 phút để kiểm tra gia hạn token
npm run eval:grounding   # gọi AI provider thật (mặc định gói ChatGPT) với 6 tình huống synthetic, tốn vài lượt
```

Các lệnh kiểm tra build vào `artifacts/verify-build` và **không** ghi đè `dist/extension` bạn đang load. `verify:capture` và `verify:live` cần mở cửa sổ Chrome for Testing (headless không capture được âm thanh tab): cửa sổ được thu nhỏ ngay và trang có dòng chữ "Tranz automated test page" — có thể bỏ qua, nó tự đóng.

Nếu Playwright báo thiếu trình duyệt, đặt `TRANZ_CHROMIUM` trỏ tới Chrome for Testing hoặc Chromium đã có (Chrome thương hiệu không hỗ trợ `--load-extension`).

## 6. Checklist live còn mở (cần bạn thực hiện hoặc cấp điều kiện)

- [x] Agent Agora thật: accepted → join → transcript qua RTM → stop, không còn agent trong kênh — đạt với giọng nói synthetic (`verify:live`).
- [x] Side panel thật trong Google Meet đã đăng nhập: tự ghép extension, start, tab capture active, mic synthetic → transcript → dịch/gợi ý ChatGPT, stop và cleanup.
- [ ] Mất mạng ngắn → **Đang kết nối lại** → tự phục hồi; mất lâu → dừng với lý do.
- [ ] Người tham gia thứ hai nói → audio từ tab Meet vào transcript; âm thanh cuộc họp vẫn nghe được trong lúc capture, pause, mute; người khác không nghe thấy gì từ Tranz.
- [ ] Đóng tab Meet khi đang nghe → phiên dừng với lý do **Đã dừng vì tab cuộc họp đã đóng**.
- [ ] Side panel thật ở các độ rộng 320–600 px (kéo mép panel), zoom 200%, VoiceOver.
- [ ] Chất lượng/latency dịch và gợi ý với provider thật; chi phí Agora khi agent LLM/TTS vẫn chạy ở chế độ im lặng.

## 7. Dọn dẹp

Xoá phiên trong giao diện (**Đã lưu** → **Xoá**). Để xoá toàn bộ dữ liệu cục bộ: dừng backend và xoá thư mục `.tranz-data/`. Xoá cục bộ không thu hồi được dữ liệu đã gửi tới Agora hoặc AI provider.
