import { useState, type FormEvent } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Spinner } from '../components';

/**
 * Shown only when automatic connection is not possible: Tranz is not running on this computer,
 * pairing failed, or this is the developer preview page (which has no extension identity).
 */
export function Connect({
  mode,
  problem,
  busy,
  onConnect,
  onRetry,
}: {
  mode: 'offline' | 'problem' | 'manual';
  problem: string;
  busy: boolean;
  onConnect: (token: string) => void;
  onRetry: () => void;
}) {
  const [draft, setDraft] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    onConnect(draft.trim());
    setDraft('');
  }

  if (mode === 'offline' || mode === 'problem') {
    return (
      <section className="panel" aria-labelledby="connect-title">
        <h2 id="connect-title">{mode === 'offline' ? 'Tranz trên máy chưa chạy' : 'Chưa kết nối được với Tranz'}</h2>
        {mode === 'offline' ? (
          <ol className="steps-plain">
            <li>Mở ứng dụng Terminal.</li>
            <li>
              Vào thư mục Tranz và chạy <code>npm run dev</code>.
            </li>
            <li>Khi thấy dòng “Tranz backend ready”, bấm Thử lại.</li>
          </ol>
        ) : (
          <p className="muted">{problem}</p>
        )}
        <button className="primary full" disabled={busy} onClick={onRetry}>
          {busy ? <Spinner /> : <RefreshCw size={17} aria-hidden="true" />}
          Thử lại
        </button>
      </section>
    );
  }

  return (
    <form className="panel" onSubmit={submit} aria-labelledby="connect-title">
      <span className="eyebrow">Bản xem thử cho nhà phát triển</span>
      <h2 id="connect-title">Kết nối bản xem thử</h2>
      <p className="caption">
        Trong extension, Tranz tự kết nối và bạn không cần làm bước này. Trang xem thử không có danh tính extension nên cần dán mã
        ACCESS_TOKEN trong file .env.
      </p>
      <label>
        Mã truy cập (ACCESS_TOKEN)
        <input type="password" value={draft} onChange={(event) => setDraft(event.target.value)} required minLength={32} autoComplete="off" spellCheck={false} />
      </label>
      <button className="primary full" disabled={busy}>
        {busy ? <Spinner /> : <ArrowUpRight size={17} aria-hidden="true" />}
        Kết nối
      </button>
    </form>
  );
}
