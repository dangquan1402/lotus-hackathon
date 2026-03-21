const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Request / Response Types ────────────────────────────────────────────────

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced';
export type AgeGroup = 'primary' | 'secondary' | 'adult';
export type Goal = 'curiosity' | 'exam_prep' | 'homework' | 'career';
export type ImageStyle = 'cartoon' | 'watercolor' | 'photorealistic' | 'minimalist' | 'anime' | 'scientific' | '3d_render';

export interface CreateUserRequest {
  name: string;
  interests: string[];
  learning_style: LearningStyle;
  expertise_level: ExpertiseLevel;
  perspective: string;
  age_group?: AgeGroup;
  goal?: Goal;
  image_style?: ImageStyle;
}

export interface User {
  id: number;
  name: string;
  interests: string[];
  learning_style: LearningStyle;
  expertise_level: ExpertiseLevel;
  perspective: string;
  age_group?: string;
  goal?: string;
  image_style?: string;
  created_at: string;
}

export type ContentMode = 'short' | 'long';

export interface ExploreTopicRequest {
  user_id: number;
  topic: string;
  mode?: ContentMode;
  image_style?: ImageStyle;
  session_id?: number;
}

export interface ExploreTopicResponse {
  session_id: number;
  topic: string;
  status: string;
}

export interface Session {
  id: number;
  user_id: number;
  topic: string;
  status: string;
  search_results?: { url: string; title: string; markdown: string }[];
  generated_content?: {
    title: string;
    overview: string;
    sections: { title: string; narration_text: string; image_prompt: string }[];
    quiz_questions: { question: string; options: string[]; correct_index: number; explanation: string }[];
  };
  image_paths?: string[];
  audio_path?: string;
  alignment?: Record<string, unknown>;
  video_path?: string;
  slides_path?: string;
  image_style?: string;
  concepts_learned?: string[];
  assessment_qa?: { questions: AssessmentQuestion[]; answers: Record<string, string> };
  assessment_summary?: string;
  error_message?: string;
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

export interface StartAssessmentRequest {
  user_id: number;
  topic: string;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: string;
  options?: string[];
  purpose?: string;
}

export interface StartAssessmentResponse {
  thread_id: string;
  questions: AssessmentQuestion[];
}

export interface SubmitAssessmentRequest {
  thread_id: string;
  answers: Record<string, string>;
}

export interface SubmitAssessmentResponse {
  assessment_summary: string;
  session_id: number;
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

  getSession: (id: number) => request<Session>(`/api/topics/sessions/${id}`),

  listSessions: (userId: number) => request<Session[]>(`/api/topics/sessions?user_id=${userId}`),

  generateImages: (sessionId: number) =>
    request<{ session_id: number; status: string; image_paths: string[]; message: string }>('/api/video/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  generateVoice: (sessionId: number) =>
    request<{ session_id: number; status: string; audio_path: string; message: string }>('/api/video/generate-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  generateVideo: (sessionId: number) =>
    request<GenerateVideoResponse>('/api/video/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  generateAll: (sessionId: number) =>
    request<GenerateVideoResponse>('/api/video/generate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),

  generateSectionAudio: (sessionId: number, sectionIndex: number, text: string) =>
    request<{ audio_url: string }>('/api/video/generate-section-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, section_index: sectionIndex, text }),
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

  startAssessment: (data: StartAssessmentRequest) =>
    request<StartAssessmentResponse>('/api/assessment/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  submitAssessment: (data: SubmitAssessmentRequest) =>
    request<SubmitAssessmentResponse>('/api/assessment/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getVideoUrl: (sessionId: number) =>
    `${API_BASE}/api/files/video/${sessionId}`,

  getSlidesUrl: (sessionId: number) =>
    `${API_BASE}/api/files/slides/${sessionId}`,

  updateUser: (userId: number, data: Partial<CreateUserRequest>) =>
    request<User>(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  loginUser: (name: string) =>
    request<User>('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  startChat: (data: { session_id: number }) =>
    request<{ thread_id: string; welcome_message: string }>('/api/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  sendChatMessage: (data: { thread_id: string; message: string }) =>
    request<{ response: string; sources: { url: string; title: string }[] }>('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  streamChatMessage: async (
    data: { thread_id: string; message: string },
    onChunk: (text: string) => void,
    onDone: (sources: { url: string; title: string }[]) => void,
  ): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/chat/message/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(errorText || `Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr) as {
            content?: string;
            done?: boolean;
            sources?: { url: string; title: string }[];
          };
          if (parsed.done) {
            onDone(parsed.sources ?? []);
            return;
          }
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  },
};
