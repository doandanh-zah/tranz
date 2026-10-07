import { ArrowRight, BookOpen, Trash2 } from 'lucide-react';
import type { Session } from '../../../../packages/shared/contracts';
import { Spinner, ViewHeading } from '../components';

export function Library({
  sessions,
  loading,
  onOpen,
  onDelete,
}: {
  sessions: Session[];
  loading: boolean;
  onOpen: (session: Session) => void;
  onDelete: (session: Session) => void;
}) {
  const kept = sessions.filter((s) => s.retain).sort((a, b) => b.startedAt - a.startedAt);
  return (
    <>
      <ViewHeading kicker="Xem lại & học từ cuộc họp" title="Cuộc họp đã lưu">
        Chỉ những cuộc họp bạn chọn lưu mới xuất hiện ở đây. Cuộc họp tạm thời tự xoá sau 1 giờ.
      </ViewHeading>
      {loading && !kept.length ? (
        <div className="empty" aria-busy="true">
          <Spinner />
          <p>Đang tải…</p>
        </div>
      ) : kept.length ? (
        <ul className="card-list">
          {kept.map((session) => (
            <li className="card" key={session.id}>
              <span className="card-kicker">
                <BookOpen size={14} aria-hidden="true" />
                {new Date(session.startedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <h2>{session.context.name || 'Cuộc họp'}</h2>
              <p>{session.artifact?.summary ?? `${session.segments.filter((s) => s.final).length} câu đã ghi`}</p>
              <p className="card-meta">{session.segments.filter((s) => s.final).length} câu · {session.artifact ? 'Có ghi chú' : session.processing === 'processing' ? 'Đang tạo ghi chú' : 'Bản ghi hội thoại'}</p>
              <div className="button-row">
                <button className="text-button" onClick={() => onOpen(session)}>
                  Mở lại
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button className="icon danger" aria-label={`Xoá cuộc họp ${session.context.name}`} onClick={() => onDelete(session)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <span className="empty-symbol"><BookOpen size={24} aria-hidden="true" /></span>
          <h2>Chưa lưu cuộc họp nào</h2>
          <p>Sau mỗi cuộc họp, bấm “Lưu phiên này” nếu bạn muốn xem lại ghi chú và bản ghi.</p>
        </div>
      )}
    </>
  );
}
