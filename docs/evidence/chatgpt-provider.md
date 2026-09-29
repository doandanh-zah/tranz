# Provider ChatGPT (gói subscription) qua Codex

Ngày: 2026-09-29. Branch `feat/chatgpt-provider`. Quyết định: [ADR 0003](../decisions/0003-chatgpt-subscription-provider.md).

## Vì sao

Bạn muốn dùng gói ChatGPT đã trả tiền thay vì API key, theo cách OpenClaw làm. Gói ChatGPT không có API key. OpenAI cho phép dùng gói trong công cụ bên thứ ba qua "Sign in with ChatGPT" của Codex. OpenClaw chạy runtime chính thức `codex app-server` với login đó, và Tranz làm theo cùng cách.

## Cách hoạt động

- Backend chạy `codex app-server` (Codex CLI chính thức, đã có trên máy: codex-cli 0.155.1) và nói chuyện qua JSON-RPC.
- **Settings → Sign in with ChatGPT:** mở trang đăng nhập của OpenAI (`auth.openai.com`, PKCE, callback `localhost:1455`) trong tab mới. Bạn tự đăng nhập; Tranz không thấy mật khẩu hay token. Login được lưu trong `.tranz-data/codex-home`, tách khỏi Codex bạn đang dùng.
- Mỗi yêu cầu (dịch, gợi ý, catch-up, composer, notes) là một thread tạm, dùng instruction riêng của Tranz, sandbox read-only, không cần duyệt quyền, và JSON schema bắt buộc cho đầu ra.
- **Khóa an toàn:** tắt shell, apps, plugins, browser, computer use, memories, công cụ ảnh, skills, hooks và web search; xóa MCP servers. Mọi yêu cầu quyền từ Codex đều bị từ chối. Nếu kết quả có dấu hiệu dùng tool, Tranz bỏ kết quả đó.
- **Dịch theo lô:** tối đa 8 dòng final mỗi yêu cầu, để không bị dồn hàng khi mỗi yêu cầu mất vài giây.
- Vẫn dùng được API key bằng cách đặt `AI_PROVIDER=openai` và `AI_API_KEY`.

## Kiểm chứng

| Loại | Kết quả |
| --- | --- |
| Test tự động | 29/29 (thêm 4 test adapter với `codex` giả lập: đăng nhập qua RPC, JSON schema, loại kết quả dùng tool, lỗi thiếu Codex; và 1 test dịch theo lô) |
| UI (`verify:ui`) | 45/45, gồm nút Sign in with ChatGPT → mở tab OpenAI (chặn bằng trang synthetic) → panel hiện "Signed in · plus" |
| **Live, gói ChatGPT Plus thật** (`eval:grounding`) | **6/6**: trả lời có căn cứ và trích context; không bịa giá; tin đồn không đè fact "chưa quyết định"; không làm theo prompt injection; bản dịch tiếng Việt giữ thuật ngữ "Orbit"; composer không thêm số. Kết quả: `live/chatgpt-grounding.json` |
| Độ trễ thật | 5,1–13,4 s mỗi yêu cầu. Dịch một câu: 5–9 s. Model nhẹ hơn không nhanh hơn (`gpt-6-luna` 7–8 s, `gpt-5.6-luna` 13–15 s) |
| Đăng nhập với thư mục Tranz mới | Codex trả URL `https://auth.openai.com/oauth/authorize` có PKCE và callback `localhost:1455`. Chưa hoàn tất đăng nhập vì bước đó cần bạn |

Lần đo live dùng phiên Codex bạn đã đăng nhập sẵn (`CODEX_HOME=~/.codex`), vì thư mục login của Tranz chưa được đăng nhập. Tôi không đọc token; Codex tự dùng login của nó.

## Giới hạn

- **Chậm hơn mục tiêu 3 s** cho bản dịch: bản dịch đến trễ vài giây, theo lô. Gợi ý và notes dùng được nhưng không tức thì.
- Tính vào hạn mức Codex của gói; khi hết hạn mức sẽ hiện lỗi có thể thử lại.
- Cần Codex CLI trên cùng máy với backend; cổng 1455 dùng cho callback OAuth.
- Nội dung transcript và context được gửi tới OpenAI theo điều khoản tài khoản ChatGPT của bạn.
- Giao thức app-server được Codex đánh dấu là experimental; khi nâng cấp CLI có thể cần cập nhật.

## Bạn cần làm

1. Build lại và khởi động lại backend (`npm run build`, `npm run dev`), rồi Reload extension.
2. Settings → **Sign in with ChatGPT** → đăng nhập trên trang OpenAI.
