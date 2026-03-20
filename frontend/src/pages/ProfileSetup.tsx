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
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4 shadow-lg shadow-indigo-500/30">
            <span className="text-2xl">🪷</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to Lotus</h1>
          <p className="text-slate-400 mt-2">Tell us about yourself to personalize your learning journey</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 shadow-2xl">
          {/* Tab toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#2d2d4e] mb-6">
            <button
              type="button"
              onClick={() => { setTab('new'); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                tab === 'new'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0f0f1a] text-slate-400 hover:text-slate-200'
              }`}
            >
              New User
            </button>
            <button
              type="button"
              onClick={() => { setTab('login'); setLoginError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0f0f1a] text-slate-400 hover:text-slate-200'
              }`}
            >
              Welcome Back
            </button>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {loginError}{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('new'); setLoginError(null); }}
                    className="underline hover:text-red-300 transition-colors"
                  >
                    Create a new account
                  </button>
                </div>
              )}

              <button
                type="submit"
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                required
              />
            </div>

            {/* Interests Tag Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Interests
                <span className="text-slate-500 font-normal ml-2">— type and press Enter to add</span>
              </label>
              <div className="min-h-[48px] w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 flex flex-wrap gap-2">
                {form.interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-lg px-3 py-1 border border-indigo-500/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-indigo-400 hover:text-white transition-colors ml-1 leading-none"
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
                  className="flex-1 min-w-32 bg-transparent text-white placeholder-slate-500 outline-none py-1 text-sm"
                />
              </div>
            </div>

            {/* Learning Style */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Learning Style
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEARNING_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, learning_style: opt.value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                      form.learning_style === opt.value
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-[#0f0f1a] border-[#2d2d4e] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expertise Level */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Expertise Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {EXPERTISE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, expertise_level: opt.value }))}
                    className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      form.expertise_level === opt.value
                        ? 'bg-indigo-500/20 border-indigo-500'
                        : 'bg-[#0f0f1a] border-[#2d2d4e] hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        form.expertise_level === opt.value ? 'text-indigo-300' : 'text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Age Group */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Age Group
              </label>
              <div className="grid grid-cols-3 gap-3">
                {AGE_GROUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, age_group: opt.value }))}
                    className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      form.age_group === opt.value
                        ? 'bg-indigo-500/20 border-indigo-500'
                        : 'bg-[#0f0f1a] border-[#2d2d4e] hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        form.age_group === opt.value ? 'text-indigo-300' : 'text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                What's your goal?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, goal: opt.value }))}
                    className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      form.goal === opt.value
                        ? 'bg-indigo-500/20 border-indigo-500'
                        : 'bg-[#0f0f1a] border-[#2d2d4e] hover:border-slate-500'
                    }`}
                  >
                    <span className="text-xl mb-1">{opt.icon}</span>
                    <span
                      className={`text-sm font-semibold ${
                        form.goal === opt.value ? 'text-indigo-300' : 'text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Preferred Visual Style
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, image_style: opt.value }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm ${
                      form.image_style === opt.value
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-[#0f0f1a] border-[#2d2d4e] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Perspective / Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Role or Viewpoint
                <span className="text-slate-500 font-normal ml-2">— optional</span>
              </label>
              <textarea
                value={form.perspective}
                onChange={(e) => setForm((p) => ({ ...p, perspective: e.target.value }))}
                placeholder="e.g. I'm a software engineer exploring AI, or a student studying for a biology exam…"
                rows={3}
                className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
