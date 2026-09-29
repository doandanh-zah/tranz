import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { Api } from '../api';
import type { Run } from '../App';
import type { Profile, ProfileInput } from '../../../../packages/shared/contracts';

const empty: ProfileInput = { name: '', role: '', facts: '', goal: '', glossary: '', tone: 'clear' };

const textFields = [
  ['facts', 'Thông tin chắc chắn về công việc', 8000, 'Điều gì đã chắc chắn? Ghi cả những việc chưa quyết định để Tranz không đoán bừa.'],
  ['goal', 'Mục tiêu cuộc họp', 1000, 'Bạn muốn cuộc họp đạt được điều gì?'],
  ['glossary', 'Thuật ngữ, tên riêng', 2000, 'Thuật ngữ dự án, tên người, tên sản phẩm và nghĩa của chúng.'],
] as const;

export function ContextProfiles({
  api,
  profiles,
  busy,
  run,
  editRequest,
  onSaved,
  onDelete,
}: {
  api: Api;
  profiles: Profile[];
  busy: string;
  run: Run;
  editRequest?: { profile?: Profile; nonce: number };
  onSaved: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
}) {
  const [editing, setEditing] = useState<{ id?: string; value: ProfileInput }>();

  useEffect(() => {
    if (!editRequest) return;
    const { profile } = editRequest;
    setEditing(profile ? { id: profile.id, value: toInput(profile) } : { value: empty });
  }, [editRequest]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { id, value } = editing;
    await run('profile', async () => {
      const saved = await api.call<Profile>(id ? `/profiles/${id}` : '/profiles', id ? 'PUT' : 'POST', value);
      onSaved(saved);
      setEditing(undefined);
    });
  }

  const update = (key: keyof ProfileInput, value: string) =>
    setEditing((current) => current && { ...current, value: { ...current.value, [key]: value } });

  return (
    <>
      <div className="section-heading">
        <h1>Ngữ cảnh</h1>
        <p>Không bắt buộc. Ngữ cảnh giúp Tranz gợi ý câu trả lời đúng về công việc của bạn, thay vì đoán. Gợi ý chỉ dựa trên những gì bạn viết ở đây và lời thoại trong cuộc họp.</p>
      </div>
      {editing ? (
        <form className="panel" onSubmit={save} aria-labelledby="profile-form-heading">
          <div className="section-label">
            <h2 id="profile-form-heading">{editing.id ? 'Sửa ngữ cảnh' : 'Ngữ cảnh mới'}</h2>
            <button type="button" className="icon small" aria-label="Huỷ" onClick={() => setEditing(undefined)}>
              <X size={17} />
            </button>
          </div>
          <label>
            Tên (để bạn dễ chọn)
            <input required maxLength={80} value={editing.value.name} placeholder="Ví dụ: Họp tuần với team Payments" onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            Vai trò của bạn
            <input maxLength={160} value={editing.value.role} placeholder="Ví dụ: Backend engineer" onChange={(e) => update('role', e.target.value)} />
          </label>
          {textFields.map(([key, label, max, placeholder]) => (
            <label key={key}>
              {label}
              <textarea maxLength={max} value={editing.value[key]} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} />
              <small className="counter">
                {editing.value[key].length}/{max}
              </small>
            </label>
          ))}
          <label>
            Giọng văn khi gợi ý câu trả lời
            <select value={editing.value.tone} onChange={(e) => update('tone', e.target.value)}>
              <option value="clear">Rõ ràng, tự nhiên</option>
              <option value="professional">Chuyên nghiệp</option>
              <option value="simple">Tiếng Anh đơn giản</option>
            </select>
          </label>
          <p className="caption">
            Ngữ cảnh được mã hoá trên máy này. Khi bắt đầu cuộc họp, Tranz sao chép ngữ cảnh vào phiên và gửi kèm tới ChatGPT mỗi
            khi gợi ý câu trả lời.
          </p>
          <button className="primary full" disabled={!!busy}>
            <Check size={17} aria-hidden="true" />
            {busy === 'profile' ? 'Đang lưu…' : 'Lưu ngữ cảnh'}
          </button>
        </form>
      ) : (
        <>
          <button className="secondary full" onClick={() => setEditing({ value: empty })}>
            <Plus size={17} aria-hidden="true" />
            Tạo ngữ cảnh mới
          </button>
          {profiles.length ? (
            <ul className="card-list">
              {profiles.map((profile) => (
                <li className="card" key={profile.id}>
                  <span className="eyebrow">Phiên bản {profile.version}</span>
                  <h2>{profile.name}</h2>
                  <p>{profile.role || 'Chưa ghi vai trò'}</p>
                  <div className="button-row">
                    <button className="text-button" onClick={() => setEditing({ id: profile.id, value: toInput(profile) })}>
                      Xem và sửa
                    </button>
                    <button className="icon danger" aria-label={`Xoá ngữ cảnh ${profile.name}`} onClick={() => onDelete(profile)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <h2>Chưa có ngữ cảnh nào</h2>
              <p>Bạn vẫn dùng Tranz bình thường khi không có ngữ cảnh. Thêm vài thông tin chính nếu muốn gợi ý sát với công việc hơn.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function toInput({ name, role, facts, goal, glossary, tone }: Profile): ProfileInput {
  return { name, role, facts, goal, glossary, tone };
}
