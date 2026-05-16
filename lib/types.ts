// Interview Types
export interface QuestionRequest {
  role: string
  level: string
  count: number
  interview_type: string
  resume_summary?: string
}

export interface QuestionResponse {
  questions: string[]
  model_used: string
}

export interface ResumeParseResponse {
  name: string | null
  skills: string[]
  experience: string[]
  projects: string[]
  education: string[]
  summary: string
}

export interface RealtimeFollowupRequest {
  resume_summary: string
  role: string
  level: string
  question_history: { question: string; answer: string }[]
  last_answer: string
  last_question: string
  question_type: string
  user_code?: string
}

export interface RealtimeFollowupResponse {
  action: "followup" | "next" | "end"
  next_question?: string
  instruction?: string
  reason: string
}

export interface EvaluationRequest {
  question: string
  question_type: string
  role: string
  level: string
  user_answer?: string
  user_code?: string
  resume_summary?: string
}

export interface EvaluationResponse {
  technicalScore: number
  confidenceScore: number
  englishScore: number
  clarityScore: number
  aiFeedback: string
  idealAnswer: string
  suggestions: string[]
  englishFeedback: string
}

export interface SessionReportRequest {
  evaluations: EvaluationResponse[]
  role: string
  level: string
}

export interface FullInterviewReport {
  overallScore: number
  technicalAvg: number
  confidenceAvg: number
  englishAvg: number
  clarityAvg: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  hiringRecommendation: "Strong Yes" | "Yes" | "Maybe" | "No"
  detailedFeedback: string
}

export interface InterviewConfig {
  role: string
  level: string
  questionCount: number
  interviewType: "coding-mix" | "oral"
  resumeSummary?: string
  resumeData?: ResumeParseResponse
}

export interface QuestionHistoryItem {
  question: string
  answer: string
  evaluation?: EvaluationResponse
  questionType: "oral" | "coding"
}

export interface InterviewState {
  status: "idle" | "setup" | "interviewing" | "completed"
  config: InterviewConfig | null
  questions: string[]
  currentQuestionIndex: number
  questionHistory: QuestionHistoryItem[]
  report: FullInterviewReport | null
}
