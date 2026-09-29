import { ArrowRight, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import type { Api } from '../api';
import type { Run } from '../App';
import type { Artifact, Session } from '../../../../packages/shared/contracts';
import { Spinner } from '../components';

export function AfterMeeting({
  api,
  session,
  busy,
  run,
  aiReady,
  onUpdate,
  onNext,
  onDelete,
}: {
  api: Api;
  session: Session;
  busy: string;
  run: Run;
  aiReady: boolean;
  onUpdate: (session: Session) => void;
  onNext: () => void;
  onDelete: () => void;
}) {
  const hasTranscript = session.segments.some((s) => s.final);
  const generate = () => run('notes', async () => onUpdate(await api.call<Session>(`/sessions/${session.id}/finalize`, 'POST')));
  const keep = () => run('save', async () => onUpdate(await api.call<Session>(`/sessions/${session.id}/save`, 'POST')));

  return (
    <>
      <section className="panel notes" aria-labelledby="notes-heading" aria-busy={session.processing === 'processing'}>
        <h2 id="notes-heading">Ghi chú cuộc họp</h2>
        {session.artifact ? (
          <Notes artifact={session.artifact} />
        ) : session.processing === 'processing' ? (
          <p className="muted" role="status">
            <Spinner /> Đang viết ghi chú từ cuộc họp… (mất khoảng nửa phút)
          </p>
        ) : !hasTranscript ? (
          <p className="muted">Không có câu nào được ghi lại, nên chưa có gì để tóm tắt.</p>
        ) : !aiReady ? (
          <p className="muted">Đăng nhập ChatGPT trong Cài đặt để tạo ghi chú. Bản ghi hội thoại vẫn còn bên dưới.</p>
        ) : (
          <>
            <p className={session.processing === 'error' ? 'banner error' : 'muted'} role={session.processing === 'error' ? 'alert' : undefined}>
              {session.processing === 'error'
                ? (session.processingError ?? 'Chưa tạo được ghi chú.')
                : 'Tạo bản tóm tắt, các quyết định, việc cần làm và mẫu câu hữu ích từ cuộc họp.'}
            </p>
            <button className="secondary" disabled={!!busy} onClick={() => void generate()}>
              {busy === 'notes' ? <Spinner /> : <RefreshCw size={15} aria-hidden="true" />}
              {session.processing === 'error' ? 'Thử lại' : 'Tạo ghi chú'}
            </button>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="keep-heading">
        <h2 id="keep-heading">
          <ShieldCheck size={17} aria-hidden="true" /> {session.retain ? 'Đã lưu trên máy này' : 'Phiên tạm thời'}
        </h2>
        {session.retain ? (
          <p className="muted">Bản ghi, bản dịch, ngữ cảnh và ghi chú được mã hoá trên máy này cho tới khi bạn xoá.</p>
        ) : (
          <>
            <p className="muted">
              Phiên này chỉ giữ tạm và tự xoá sau 1 giờ (hoặc khi Tranz khởi động lại). Bấm Lưu để giữ bản ghi, bản dịch và ghi chú
              (đã mã hoá) trên máy này.
            </p>
            <button className="secondary" disabled={!!busy} onClick={() => void keep()}>
              {busy === 'save' ? <Spinner /> : null}
              Lưu phiên này
            </button>
          </>
        )}
        <div className="button-row divider">
          <button className="primary" onClick={onNext}>
            Cuộc họp mới
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button className="icon danger" aria-label="Xoá phiên này" onClick={onDelete}>
            <Trash2 size={18} />
          </button>
        </div>
      </section>
    </>
  );
}

function Notes({ artifact }: { artifact: Artifact }) {
  const lists = [
    ['Quyết định', artifact.decisions],
    ['Việc cần làm', artifact.actions],
  ] as const;
  return (
    <>
      <p className="caption">Do AI viết từ lời thoại của cả cuộc họp (không phân biệt người nói). Hãy kiểm tra trước khi chia sẻ.</p>
      <p lang="vi" className="summary">
        {artifact.summary}
      </p>
      {lists.map(([title, items]) => (
        <div key={title}>
          <h3>{title}</h3>
          {items.length ? (
            <ul>
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="caption">Không có.</p>
          )}
        </div>
      ))}
      <h3>Mẫu câu bạn có thể dùng</h3>
      <p className="caption">Câu gợi ý để luyện tập, không phải lời ai đã nói.</p>
      {artifact.improvedReplies.length ? (
        <ul lang="en">
          {artifact.improvedReplies.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="caption">Không có.</p>
      )}
      <h3>Từ vựng đáng nhớ</h3>
      {artifact.vocabulary.length ? (
        <dl className="vocabulary">
          {artifact.vocabulary.map((item, index) => (
            <div key={index}>
              <dt lang="en">{item.phrase}</dt>
              <dd lang="vi">{item.meaning}</dd>
              <dd lang="en" className="caption">
                {item.example}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="caption">Không có.</p>
      )}
    </>
  );
}
