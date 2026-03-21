import { useState, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { api, type LearningStyle, type ExpertiseLevel, type AgeGroup, type Goal, type ImageStyle } from '../api/client';

const LEARNING_STYLE_OPTIONS: { value: LearningStyle; label: string; icon: string }[] = [
  { value: 'visual', label: 'Visual', icon: '👁' },
  { value: 'auditory', label: 'Auditory', icon: '🎧' },
  { value: 'reading', label: 'Reading / Writing', icon: '📖' },
  { value: 'kinesthetic', label: 'Kinesthetic', icon: '🤝' },
];

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Just getting started' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
  { value: 'advanced', label: 'Advanced', desc: 'Deep expertise' },
];

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string; desc: string }[] = [
  { value: 'primary', label: 'Primary', desc: 'Ages 6–11' },
  { value: 'secondary', label: 'Secondary', desc: 'Ages 12–17' },
  { value: 'adult', label: 'Adult', desc: 'Ages 18+' },
];

const GOAL_OPTIONS: { value: Goal; label: string; icon: string; desc: string }[] = [
  { value: 'curiosity', label: 'Curiosity', icon: '🔍', desc: 'Learning for fun' },
  { value: 'exam_prep', label: 'Exam Prep', icon: '📝', desc: 'Preparing for tests' },
  { value: 'homework', label: 'Homework', icon: '📚', desc: 'Need help with assignments' },
  { value: 'career', label: 'Career', icon: '💼', desc: 'Professional development' },
];

const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string; icon: string }[] = [
  { value: 'cartoon', label: 'Cartoon', icon: '🎨' },
  { value: 'watercolor', label: 'Watercolor', icon: '🖌️' },
  { value: 'photorealistic', label: 'Photorealistic', icon: '📷' },
  { value: 'minimalist', label: 'Minimalist', icon: '✏️' },
  { value: 'anime', label: 'Anime', icon: '🌸' },
  { value: 'scientific', label: 'Scientific', icon: '🔬' },
  { value: '3d_render', label: '3D Render', icon: '💎' },
];

interface FormState {
  name: string;
  interests: string[];
  learning_style: LearningStyle;
  expertise_level: ExpertiseLevel;
  age_group: AgeGroup;
  goal: Goal;
  image_style: ImageStyle;
  perspective: string;
}

export default function Profile() {
  const userId = parseInt(localStorage.getItem('lotus_user_id') ?? '0', 10);

  const [form, setForm] = useState<FormState>({
    name: '',
    interests: [],
    learning_style: 'visual',
    expertise_level: 'beginner',
    age_group: 'secondary',
    goal: 'curiosity',
    image_style: 'cartoon',
    perspective: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api.getUser(userId)
      .then((user) => {
        setForm({
          name: user.name,
          interests: user.interests ?? [],
          learning_style: user.learning_style,
          expertise_level: user.expertise_level,
          age_group: (user.age_group as AgeGroup) ?? 'secondary',
          goal: (user.goal as Goal) ?? 'curiosity',
          image_style: (user.image_style as ImageStyle) ?? 'cartoon',
          perspective: user.perspective ?? '',
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  function addTag(value: string) {
    const trimmed = value.trim();
    if (trimmed && !form.interests.includes(trimmed)) {
      setForm((prev) => ({ ...prev, interests: [...prev.interests, trimmed] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, interests: prev.interests.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && form.interests.length > 0) {
      removeTag(form.interests[form.interests.length - 1]);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.updateUser(userId, form);
      localStorage.setItem('lotus_user_name', updated.name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--forest)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'var(--gold)', color: '#fff' }}>
              {form.name.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
                My Profile
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Manage your learning preferences</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Name */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Your Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              required
            />
          </div>

          {/* Interests */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Interests
              <span className="font-normal ml-2" style={{ color: 'var(--muted)' }}>— type and press Enter to add</span>
            </label>
            <div className="min-h-[48px] w-full rounded-xl px-3 py-2 flex flex-wrap gap-2 transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              {form.interests.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-sm rounded-lg px-3 py-1"
                  style={{ background: 'rgba(30,58,47,0.12)', color: 'var(--forest)', border: '1px solid rgba(30,58,47,0.2)' }}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 leading-none"
                    style={{ color: 'var(--forest-muted)' }} aria-label={`Remove ${tag}`}>
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={form.interests.length === 0 ? 'e.g. machine learning, history…' : 'Add more…'}
                className="flex-1 min-w-32 bg-transparent outline-none py-1 text-sm"
                style={{ color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Learning Style */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Learning Style
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {LEARNING_STYLE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, learning_style: opt.value }))}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer"
                  style={form.learning_style === opt.value
                    ? { background: 'var(--forest)', border: '1px solid var(--forest)', color: '#fdf8f0' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expertise Level */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Expertise Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {EXPERTISE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, expertise_level: opt.value }))}
                  className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                  style={form.expertise_level === opt.value
                    ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-semibold"
                    style={{ color: form.expertise_level === opt.value ? '#fdf8f0' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  <span className="text-xs mt-1"
                    style={{ color: form.expertise_level === opt.value ? 'rgba(253,248,240,0.7)' : 'var(--muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Age Group */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Age Group
            </label>
            <div className="grid grid-cols-3 gap-3">
              {AGE_GROUP_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, age_group: opt.value }))}
                  className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                  style={form.age_group === opt.value
                    ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-semibold"
                    style={{ color: form.age_group === opt.value ? '#fdf8f0' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  <span className="text-xs mt-1"
                    style={{ color: form.age_group === opt.value ? 'rgba(253,248,240,0.7)' : 'var(--muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Learning Goal
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, goal: opt.value }))}
                  className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                  style={form.goal === opt.value
                    ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span className="text-xl mb-1">{opt.icon}</span>
                  <span className="text-sm font-semibold"
                    style={{ color: form.goal === opt.value ? '#fdf8f0' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  <span className="text-xs mt-0.5"
                    style={{ color: form.goal === opt.value ? 'rgba(253,248,240,0.7)' : 'var(--muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Image Style */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Preferred Visual Style
            </label>
            <div className="flex flex-wrap gap-2">
              {IMAGE_STYLE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, image_style: opt.value }))}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm"
                  style={form.image_style === opt.value
                    ? { background: 'rgba(200,150,62,0.15)', border: '1px solid var(--gold)', color: 'var(--forest)' }
                    : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  <span>{opt.icon}</span>
                  <span className="font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Perspective */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Your Role or Viewpoint
              <span className="font-normal ml-2" style={{ color: 'var(--muted)' }}>— optional</span>
            </label>
            <textarea
              value={form.perspective}
              onChange={(e) => setForm((p) => ({ ...p, perspective: e.target.value }))}
              placeholder="e.g. I'm a software engineer exploring AI, or a student studying for a biology exam…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.3)', color: 'var(--forest)' }}>
              ✓ Changes saved successfully
            </div>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 16px rgba(30,58,47,0.25)' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
