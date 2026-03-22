import { useState, type KeyboardEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type LearningStyle, type ExpertiseLevel, type AgeGroup, type Goal, type ImageStyle } from '../api/client';

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

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'new' | 'login'>('new');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  function addTag(value: string) {
    const trimmed = value.trim();
    if (trimmed && !form.interests.includes(trimmed)) {
      setForm((prev) => ({ ...prev, interests: [...prev.interests, trimmed] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.filter((t) => t !== tag),
    }));
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && form.interests.length > 0) {
      removeTag(form.interests[form.interests.length - 1]);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginName.trim()) {
      setLoginError('Please enter your name.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const user = await api.loginUser(loginName.trim());
      localStorage.setItem('lotus_user_id', String(user.id));
      localStorage.setItem('lotus_user_name', user.name);
      navigate('/explore');
    } catch {
      setLoginError('No account found with that name');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (form.interests.length === 0) {
      setError('Please add at least one interest.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await api.createUser(form);
      localStorage.setItem('lotus_user_id', String(user.id));
      localStorage.setItem('lotus_user_name', user.name);
      navigate('/explore');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Warm background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, #e8b86d30, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, #1e3a2f15, transparent)' }} />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--forest), var(--forest-light))', boxShadow: '0 8px 24px rgba(30,58,47,0.25)' }}>
            <span className="text-2xl">💎</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
            Welcome to Lumina
          </h1>
          <p className="text-base" style={{ color: 'var(--muted)' }}>
            Tell us about yourself to personalize your learning journey
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Tab toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6"
            style={{ border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => { setTab('new'); setError(null); }}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={tab === 'new'
                ? { background: 'var(--forest)', color: '#fdf8f0' }
                : { background: 'var(--surface2)', color: 'var(--muted)' }}
            >
              New User
            </button>
            <button
              type="button"
              onClick={() => { setTab('login'); setLoginError(null); }}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={tab === 'login'
                ? { background: 'var(--forest)', color: '#fdf8f0' }
                : { background: 'var(--surface2)', color: 'var(--muted)' }}
            >
              Welcome Back
            </button>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  required
                />
              </div>

              {loginError && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
                  {loginError}{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('new'); setLoginError(null); }}
                    className="underline transition-colors"
                    style={{ color: 'var(--rose)' }}
                  >
                    Create a new account
                  </button>
                </div>
              )}

              <button
                type="submit"
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 16px rgba(30,58,47,0.25)' }}
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Looking you up…
                  </span>
                ) : (
                  'Continue →'
                )}
              </button>
            </form>
          )}

          {tab === 'new' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                Your Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                required
              />
            </div>

            {/* Interests Tag Input */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                Interests
                <span className="font-normal ml-2" style={{ color: 'var(--muted)' }}>— type and press Enter to add</span>
              </label>
              <div className="min-h-[48px] w-full rounded-xl px-3 py-2 flex flex-wrap gap-2 transition-all"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {form.interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-sm rounded-lg px-3 py-1"
                    style={{ background: 'rgba(30,58,47,0.12)', color: 'var(--forest)', border: '1px solid rgba(30,58,47,0.2)' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 leading-none transition-colors"
                      style={{ color: 'var(--forest-muted)' }}
                      aria-label={`Remove ${tag}`}
                    >
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
                  placeholder={form.interests.length === 0 ? 'e.g. machine learning, history, physics…' : 'Add more…'}
                  className="flex-1 min-w-32 bg-transparent outline-none py-1 text-sm"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Learning Style */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Learning Style
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEARNING_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, learning_style: opt.value }))}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer"
                    style={form.learning_style === opt.value
                      ? { background: 'var(--forest)', border: '1px solid var(--forest)', color: '#fdf8f0' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expertise Level */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Expertise Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {EXPERTISE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, expertise_level: opt.value }))}
                    className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                    style={form.expertise_level === opt.value
                      ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
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
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Age Group
              </label>
              <div className="grid grid-cols-3 gap-3">
                {AGE_GROUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, age_group: opt.value }))}
                    className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                    style={form.age_group === opt.value
                      ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
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

            {/* Learning Goal */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                What's your goal?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, goal: opt.value }))}
                    className="flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left"
                    style={form.goal === opt.value
                      ? { background: 'var(--forest)', border: '1px solid var(--forest)' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
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

            {/* Visual Style */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Preferred Visual Style
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, image_style: opt.value }))}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm"
                    style={form.image_style === opt.value
                      ? { background: 'rgba(200,150,62,0.15)', border: '1px solid var(--gold)', color: 'var(--forest)' }
                      : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    <span>{opt.icon}</span>
                    <span className="font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Perspective / Role */}
            <div>
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
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 16px rgba(30,58,47,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating your profile…
                </span>
              ) : (
                'Start Learning →'
              )}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
