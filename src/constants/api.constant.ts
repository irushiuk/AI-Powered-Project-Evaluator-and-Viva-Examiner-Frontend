// The browser talks to the API through a same-origin path (proxied in dev,
// or the api.* subdomain in prod) so HttpOnly cookies are sent with
// credentials: 'include'. Server-side code (SSR / server actions) can't use a
// relative URL, so it uses an absolute internal base instead.
const CLIENT_API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'
const SERVER_API_BASE =
  process.env.INTERNAL_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000/api'

export const API_BASE = typeof window === 'undefined' ? SERVER_API_BASE : CLIENT_API_BASE

export const AUTH_API = {
  login: `${API_BASE}/auth/login/`,
  refresh: `${API_BASE}/auth/token/refresh/`,
  me: `${API_BASE}/auth/me/`,
  facePhoto: `${API_BASE}/auth/me/face-photo/`,
  logout: `${API_BASE}/auth/logout/`,
  registerStudent: `${API_BASE}/auth/student/register/`,
  registerExaminer: `${API_BASE}/auth/examiner/register/`,
}
 
export const PROJECTS_API = {
  list: `${API_BASE}/projects/`,
  create: `${API_BASE}/projects/create/`,
  detail: (id: string) => `${API_BASE}/projects/${id}/`,
  activate: (id: string) => `${API_BASE}/projects/${id}/activate/`,
  examiners: (id: string) => `${API_BASE}/projects/${id}/examiners/`,
  addExaminer: (id: string) => `${API_BASE}/projects/${id}/examiners/add/`,
  removeExaminer: (id: string) => `${API_BASE}/projects/${id}/examiners/remove/`,
  submissions: (id: string) => `${API_BASE}/projects/${id}/submission/`,
  submit: (id: string) => `${API_BASE}/projects/${id}/submit/`,
  rubrics: (id: string) => `${API_BASE}/projects/${id}/rubrics/`,
  createRubricCategory: (id: string) => `${API_BASE}/projects/${id}/rubrics/categories/create/`,
  updateRubricCategory: (pid: string, cid: string) => `${API_BASE}/projects/${pid}/rubrics/categories/${cid}/update/`,
  deleteRubricCategory: (pid: string, cid: string) => `${API_BASE}/projects/${pid}/rubrics/categories/${cid}/delete/`,
  createCriteria: (pid: string, cid: string) => `${API_BASE}/projects/${pid}/rubrics/categories/${cid}/criteria/create/`,
  updateCriteria: (pid: string, cid: string, criId: string) => `${API_BASE}/projects/${pid}/rubrics/categories/${cid}/criteria/${criId}/update/`,
  deleteCriteria: (pid: string, cid: string, criId: string) => `${API_BASE}/projects/${pid}/rubrics/categories/${cid}/criteria/${criId}/delete/`,
  scheduleSessions: (id: string, mode: 'manual' | 'auto') => `${API_BASE}/projects/${id}/sessions/schedule/${mode}/`,
  sessions: (id: string) => `${API_BASE}/projects/${id}/sessions/`,
  mySession: (id: string) => `${API_BASE}/projects/${id}/sessions/my-session/`,
  updateSession: (pid: string, sid: string) => `${API_BASE}/projects/${pid}/sessions/${sid}/update/`,
  resetSessions: (id: string) => `${API_BASE}/projects/${id}/sessions/reset/`,
  openPanel: (id: string) => `${API_BASE}/projects/${id}/session-panel/open/`,
  activePanel: (id: string) => `${API_BASE}/projects/${id}/session-panel/active/`,
  vivaQuestions: (id: string) => `${API_BASE}/projects/${id}/viva/questions/`,
  createVivaQuestion: (id: string) => `${API_BASE}/projects/${id}/viva/questions/create/`,
  updateVivaQuestion: (pid: string, qid: string) => `${API_BASE}/projects/${pid}/viva/questions/${qid}/update/`,
  deleteVivaQuestion: (pid: string, qid: string) => `${API_BASE}/projects/${pid}/viva/questions/${qid}/delete/`,
}
 
