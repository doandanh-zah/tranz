import { useEffect, useRef, type ReactNode } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';
import type { Profile, SessionState } from '../../../packages/shared/contracts';

export function ContextDetails({ profile }: { profile: Profile }) {
  const fields = [
    ['role', 'Vai trò của bạn'],
    ['facts', 'Thông tin chắc chắn'],
    ['goal', 'Mục tiêu cuộc họp'],
    ['glossary', 'Thuật ngữ'],
    ['tone', 'Giọng văn'],
  ] as const;
  return (
    <dl className="context-details">
      {fields.map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{key === 'tone' ? toneLabels[profile.tone] : profile[key] || 'Chưa có'}</dd>
        </div>
      ))}
    </dl>
  );
}

export const toneLabels: Record<Profile['tone'], string> = { clear: 'Rõ ràng, tự nhiên', professional: 'Chuyên nghiệp', simple: 'Tiếng Anh đơn giản' };

const stateLabels: Record<SessionState, string> = {
  created: 'Đang chuẩn bị',
  connecting: 'Đang kết nối',
  listening: 'Đang nghe',
  paused: 'Tạm dừng',
  reconnecting: 'Đang kết nối lại',
  stopping: 'Đang dừng',
  stopped: 'Đã dừng',
  error: 'Cần xử lý',
};

/** Status is always spelled out; colour is only a secondary cue. */
export function StatusPill({ state }: { state: SessionState }) {
  return (
    <span className={`status ${state}`}>
      <i aria-hidden="true" />
      {stateLabels[state]}
    </span>
  );
}

export function Banner({
  tone = 'info',
  children,
  onDismiss,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`banner ${tone}`}>
      {tone === 'success' ? (
        <Check size={16} aria-hidden="true" />
      ) : tone === 'error' ? (
        <CircleAlert size={16} aria-hidden="true" />
      ) : (
        <Info size={16} aria-hidden="true" />
      )}
      <span>{children}</span>
      {onDismiss && (
        <button className="icon small" aria-label="Đóng thông báo" onClick={onDismiss}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Modal confirmation built on the native <dialog>: showModal() makes the rest of the page inert,
 * Escape cancels, and focus returns to the control that opened it.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      cancelRef.current();
    };
    element?.addEventListener('cancel', cancel);
    return () => {
      element?.removeEventListener('cancel', cancel);
      if (element?.open) element.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="modal" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <span className="eyebrow">Dữ liệu của bạn, bạn quyết định</span>
      <h2 id="confirm-title">{title}</h2>
      <div id="confirm-description" className="modal-body">
        {description}
      </div>
      <div className="button-row">
        <button className="secondary" autoFocus onClick={onCancel}>
          Giữ lại
        </button>
        <button className="stop" disabled={busy} onClick={onConfirm}>
          {busy ? 'Đang xoá…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
