import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { Api } from '../api';
import type { Run } from '../App';
import type { Profile, ProfileInput } from '../../../../packages/shared/contracts';

const empty: ProfileInput = { name: '', role: '', facts: '', goal: '', glossary: '', tone: 'clear' };

const textFields = [
  ['facts', 'Verified project facts', 8000, 'What is true? Include constraints and what is still undecided.'],
  ['goal', 'Meeting goal', 1000, 'What would make this meeting useful?'],
  ['glossary', 'Words worth knowing', 2000, 'Project terms, names and what they mean.'],
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
        <span className="eyebrow">The facts behind your words</span>
        <h1>Context profiles</h1>
        <p>Suggestions may only rely on what you write here and on the meeting transcript. Keep facts short and true.</p>
      </div>
      {editing ? (
        <form className="panel" onSubmit={save} aria-labelledby="profile-form-heading">
          <div className="section-label">
            <h2 id="profile-form-heading">{editing.id ? 'Edit context' : 'New context'}</h2>
            <button type="button" className="icon small" aria-label="Cancel editing" onClick={() => setEditing(undefined)}>
              <X size={17} />
            </button>
          </div>
          <label>
            Profile name
            <input required maxLength={80} value={editing.value.name} placeholder="e.g. Payments team sync" onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            Your role
            <input maxLength={160} value={editing.value.role} placeholder="e.g. Backend engineer" onChange={(e) => update('role', e.target.value)} />
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
            Preferred tone
            <select value={editing.value.tone} onChange={(e) => update('tone', e.target.value)}>
              <option value="clear">Clear and natural</option>
              <option value="professional">Professional</option>
              <option value="simple">Simple English</option>
            </select>
          </label>
          <p className="caption">
            Saved profiles are encrypted on this computer. When a session starts, Tranz copies this profile into the session, and
            sends it to the AI provider with each suggestion request.
          </p>
          <button className="primary full" disabled={!!busy}>
            <Check size={17} aria-hidden="true" />
            {busy === 'profile' ? 'Saving…' : 'Save context'}
          </button>
        </form>
      ) : (
        <>
          <button className="secondary full" onClick={() => setEditing({ value: empty })}>
            <Plus size={17} aria-hidden="true" />
            New context profile
          </button>
          {profiles.length ? (
            <ul className="card-list">
              {profiles.map((profile) => (
                <li className="card" key={profile.id}>
                  <span className="eyebrow">Version {profile.version}</span>
                  <h2>{profile.name}</h2>
                  <p>{profile.role || 'No role provided'}</p>
                  <div className="button-row">
                    <button className="text-button" onClick={() => setEditing({ id: profile.id, value: toInput(profile) })}>
                      Review and edit
                    </button>
                    <button className="icon danger" aria-label={`Delete profile ${profile.name}`} onClick={() => onDelete(profile)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <h2>No profiles yet</h2>
              <p>Start with the few facts that matter for your next meeting.</p>
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
