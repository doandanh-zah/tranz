# Ma trận nghiệm thu MVP

Ngày: 2026-09-29. Trạng thái tổng: **implementation candidate, còn bị chặn ở các gate live**. Không tuyên bố MVP đã hoàn thành.

Mức bằng chứng:

- **A** — test tự động (Node, mock provider/Agora).
- **B** — extension unpacked thật trong Chromium, AI mock, session mô phỏng.
- **C** — Chromium thật với audio synthetic (tab capture thật).
- **L** — live với Agora thật, giọng nói synthetic từ một tab thật (`npm run verify:live`). AI provider thật: gói ChatGPT Plus qua Codex (`eval:grounding`, 6/6). Chưa có L cho Google Meet.

| # | Tiêu chí (kế hoạch mục 2 / PRODUCT) | Bằng chứng | Trạng thái |
| --- | --- | --- | --- |
| 1 | Luồng chạy trong unpacked extension | B: load, service worker, manifest, các view ở 320–600 px | Một phần — chưa kiểm tra khung side panel thật |
| 2 | Audio tab + micro không làm mất playback | C: tab + mic được mix, tab được route ra loa trong code | Một phần — chưa nghe thực tế trong Google Meet |
| 3 | Tranz không phát âm; mute/pause/stop đúng nghĩa | C + L: pause không sinh dòng mới trong phiên Agora thật, stop idempotent, agent rời kênh sau ~1,5 s; không subscribe audio agent | Đạt về phía Tranz. **Agent vẫn chạy LLM (đã quan sát câu trả lời) và bị tính phí** — đã ghi vào consent |
| 4 | Transcript/AI là dữ liệu thật; fixture ghi rõ synthetic | A/B: không có transcript giả trong sản phẩm; mọi output mock có `[MOCK]` | Đạt cho code; live chưa chạy |
| 5 | Credential chỉ ở backend; token có scope/hết hạn | A: auth/origin; token Agora 10 phút; quét bundle | Đạt (local) |
| 6 | Không lưu raw audio; lưu có opt-in; xóa bao phủ dữ liệu nguồn và dẫn xuất | A: phiên tạm không ghi đĩa, keep, xóa khi job đang chạy, restart | Đạt (local); không thu hồi được bản sao ở provider |
| 7 | Lỗi trung thực, có hướng khôi phục | A/B: backend offline, token sai, thiếu Agora/AI, lỗi provider phân loại, lý do dừng | Đạt cho các trạng thái mô phỏng được |
| 8 | Bằng chứng test/browser/live tách biệt | Tài liệu phase-02…08 | Đạt; live còn thiếu |
| PR-001/002 | Profile CRUD; xem snapshot chính xác | A/B | Đạt |
| PR-003/004 | EN→VI; không capture khi chưa bấm Start + consent | B | Đạt |
| PR-010 | Capture tab + micro | C + L (tab thật → Agora thật) | Một phần — chưa trên Google Meet, micro trong live test là im lặng |
| PR-011 | Partial/final ổn định | A/B + L: transcript thật qua RTM, dòng final đầu ~1,5 s sau khi listening | Đạt (synthetic speech) |
| PR-012 | Bản dịch gắn đúng segment/revision | A/B | Đạt (mock) |
| PR-013/014 | Catch-up; phát hiện câu hỏi + gợi ý | A/B (heuristic có nhãn) | Đạt (mock) |
| PR-015/016 | Chỉ dùng context + transcript; thiếu căn cứ → làm rõ | A + L (gói ChatGPT, 6 tình huống synthetic) | Đạt trên bộ synthetic nhỏ; chưa đo trên cuộc họp thật |
| PR-017 | Mute, pause, resume, stop | C + A + L (pause/resume/stop) | Đạt; mute chưa thử live |
| PR-018 | Lỗi quyền/kết nối/agent/transcript hiển thị và phục hồi được | A/B | Một phần — lỗi RTC/RTM thật chưa tái hiện |
| PR-020 | Kết thúc idempotent, một job xử lý | A | Đạt |
| PR-021 | Xem summary, quyết định, hành động, từ vựng, câu mẫu | B (mock) | Đạt về UI; chất lượng chưa đo |
| PR-022/023/024 | Xóa; lưu opt-in; không lưu raw audio | A/B | Đạt (local) |

## Gate đang bị chặn và điều cần để mở

| Gate | Thiếu gì | Ai cần làm |
| --- | --- | --- |
| Agora live — reconnect thật khi mất mạng | Join, transcript, pause/resume, **gia hạn token qua 10 phút**, stop, cleanup đã đạt live (xem [live-agora.md](live-agora.md)); chưa tái hiện mất mạng có kiểm soát | Chạy thủ công theo REVIEW_GUIDE |
| AI provider trong cuộc họp thật | Đã đạt live với gói ChatGPT (xem [chatgpt-provider.md](chatgpt-provider.md)); độ trễ 5–13 s cao hơn mục tiêu | Bạn đăng nhập ChatGPT trong Settings và đánh giá trong cuộc họp thật |
| Google Meet + playback nghe được + side panel thật | Cuộc gọi Meet đã đăng nhập, người thao tác thật trên Chrome | Người dùng |
| Screen reader, zoom trình duyệt 200% trong panel 320 px | Kiểm tra thủ công | Người dùng |
