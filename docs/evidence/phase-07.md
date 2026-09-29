# Phase 07 — ghi chú sau cuộc họp, lưu giữ và xóa

Ngày: 2026-09-29. Branch `feat/learning-notes` (xếp chồng trên `feat/grounded-assistance`).

## Đã làm

- Đăng ký `POST /api/sessions/:id/finalize` và `POST /api/sessions/:id/save` (trước đây `learning.ts` chỉ là bản nháp chưa được đăng ký).
- Stop không chờ AI: khi session dừng, nếu có transcript final và đã cấu hình AI, một job tạo notes chạy nền. Các lệnh finalize trùng được tuần tự hóa và trả cùng một kết quả.
- Lỗi AI → `processing: 'error'` kèm `processingError`, có nút Retry. Lỗi schema không lộ chi tiết nội bộ.
- Restart giữa lúc xử lý → lỗi có thể retry (hoặc `ready` nếu artifact đã lưu); translation `pending` được reset. Khi backend tắt không khởi động job mới.
- Transcript quá 60.000 ký tự → báo rõ giới hạn MVP, transcript vẫn còn.
- UI: phần "Meeting notes" (tóm tắt, quyết định, việc tiếp theo, câu mẫu minh họa, từ vựng) và phần lưu giữ với nút "Keep this session" có giải thích trước khi lưu.

## Kiểm chứng

Automated (`npm run verify`): 17/17 test, trong đó 6 test mới của Phase 07:

- stop trả về trước khi notes xong; hai lệnh finalize trùng chỉ gọi provider một lần;
- notes lỗi vẫn giữ session `stopped`, retry thành công;
- session tạm thời không ghi transcript/snapshot/notes xuống đĩa; session được giữ và session "Keep" sau khi dừng còn nguyên sau restart; session tạm thời không thể "Keep" sau restart;
- xóa session khi notes đang chạy: kết quả trễ bị loại, không còn trong API và file mã hóa;
- restart giữa chừng → lỗi có thể retry;
- finalize cần session đã dừng, có transcript final, và giới hạn độ dài.

Browser (`node scripts/verify-ui.mjs`, 41/41 check, `docs/evidence/phase-07/results.json`): notes tự xuất hiện sau khi dừng (AI mock), nhãn lưu giữ, nhãn câu mẫu minh họa, không overflow ở 320/600 px, Library chỉ liệt kê session được giữ, bấm "Keep this session" thật trong panel với session tạm thời, dialog xóa và xóa thật.

**Giới hạn:** AI là mock (`[MOCK]`), session là mô phỏng không có audio/Agora. Chưa đo chất lượng notes với provider thật. Không có transaction store; một tiến trình backend duy nhất. Xóa chỉ áp dụng cho bản lưu cục bộ, không thu hồi được dữ liệu provider đã xử lý.
