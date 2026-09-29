# Giao diện tiếng Việt đơn giản hoá

Ngày: 2026-09-29. Branch `feat/simple-vietnamese-ui`. Lý do: bạn review giao diện và thấy khó hiểu với người dùng bình thường; bạn chọn giao diện tiếng Việt, tự kết nối và "checklist + 1 nút".

## Thay đổi

- **Không còn bước dán access token.** Mã này là chìa khóa nội bộ giữa extension và Tranz trên máy, không phải đăng nhập. Extension tự nhận mã qua `/api/pair`; backend chỉ trao cho đúng extension có ID trong `EXTENSION_ID`. Kiểm tra trên máy bạn: gọi không kèm origin extension → bị từ chối.
- **Toàn bộ giao diện và thông báo lỗi bằng tiếng Việt.** Transcript và câu gợi ý trả lời vẫn là tiếng Anh.
- **Màn hình chính:** checklist 3 bước (Đăng nhập ChatGPT, Cho phép micro, Mở cuộc họp Google Meet) tự thu gọn khi xong, một nút lớn **Bắt đầu nghe**, và lời giải thích dữ liệu đi đâu ngay dưới nút. Bấm nút chính là đồng ý (bỏ ô tick consent riêng).
- **Ngữ cảnh không bắt buộc** (mặc định "Cuộc họp nhanh"). Chọn ngữ cảnh và lưu phiên nằm trong "Tuỳ chọn cho cuộc họp này".
- Cài đặt gọn lại: tài khoản ChatGPT, quyền riêng tư, "Thông tin kỹ thuật" thu gọn.
- Panel không bao giờ trắng: nếu Tranz trên máy chưa chạy, panel hiện 3 bước khắc phục và nút Thử lại.

## Kiểm chứng

- `npm run verify`: 31/31 test (thêm: tự kết nối chỉ cho đúng origin extension; phiên không cần ngữ cảnh; regex thông báo tiếng Việt).
- `npm run verify:ui`: 42/42 trên bản build unpacked. Gồm: mở panel là tự kết nối, không có ô mật khẩu; checklist 3 bước; nút Bắt đầu nghe bị khoá đến khi AI, micro và Google Meet đều sẵn sàng; tạo ngữ cảnh; phiên mô phỏng bằng tiếng Việt; đăng nhập ChatGPT ngay từ checklist (với Codex giả lập, trang OpenAI chặn cục bộ); không tràn ngang ở 320–600 px; bàn phím; dialog xoá. Ảnh trong `simple-ui/`.
- Backend thật của bạn đã khởi động lại với code mới; `/api/pair` từ chối mọi nguồn không phải extension.

## Giới hạn

- Bước "Mở cuộc họp Google Meet" chỉ được đánh dấu xong khi bạn mở panel bằng biểu tượng Tranz ngay trên tab Meet (Chrome chỉ cho extension thấy tab đó khi bạn bấm).
- Chưa kiểm tra với người dùng thật ngoài bạn; chưa kiểm tra trình đọc màn hình tiếng Việt.
