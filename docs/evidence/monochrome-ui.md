# Giao diện đen trắng (Zahlook)

Ngày: 2026-09-30. Branch `feat/monochrome-dark-ui`, xếp chồng trên PR #10. Lý do: bạn yêu cầu dựng lại toàn bộ frontend bằng skill [Zahlook](https://github.com/doandanh-zah/Zahlook), dùng đen tuyền và trắng tuyền, tông tối kiểu X.

## Quyết định thiết kế

- **Nền:** Zahlook "dark editorial network", điều chỉnh theo X: nền `#000`, chữ `#FFF`, đường kẻ mảnh `#2F3336`. Chỉ có giao diện tối.
- **Một màu nhấn duy nhất là trắng:** mỗi màn hình có đúng một nút chính màu trắng, chữ đen (ví dụ **Bắt đầu nghe**). Các nút còn lại có viền mảnh, còn liên kết được gạch chân, nên người dùng phân biệt được bằng hình dạng chứ không chỉ bằng màu.
- **Màu chỉ dùng để báo trạng thái:** xanh lá = đang nghe hoặc đã xong; vàng = tạm dừng hoặc cần cài đặt; đỏ = dừng, xoá hoặc lỗi. Mọi thông báo đều có biểu tượng kèm theo.
- **Không dùng kính mờ, blur, glow, gradient hay đổ bóng.** Thứ bậc thông tin đến từ cỡ chữ, độ đậm và đường kẻ.
- **Kiểu chữ:** font hệ thống. Chữ đậm lớn cho tiêu đề; chữ mono in hoa ngắn cho nhãn, bộ đếm, giờ và trạng thái. Dấu tiếng Việt hiển thị đầy đủ trong ảnh chụp.
- **Màn hình cuộc họp:** bản dịch tiếng Việt là dòng sáng và lớn nhất. Câu tiếng Anh gốc nằm phía trên, màu phụ.
- **Chuyển động:** giữ ở mức tối giản (giả định vì bạn chưa chọn). Chỉ đổi màu khi rê chuột và chấm "đang nghe" nhấp nháy; tất cả tắt khi hệ thống bật giảm chuyển động. Không dùng Anime.js.
- Thanh trên cùng không cố định, vì thanh cố định che lời thoại khi cuộn (đã kiểm chứng trong ảnh chụp và gỡ bỏ).
- Không thay đổi backend, quyền riêng tư, Agora hay logic cuộc họp. Đoạn giải thích luồng dữ liệu vẫn luôn hiện dưới nút Bắt đầu nghe.

## Lượt review thứ hai: tinh gọn

Bạn xem ở bề ngang 400 px và thấy giao diện "hơi khó nhìn", nên muốn gọn hơn; Home là chức năng chính và cần ít nút. Tôi đã sửa như sau:

- **Bỏ khung viền:** các phần giờ chỉ cách nhau bằng đường kẻ mảnh và khoảng trắng.
- **Nhãn phụ viết thường:** nhãn phụ là chữ thường màu xám. Chữ mono chỉ còn dùng cho giờ và bộ đếm.
- **Link không gạch chân:** link và nút phụ chỉ gạch chân khi rê chuột. Bỏ phần chân trang.
- **Home:**
  - chỉ còn tiêu đề và một dòng mô tả;
  - ba bước chuẩn bị, mỗi bước là một dòng; bước chưa xong có một nút nhỏ bên phải;
  - link "Mở trong tab" chỉ hiện khi xin quyền micro thất bại;
  - nút Bắt đầu nghe khi chưa bấm được là khung viền trầm, chữ vẫn đọc được;
  - đoạn giải thích luồng dữ liệu được rút gọn và vẫn luôn hiển thị.
- **Demo xem thử:** `npm run demo:ui` mở giao diện trong trình duyệt bất kỳ, dùng dữ liệu giả lập và AI giả, không đọc `.env`. Thêm `-- --live` để mô phỏng một cuộc họp đang chạy.

## Kiểm chứng

- `npm run verify`: lint, typecheck, 31/31 test, build đều đạt.
- `verify:ui` trên bản build unpacked (cổng 4338, vì 4328 đang dùng cho bản demo): **43/43**. Bao gồm:
  - không tràn ngang ở 320–600 px;
  - focus bàn phím hiện rõ;
  - chấm "đang nghe" ngừng nhấp nháy khi bật giảm chuyển động;
  - chữ phóng to 200 % vẫn đọc được; lần này chữ thực sự to lên, vì cỡ chữ đã chuyển sang `rem`.

  Ảnh chụp nằm trong `monochrome-ui/`.
- Tôi đã tự xem từng ảnh: màn hình chính, checklist ChatGPT, phiên mô phỏng, chữ 200 %, dialog xoá, mất kết nối backend, ghi chú sau họp và Cài đặt.

## Giới hạn

- Chưa kiểm tra trong khung side panel thật của Chrome, chưa kiểm tra với trình đọc màn hình và chưa thử trong cuộc họp thật.
- Các ảnh chụp cả trang (full-page) có thể cắt dialog ở giữa trang. Đó là cách Playwright chụp, không phải lỗi giao diện.
