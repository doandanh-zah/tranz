# Bằng chứng dịch nhanh trên thiết bị — 2026-10-03

Phạm vi: Phase 08T trên `feat/fast-translation`, xếp chồng trên `fix/google-meet-e2e`. Không dùng nội dung họp thật, không bật Google Cloud API và không tạo chi phí hay credential mới.

## Kết quả runtime thật

Lệnh kiểm tra dùng profile trình duyệt tạm, tự xoá sau khi chạy:

```bash
TRANZ_CHROMIUM='/Applications/CocCoc.app/Contents/MacOS/CocCoc' npm run verify:translator -- --translate
```

- Cốc Cốc `152.0.7977.124` có Translator API và báo EN→VI là `downloadable`.
- Tải/khởi tạo gói lần đầu: `8,725.5 ms`.
- Năm câu synthetic sau khi model sẵn sàng: `34.0`, `12.4`, `12.5`, `10.4`, `13.1 ms`.
- Kết quả tiếng Việt có nghĩa phù hợp cho năm câu kiểm tra công việc thông thường.

Đây là bằng chứng khả năng và latency với câu synthetic trong một browser, không phải bằng chứng chất lượng trong cuộc họp nhiều người.

## Rào an toàn đã kiểm tra

- Dịch chạy tuần tự bằng một translator dùng chung; không tạo nhiều lượt tải/model song song.
- Backend chỉ lưu kết quả cho final segment có đúng id/revision; kết quả cũ bị bỏ qua.
- Tối đa 8 câu/lượt lưu, tối đa 8.000 ký tự/kết quả.
- Fast path không gọi AI provider. Khi browser không có Translator API, UI nói rõ và mock ChatGPT fallback được gọi.
- Meeting start không bị khoá trong lúc tải gói ngôn ngữ.
- Audio capture, Agora credentials và lifecycle không thay đổi.

## Kiểm tra

- `npm run typecheck`: đạt.
- `npm test`: 34/34 đạt.
- `TRANZ_CHROMIUM=... npm run verify:ui`: 45/45 đạt; ảnh ở `artifacts/ui/` được xem lại ở home, Settings và live view.
- `npm run verify:translator`: API có mặt, EN→VI `downloadable`.
- `npm run verify:translator -- --translate`: tải thật và dịch năm câu synthetic đạt.

Full lint/build/capture được ghi trong PR handoff; Agora live và Google Meet nhiều người không chạy lại vì phase này không đổi audio/RTC.