export const SESSIONS_API = {
  startDemo: (id: string) => `${API_BASE}/sessions/${id}/start-demo/`,
  completeDemo: (id: string) => `${API_BASE}/sessions/${id}/complete-demo/`,
  endViva: (id: string) => `${API_BASE}/sessions/${id}/end-viva/`,
  myStatus: `${API_BASE}/sessions/my-status/`,
  agoraToken: (id: string) => `${API_BASE}/sessions/${id}/agora-token/`,
  agoraRoster: (id: string) => `${API_BASE}/sessions/${id}/agora-roster/`,
}

export const VIVA_API = {
  startSession: `${API_BASE}/viva/sessions/start/`,
  submitAnswer: (sessionId: string) => `${API_BASE}/viva/sessions/${sessionId}/answer/`,
  sessionStatus: (sessionId: string) => `${API_BASE}/viva/sessions/${sessionId}/status/`,
  currentQuestion: (sessionId: string) => `${API_BASE}/viva/sessions/${sessionId}/current/`,
  sessionReport: (sessionId: string) => `${API_BASE}/viva/sessions/${sessionId}/report/`,
  detailedReport: (sessionId: string) => `${API_BASE}/viva/sessions/${sessionId}/detailed-report/`,
}

export const CODE_ANALYSIS_API = {
  status: (codeSubmissionId: string) => `${API_BASE}/code-analysis/submissions/${codeSubmissionId}/status/`,
  sonarSummary: (codeSubmissionId: string) => `${API_BASE}/code-analysis/submissions/${codeSubmissionId}/sonar-summary/`,
  codeAnalysisReport: (codeSubmissionId: string) => `${API_BASE}/code-analysis/submissions/${codeSubmissionId}/report/`,
}

export const CV_ANALYSIS_API = {
  triggerAnalysis: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/cv/analyze/`,
  summary: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/cv/summary/`,
}

export const LIVE_QUESTIONS_API = {
  ask: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/live-questions/`,
  list: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/live-questions/list/`,
  pending: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/live-questions/pending/`,
  answer: (sessionId: string, questionId: string) =>
    `${API_BASE}/sessions/${sessionId}/live-questions/${questionId}/answer/`,
}

export const RUBRIC_EXTRACT_API = {
  extract: (projectId: string) => `${API_BASE}/projects/${projectId}/rubrics/extract/`,
}
 
export const STUDENT_API = {
  availableProjects: `${API_BASE}/projects/available/`,
  enroll: (id: string) => `${API_BASE}/projects/${id}/enroll/`,
  myEnrollments: `${API_BASE}/projects/my-enrollments/`,
}

export const PROJECT_API = {
  available: `${API_BASE}/projects/available/`,
  myEnrollments: `${API_BASE}/projects/my-enrollments/`,
  enroll: (projectId: string) => `${API_BASE}/projects/${projectId}/enroll/`,
  submission: (projectId: string) => `${API_BASE}/projects/${projectId}/submission/`,
  submitWork: (projectId: string) => `${API_BASE}/projects/${projectId}/submit/`,
}

export const SESSION_API = {
  next: `${API_BASE}/projects/sessions/next/`,
  myStatus: (status?: string) =>
    `${API_BASE}/sessions/my-status/${status ? `?status=${encodeURIComponent(status)}` : ''}`,
  mySession: (projectId: string) => `${API_BASE}/projects/${projectId}/sessions/my-session/`,
  startDemo: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/student/start-demo/`,
  startViva: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/student/start-viva/`,
  endDemo: (sessionId: string) => `${API_BASE}/sessions/${sessionId}/end-demo/`,
}
 
export default {
  API_BASE,
  AUTH_API,
  PROJECT_API,
  SESSION_API,
  PROJECTS_API,
  CODE_ANALYSIS_API,
  SESSIONS_API,
  VIVA_API,
  STUDENT_API,
}
