const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Request / Response Types ────────────────────────────────────────────────

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CreateUserRequest {
  name: string;
  interests: string[];
  learning_style: LearningStyle;
  expertise_level: ExpertiseLevel;
  perspective: string;
}

export interface User {
  id: number;
  name: string;
  interests: string[];
  learning_style: LearningStyle;
  expertise_level: ExpertiseLevel;
  perspective: string;
  created_at: string;
}

export interface ExploreTopicRequest {
  user_id: number;
  topic: string;
}

export interface ExploreTopicResponse {
  session_id: number;
  topic: string;
  status: string;
}

export type SessionStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface Session {
  id: number;
  user_id: number;
  topic: string;
  status: SessionStatus;
  content_summary?: string;
  video_url?: string;
  slides_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateVideoRequest {
  session_id: number;
}

export interface GenerateVideoResponse {
  status: string;
  video_url?: string;
  message?: string;
}

export interface GenerateSlidesRequest {
  session_id: number;
}

export interface GenerateSlidesResponse {
  status: string;
  slides_url?: string;
  message?: string;
}

export interface QuizOption {
  id: number;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  explanation?: string;
}

export interface QuizResponse {
  session_id: number;
  questions: QuizQuestion[];
}

export interface SubmitQuizRequest {
  answers: number[];
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  results: Array<{
    question_id: number;
    correct: boolean;
    correct_answer: number;
    explanation: string;
  }>;
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(errorText || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createUser: (data: CreateUserRequest) =>
    request<User>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getUser: (id: number) => request<User>(`/api/users/${id}`),

  exploreTopic: (data: ExploreTopicRequest) =>
    request<ExploreTopicResponse>('/api/topics/explore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getSession: (id: number) => request<Session>(`/api/sessions/${id}`),

  generateVideo: (sessionId: number) =>
    request<GenerateVideoResponse>('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  generateSlides: (sessionId: number) =>
    request<GenerateSlidesResponse>('/api/slides/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  getQuiz: (sessionId: number) =>
    request<QuizResponse>(`/api/quiz/${sessionId}`),

  submitQuiz: (sessionId: number, answers: number[]) =>
    request<QuizResult>(`/api/quiz/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    }),

  getVideoUrl: (sessionId: number) =>
    `${API_BASE}/api/files/video/${sessionId}`,

  getSlidesUrl: (sessionId: number) =>
    `${API_BASE}/api/files/slides/${sessionId}`,

  loginUser: (name: string) =>
    request<User>('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
};
