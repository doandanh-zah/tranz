# Ma trận nghiệm thu MVP

Ngày: 2026-09-29. Trạng thái tổng: **implementation candidate, còn bị chặn ở các gate live**. Không tuyên bố MVP đã hoàn thành.

Mức bằng chứng:

- **A** — test tự động (Node, mock provider/Agora).
- **B** — extension unpacked thật trong Chromium, AI mock, session mô phỏng.
- **C** — Chromium thật với audio synthetic (tab capture thật).
- **L** — live với Agora/AI provider/Google Meet thật. **Chưa có mục nào đạt L.**

| # | Tiêu chí (kế hoạch mục 2 / PRODUCT) | Bằng chứng | Trạng thái |
| --- | --- | --- | --- |
| 1 | Luồng chạy trong unpacked extension | B: load, service worker, manifest, các view ở 320–600 px | Một phần — chưa kiểm tra khung side panel thật |
| 2 | Audio tab + micro không làm mất playback | C: tab + mic được mix, tab được route ra loa trong code | Một phần — chưa nghe thực tế trong Google Meet |
| 3 | Tranz không phát âm; mute/pause/stop đúng nghĩa | C: pause = im lặng, mute chỉ chặn mic, stop giải phóng track; code không subscribe audio agent | Một phần — chưa có phiên Agora thật; provider có thể vẫn chạy LLM/TTS và tính phí |
| 4 | Transcript/AI là dữ liệu thật; fixture ghi rõ synthetic | A/B: không có transcript giả trong sản phẩm; mọi output mock có `[MOCK]` | Đạt cho code; live chưa chạy |
| 5 | Credential chỉ ở backend; token có scope/hết hạn | A: auth/origin; token Agora 10 phút; quét bundle | Đạt (local) |
| 6 | Không lưu raw audio; lưu có opt-in; xóa bao phủ dữ liệu nguồn và dẫn xuất | A: phiên tạm không ghi đĩa, keep, xóa khi job đang chạy, restart | Đạt (local); không thu hồi được bản sao ở provider |
| 7 | Lỗi trung thực, có hướng khôi phục | A/B: backend offline, token sai, thiếu Agora/AI, lỗi provider phân loại, lý do dừng | Đạt cho các trạng thái mô phỏng được |
| 8 | Bằng chứng test/browser/live tách biệt | Tài liệu phase-02…08 | Đạt; live còn thiếu |
| PR-001/002 | Profile CRUD; xem snapshot chính xác | A/B | Đạt |
| PR-003/004 | EN→VI; không capture khi chưa bấm Start + consent | B | Đạt |
| PR-010 | Capture tab + micro | C | Một phần — chưa trên Google Meet |
| PR-011 | Partial/final ổn định | A/B | Đạt với dữ liệu mô phỏng |
| PR-012 | Bản dịch gắn đúng segment/revision | A/B | Đạt (mock) |
| PR-013/014 | Catch-up; phát hiện câu hỏi + gợi ý | A/B (heuristic có nhãn) | Đạt (mock) |
| PR-015/016 | Chỉ dùng context + transcript; thiếu căn cứ → làm rõ | A (lọc evidence, injection chỉ là data) | Contract đạt; **chất lượng model chưa đo** |
| PR-017 | Mute, pause, resume, stop | C + A | Đạt ở mức capture; chưa live |
| PR-018 | Lỗi quyền/kết nối/agent/transcript hiển thị và phục hồi được | A/B | Một phần — lỗi RTC/RTM thật chưa tái hiện |
| PR-020 | Kết thúc idempotent, một job xử lý | A | Đạt |
| PR-021 | Xem summary, quyết định, hành động, từ vựng, câu mẫu | B (mock) | Đạt về UI; chất lượng chưa đo |
| PR-022/023/024 | Xóa; lưu opt-in; không lưu raw audio | A/B | Đạt (local) |

## Gate đang bị chặn và điều cần để mở

| Gate | Thiếu gì | Ai cần làm |
| --- | --- | --- |
| Agora live (join, RTM transcript, renewal, reconnect, cleanup, chi phí agent im lặng) | `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` trong `.env` (nên rotate certificate Phase 00) | Người dùng cấu hình, rồi chạy checklist trong REVIEW_GUIDE |
| AI provider thật (dịch, gợi ý, notes; latency) | `AI_API_KEY` trong `.env` | Người dùng cấu hình, chạy `npm run eval:grounding` |
| Google Meet + playback nghe được + side panel thật | Cuộc gọi Meet đã đăng nhập, người thao tác thật trên Chrome | Người dùng |
| Screen reader, zoom trình duyệt 200% trong panel 320 px | Kiểm tra thủ công | Người dùng |
