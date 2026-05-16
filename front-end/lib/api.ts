import type {
  QuestionRequest,
  QuestionResponse,
  ResumeParseResponse,
  RealtimeFollowupRequest,
  RealtimeFollowupResponse,
  EvaluationRequest,
  EvaluationResponse,
  SessionReportRequest,
  FullInterviewReport,
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `API error: ${response.status}`)
  }

  return response.json()
}

export async function parseResume(file: File): Promise<ResumeParseResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/parse-resume`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to parse resume" }))
    throw new Error(error.detail)
  }

  return response.json()
}

export async function generateQuestions(
  request: QuestionRequest
): Promise<QuestionResponse> {
  return apiRequest<QuestionResponse>("/generate-questions", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append("file", audioBlob, "audio.webm")

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Failed to transcribe audio")
  }

  const data = await response.json()
  return data.transcription
}

export async function getRealtimeFollowup(
  request: RealtimeFollowupRequest
): Promise<RealtimeFollowupResponse> {
  return apiRequest<RealtimeFollowupResponse>("/realtime-followup", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export async function evaluateAnswer(
  request: EvaluationRequest
): Promise<EvaluationResponse> {
  return apiRequest<EvaluationResponse>("/evaluate", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export async function getSessionReport(
  request: SessionReportRequest
): Promise<FullInterviewReport> {
  return apiRequest<FullInterviewReport>("/session-report", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export async function textToSpeech(text: string, voice?: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice }),
  })

  if (!response.ok) {
    throw new Error("Failed to generate speech")
  }

  return response.blob()
}
