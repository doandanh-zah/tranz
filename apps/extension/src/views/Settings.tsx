import { ExternalLink, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities, Run } from '../App';
import { useChatGpt } from '../chatgpt';
import { Spinner } from '../components';

export function SettingsView({
  api,
  capabilities,
  busy,
  run,
  onRefresh,
}: {
  api: Api;
  capabilities?: Capabilities;
  active: boolean;
  busy: string;
  run: Run;
  onRefresh: () => Promise<void>;
}) {
  return (
    <>
      <div className="section-heading">
        <h1>Cài đặt</h1>
      </div>
      {capabilities?.provider === 'chatgpt' ? (
        <ChatGptAccount api={api} onChanged={() => void onRefresh()} />
      ) : (
        <section className="panel" aria-labelledby="ai-heading">
          <h2 id="ai-heading">AI</h2>
          <p className="muted">
            {capabilities?.ai
              ? `Đang dùng API key (${capabilities.model}).`
              : 'Chưa có API key. Đặt AI_PROVIDER=chatgpt trong .env để đăng nhập bằng gói ChatGPT thay thế.'}
          </p>
        </section>
      )}

      <section className="panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">
          <ShieldCheck size={18} aria-hidden="true" /> Quyền riêng tư
        </h2>
        <ul className="plain">
          <li>Tranz không bao giờ lưu âm thanh.</li>
          <li>
            Âm thanh được gửi tới Agora để chuyển thành chữ. Hệ thống của Agora cũng chạy một mô hình ngôn ngữ trên lời thoại (Tranz
            bỏ qua và không phát kết quả đó), và phần xử lý này được tính phí vào dự án Agora.
          </li>
          <li>Lời thoại và ngữ cảnh được gửi tới ChatGPT để dịch, gợi ý và tạo ghi chú, theo điều khoản tài khoản ChatGPT của bạn.</li>
          <li>Phiên không lưu chỉ giữ tạm trong bộ nhớ và tự xoá sau 1 giờ hoặc khi Tranz khởi động lại.</li>
          <li>Ngữ cảnh và phiên bạn chọn lưu được mã hoá trên máy này. Xoá chỉ xoá bản trên máy, không thu hồi được dữ liệu đã gửi đi.</li>
        </ul>
      </section>

      <details className="panel">
        <summary>Thông tin kỹ thuật</summary>
        <p className="setting-row">
          <span>Tranz trên máy</span>
          <strong>127.0.0.1:4318</strong>
        </p>
        <p className="setting-row">
          <span>Chuyển giọng nói (Agora)</span>
          <strong>{capabilities?.agora ? 'Đã cấu hình' : 'Chưa cấu hình'}</strong>
        </p>
        <p className="setting-row">
          <span>AI</span>
          <strong>{capabilities?.provider === 'chatgpt' ? 'Gói ChatGPT (qua Codex)' : 'API key'}</strong>
        </p>
        <button className="secondary" disabled={!!busy} onClick={() => void run('refresh', onRefresh)}>
          <RefreshCw size={15} aria-hidden="true" />
          Kiểm tra lại
        </button>
      </details>
    </>
  );
}

function ChatGptAccount({ api, onChanged }: { api: Api; onChanged: () => void }) {
  const { account, problem, waiting, signIn, signOut } = useChatGpt(api, onChanged);
  return (
    <section className="panel" aria-labelledby="chatgpt-heading" aria-busy={waiting}>
      <h2 id="chatgpt-heading">Tài khoản ChatGPT</h2>
      <p className="caption">
        Tranz dùng gói ChatGPT của bạn để dịch, gợi ý và tạo ghi chú, không cần API key. Mỗi yêu cầu mất vài giây và được tính vào
        hạn mức Codex của gói.
      </p>
      {problem && (
        <p className="banner error" role="alert">
          {problem}
        </p>
      )}
      {account?.signedIn ? (
        <>
          <p className="setting-row">
            <span>Đã đăng nhập</span>
            <strong>
              {account.email ?? 'Tài khoản ChatGPT'}
              {account.plan ? ` · ${account.plan}` : ''}
            </strong>
          </p>
          <button className="secondary" onClick={() => void signOut().then(onChanged)}>
            <LogOut size={15} aria-hidden="true" />
            Đăng xuất ChatGPT khỏi Tranz
          </button>
        </>
      ) : (
        <>
          {account?.lastLoginError && <p className="caption error-text">Chưa đăng nhập xong: {account.lastLoginError}</p>}
          <button className="primary full" disabled={waiting} onClick={() => void signIn()}>
            {waiting ? <Spinner /> : <ExternalLink size={16} aria-hidden="true" />}
            {waiting ? 'Đang chờ bạn đăng nhập trên trang OpenAI…' : 'Đăng nhập ChatGPT'}
          </button>
          <p className="caption">Mở trang đăng nhập của OpenAI trong tab mới. Tranz không thấy mật khẩu của bạn.</p>
        </>
      )}
    </section>
  );
}
