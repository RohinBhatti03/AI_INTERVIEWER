"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type {
  InterviewState,
  InterviewConfig,
  QuestionHistoryItem,
  FullInterviewReport,
  EvaluationResponse,
} from "./types"
import {
  generateQuestions,
  evaluateAnswer,
  getSessionReport,
  getRealtimeFollowup,
} from "./api"

interface InterviewContextType {
  state: InterviewState
  startSetup: () => void
  startInterview: (config: InterviewConfig) => Promise<void>
  submitAnswer: (
    answer: string,
    code?: string
  ) => Promise<{ action: string; nextQuestion?: string; instruction?: string }>
  endInterview: () => Promise<void>
  resetInterview: () => void
  isLoading: boolean
}

const initialState: InterviewState = {
  status: "idle",
  config: null,
  questions: [],
  currentQuestionIndex: 0,
  questionHistory: [],
  report: null,
}

const InterviewContext = createContext<InterviewContextType | null>(null)

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InterviewState>(initialState)
  const [isLoading, setIsLoading] = useState(false)

  const startSetup = useCallback(() => {
    setState((prev) => ({ ...prev, status: "setup" }))
  }, [])

  const startInterview = useCallback(async (config: InterviewConfig) => {
    setIsLoading(true)
    try {
      const response = await generateQuestions({
        role: config.role,
        level: config.level,
        count: config.questionCount,
        interview_type: config.interviewType,
        resume_summary: config.resumeSummary,
      })

      setState({
        status: "interviewing",
        config,
        questions: response.questions,
        currentQuestionIndex: 0,
        questionHistory: [],
        report: null,
      })
    } catch (error) {
      console.error("[v0] Failed to start interview:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitAnswer = useCallback(
    async (answer: string, code?: string) => {
      if (!state.config || state.currentQuestionIndex >= state.questions.length) {
        return { action: "end" }
      }

      setIsLoading(true)
      try {
        const currentQuestion = state.questions[state.currentQuestionIndex]
        const isCodingQuestion = state.currentQuestionIndex < Math.ceil(state.questions.length * 0.2)
        const questionType = isCodingQuestion ? "coding" : "oral"

        // Evaluate the answer
        const evaluation: EvaluationResponse = await evaluateAnswer({
          question: currentQuestion,
          question_type: questionType,
          role: state.config.role,
          level: state.config.level,
          user_answer: answer,
          user_code: code,
          resume_summary: state.config.resumeSummary,
        })

        // Get real-time follow-up decision
        const followup = await getRealtimeFollowup({
          resume_summary: state.config.resumeSummary || "",
          role: state.config.role,
          level: state.config.level,
          question_history: state.questionHistory.map((h) => ({
            question: h.question,
            answer: h.answer,
          })),
          last_answer: answer,
          last_question: currentQuestion,
          question_type: questionType,
          user_code: code,
        })

        const historyItem: QuestionHistoryItem = {
          question: currentQuestion,
          answer: answer,
          evaluation,
          questionType,
        }

        if (followup.action === "end" || state.currentQuestionIndex >= state.questions.length - 1) {
          setState((prev) => ({
            ...prev,
            questionHistory: [...prev.questionHistory, historyItem],
          }))
          return { action: "end" }
        }

        if (followup.action === "followup" && followup.next_question) {
          setState((prev) => ({
            ...prev,
            questions: [
              ...prev.questions.slice(0, prev.currentQuestionIndex + 1),
              followup.next_question!,
              ...prev.questions.slice(prev.currentQuestionIndex + 1),
            ],
            questionHistory: [...prev.questionHistory, historyItem],
            currentQuestionIndex: prev.currentQuestionIndex + 1,
          }))
          return {
            action: "followup",
            nextQuestion: followup.next_question,
            instruction: followup.instruction,
          }
        }

        setState((prev) => ({
          ...prev,
          questionHistory: [...prev.questionHistory, historyItem],
          currentQuestionIndex: prev.currentQuestionIndex + 1,
        }))

        return { action: "next" }
      } catch (error) {
        console.error("[v0] Failed to submit answer:", error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [state]
  )

  const endInterview = useCallback(async () => {
    if (!state.config || state.questionHistory.length === 0) {
      setState((prev) => ({ ...prev, status: "completed" }))
      return
    }

    setIsLoading(true)
    try {
      const evaluations = state.questionHistory
        .filter((h) => h.evaluation)
        .map((h) => h.evaluation!)

      const report: FullInterviewReport = await getSessionReport({
        evaluations,
        role: state.config.role,
        level: state.config.level,
      })

      setState((prev) => ({
        ...prev,
        status: "completed",
        report,
      }))
    } catch (error) {
      console.error("[v0] Failed to generate report:", error)
      setState((prev) => ({ ...prev, status: "completed" }))
    } finally {
      setIsLoading(false)
    }
  }, [state.config, state.questionHistory])

  const resetInterview = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <InterviewContext.Provider
      value={{
        state,
        startSetup,
        startInterview,
        submitAnswer,
        endInterview,
        resetInterview,
        isLoading,
      }}
    >
      {children}
    </InterviewContext.Provider>
  )
}

export function useInterview() {
  const context = useContext(InterviewContext)
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider")
  }
  return context
}
