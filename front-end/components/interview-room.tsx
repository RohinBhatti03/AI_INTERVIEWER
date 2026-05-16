"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AudioRecorder } from "./audio-recorder"
import { CodeEditor } from "./code-editor"
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  Code,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import type { InterviewState } from "@/lib/types"

interface InterviewRoomProps {
  state: InterviewState
  onSubmitAnswer: (answer: string, code?: string) => Promise<{ action: string; nextQuestion?: string; instruction?: string }>
  onEndInterview: () => void
  isLoading: boolean
}

export function InterviewRoom({
  state,
  onSubmitAnswer,
  onEndInterview,
  isLoading,
}: InterviewRoomProps) {
  const [answer, setAnswer] = useState("")
  const [code, setCode] = useState("")
  const [instruction, setInstruction] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentQuestion = state.questions[state.currentQuestionIndex]
  const progress = ((state.currentQuestionIndex) / state.questions.length) * 100
  const isCodingQuestion = state.currentQuestionIndex < Math.ceil(state.questions.length * 0.2)

  useEffect(() => {
    setAnswer("")
    setCode("")
    setInstruction(null)
  }, [state.currentQuestionIndex])

  const handleSubmit = async () => {
    if (!answer.trim() && !code.trim()) return

    setIsSubmitting(true)
    try {
      const result = await onSubmitAnswer(answer, code || undefined)

      if (result.action === "end") {
        onEndInterview()
      } else if (result.instruction) {
        setInstruction(result.instruction)
      }
    } catch (error) {
      console.error("[v0] Failed to submit answer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTranscription = (text: string) => {
    setAnswer((prev) => (prev ? `${prev} ${text}` : text))
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    try {
      const result = await onSubmitAnswer("No answer provided", code || undefined)
      if (result.action === "end") {
        onEndInterview()
      }
    } catch (error) {
      console.error("[v0] Failed to skip:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary">
              {state.config?.role}
            </Badge>
            <Badge variant="secondary">{state.config?.level}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            Question {state.currentQuestionIndex + 1} of {state.questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-6 border-primary/20 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <CardTitle className="text-lg">AI Interviewer</CardTitle>
                <Badge variant={isCodingQuestion ? "default" : "secondary"}>
                  {isCodingQuestion ? (
                    <>
                      <Code className="mr-1 h-3 w-3" /> Coding
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-1 h-3 w-3" /> Conceptual
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-foreground leading-relaxed">{currentQuestion}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Instruction Alert */}
      {instruction && (
        <Card className="mb-6 border-[color:var(--warning)] bg-[color:var(--warning)]/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-[color:var(--warning)]" />
            <div>
              <p className="font-medium text-foreground">Follow-up from interviewer</p>
              <p className="text-sm text-muted-foreground">{instruction}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer Section */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-6">
          {/* Code Editor for coding questions */}
          {isCodingQuestion && (
            <CodeEditor
              value={code}
              onChange={setCode}
              disabled={isSubmitting || isLoading}
            />
          )}

          {/* Text Answer */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Your Answer
            </label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                isCodingQuestion
                  ? "Explain your approach and thought process..."
                  : "Type your answer or use voice recording..."
              }
              className="min-h-[120px] resize-y"
              disabled={isSubmitting || isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <AudioRecorder
              onTranscription={handleTranscription}
              disabled={isSubmitting || isLoading}
            />

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isSubmitting || isLoading}
              >
                Skip Question
              </Button>
              <Button
                size="lg"
                className="gap-2"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading || (!answer.trim() && !code.trim())}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Evaluating...
                  </>
                ) : state.currentQuestionIndex >= state.questions.length - 1 ? (
                  <>
                    Finish Interview
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Submit Answer
                    <Send className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* End Early Button */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline"
          onClick={onEndInterview}
          disabled={isSubmitting || isLoading}
        >
          End Interview Early
        </Button>
      </div>
    </div>
  )
}
