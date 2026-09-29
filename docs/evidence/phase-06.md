# Phase 06 — context và gợi ý có căn cứ

Ngày: 2026-09-29. Branch `feat/grounded-assistance` (xếp chồng trên `feat/linked-translation`).

## Đã làm

- Context profile: tạo, sửa (tăng `version`), xóa, chọn; tối đa 50 profile. Session giữ snapshot bất biến của profile tại thời điểm tạo.
- `POST /api/sessions/:id/assist` với ba loại: `reply` (gợi ý trả lời tiếng Anh), `catch-up` (tóm tắt tiếng Việt), `compose` (viết lại nháp tiếng Việt thành tiếng Anh).
- Chỉ gửi dữ liệu cần thiết: 30/12/6 dòng final gần nhất theo loại yêu cầu; không gửi ID lưu trữ của profile.
- Evidence chỉ giữ ID dòng transcript có thật và `profile` khi snapshot có nội dung. Reply không có nguồn hợp lệ bị thay bằng câu hỏi làm rõ, `uncertain: true`.
- Kết quả trễ sau khi session bị xóa bị loại (409), không làm dữ liệu sống lại.
- UI side panel được tách thành component: Connect, Prepare, Live, Context, Library, Settings, dialog xác nhận. Có trạng thái backend offline, token sai/hết hạn, thiếu profile, thiếu Agora, thiếu AI, quyền microphone.

## Kiểm chứng

Automated (`npm run verify`): lint, typecheck, build và 11 test đạt, trong đó 6 test mới của Phase 06:

- snapshot bất biến sau khi sửa profile; thiếu căn cứ → câu hỏi làm rõ;
- lọc evidence ID bịa và bỏ `profile` khi snapshot rỗng;
- transcript chứa câu prompt injection chỉ đi vào phần data, không vào instruction; payload không chứa token;
- catch-up cần transcript final, compose chạy từ nháp;
- completion trễ sau khi xóa session bị loại;
- profile không hợp lệ, profile không tồn tại, thiếu `AI_API_KEY` trả lỗi trung thực (400/404/503).

Browser (`node scripts/verify-ui.mjs`): load unpacked extension thật trong Chrome for Testing 1234 (headless), render `index.html` của extension trong tab ở 320/360/400/480/600 px. Kết quả ghi trong `docs/evidence/phase-06/results.json`. Đã kiểm tra: extension ID và quyền manifest; token sai; tạo profile qua form; start bị chặn khi thiếu profile/Agora/consent; không overflow ngang; thứ tự Tab và outline focus; dialog xóa (focus, Escape, trả focus); reduced motion; chữ 200% ở 400 px; backend offline.

**Giới hạn của bằng chứng:**

- AI là mock nội bộ, mọi output có tiền tố `[MOCK]`. Không đo chất lượng, độ trễ hay độ đúng grounding của model thật.
- Session "live" là mô phỏng: transcript synthetic được gửi thẳng vào API. Không có audio, RTC, RTM hay Agora.
- Trang extension được mở trong tab ở các độ rộng, không phải trong khung side panel thật của Chrome. Side panel thật cần kiểm tra thủ công.
- Chưa kiểm tra screen reader, contrast tự động hoặc zoom trình duyệt 200% ở 320 px.

## Chưa làm / chuyển phase sau

- Chưa có bộ đánh giá grounding với provider thật (Phase 08 cung cấp script chạy khi có key).
- Post-meeting notes, lưu/xóa và finalize thuộc Phase 07.
