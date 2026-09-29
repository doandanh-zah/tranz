# Hướng dẫn cài đặt, chạy và review Tranz MVP

Tài liệu cho người review bản tích hợp (branch `feat/mvp-hardening`, PR #8, xếp chồng trên #1–#7). Đây là **implementation candidate**: các gate live (Agora thật, Google Meet, AI provider thật) chưa được chứng minh. Xem [ma trận nghiệm thu](evidence/mvp-acceptance.md).

## 1. Chuẩn bị

Yêu cầu: macOS/Linux, Node.js 22.12+, npm, Chrome 116+.

```bash
git switch feat/mvp-hardening
npm ci
npm run setup
```

`npm run setup` tạo `.env` (quyền 0600) với `ACCESS_TOKEN` và `DATA_KEY` ngẫu nhiên, và **không ghi đè** nếu `.env` đã tồn tại. Tự điền bằng tay trong `.env`, không dán vào chat hay commit:

| Biến | Ý nghĩa |
| --- | --- |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | Bắt buộc để bắt đầu nghe. Nên rotate certificate đã lộ ở Phase 00 trước khi dùng. |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Provider OpenAI-compatible, cần hỗ trợ `response_format: json_object`. Thiếu key thì transcript vẫn chạy, dịch/gợi ý/notes báo "cần API key". |
| `EXTENSION_ID` | ID của extension sau khi load unpacked (bước 3). |

## 2. Build và chạy backend

```bash
npm run verify     # lint, typecheck, 24 test, build
npm run dev        # backend tại http://127.0.0.1:4318
```

Backend chỉ bind 127.0.0.1. Dữ liệu mã hóa nằm ở `.tranz-data/` (đã ignore).

## 3. Load extension

1. Mở `chrome://extensions`, bật **Developer mode**, chọn **Load unpacked** → thư mục `dist/extension`.
2. Copy ID của extension vào `EXTENSION_ID` trong `.env`, dừng rồi chạy lại `npm run dev`.
3. Sau mỗi lần `npm run build`, bấm **Reload** trên trang extensions.

## 4. Luồng review đề xuất

1. Mở một Google Meet test call. Bấm icon Tranz trên thanh công cụ **khi đang ở tab Meet** (bắt buộc: Chrome chỉ cho capture tab mà extension được gọi).
2. Side panel mở ra → dán `ACCESS_TOKEN` → Connect.
3. **Context** → tạo profile với dữ liệu synthetic (ví dụ: "Beta ships after QA sign-off; launch date undecided").
4. **Session** → xem snapshot context, bấm **Check microphone** (nếu side panel không hiện hộp thoại quyền, chọn "Open in a tab instead"), chọn có giữ phiên hay không, tick consent.
5. **Start listening** → trạng thái `Connecting…` cho tới khi transcriber Agora thật sự vào kênh, rồi `Listening`.
6. Phát giọng nói synthetic (TTS từ máy khác hoặc file audio tự tạo) trong cuộc gọi. Kiểm tra dòng tiếng Anh, `Hearing…`, bản dịch tiếng Việt.
7. **Suggest a reply**, các chip Shorter/Simpler/Professional/Clarify, **Catch me up**, composer tiếng Việt.
8. **Pause** → đọc banner; **Mute** micro; **Resume**; **Stop**.
9. Xem **Meeting notes** tự tạo; **Keep this session** nếu là phiên tạm; mở lại trong **Library**; **Delete** và xác nhận.
10. Thử lỗi: tắt backend giữa phiên, đóng tab Meet, từ chối quyền micro, xóa `AI_API_KEY`.

Không dùng nội dung cuộc họp thật cho đến khi chính sách lưu giữ của provider được chấp thuận.

## 5. Kiểm tra tự động có sẵn

```bash
npm run verify           # lint, typecheck, test, build
npm run verify:ui        # extension unpacked trong Chromium, AI mock, 42 check
npm run verify:capture   # tab capture thật trong Chromium với âm synthetic, 9 check (mở cửa sổ ngoài màn hình)
npm run eval:grounding   # gọi AI provider thật với 6 tình huống synthetic (tốn vài request)
```

Nếu Playwright báo thiếu trình duyệt, đặt `TRANZ_CHROMIUM` trỏ tới Chrome for Testing hoặc Chromium đã có (Chrome thương hiệu không hỗ trợ `--load-extension`).

## 6. Checklist live còn mở (cần bạn thực hiện hoặc cấp điều kiện)

- [ ] Agent Agora thật: accepted → join → transcript qua RTM → stop, không còn agent trong kênh (kiểm tra Agora Console).
- [ ] Token renewal sau 10 phút trong phiên dài hơn 10 phút.
- [ ] Mất mạng ngắn → `Reconnecting` → tự phục hồi; mất lâu → dừng với lý do.
- [ ] Âm thanh cuộc họp vẫn nghe được trong lúc capture, pause, mute; người khác không nghe thấy gì từ Tranz.
- [ ] Đóng tab Meet khi đang nghe → phiên dừng với lý do "meeting tab was closed".
- [ ] Side panel thật ở các độ rộng 320–600 px (kéo mép panel), zoom 200%, VoiceOver.
- [ ] Chất lượng/latency dịch và gợi ý với provider thật; chi phí Agora khi agent LLM/TTS vẫn chạy ở chế độ im lặng.

## 7. Dọn dẹp

Xóa phiên trong UI (Library → Delete). Để xóa toàn bộ dữ liệu cục bộ: dừng backend và xóa thư mục `.tranz-data/`. Xóa cục bộ không thu hồi được dữ liệu đã gửi tới Agora hoặc AI provider.
