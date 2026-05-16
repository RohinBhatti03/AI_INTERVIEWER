"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Target,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  Brain,
  Mic,
  BookOpen,
} from "lucide-react"
import type { FullInterviewReport, InterviewConfig, QuestionHistoryItem } from "@/lib/types"

interface InterviewReportProps {
  report: FullInterviewReport | null
  config: InterviewConfig | null
  questionHistory: QuestionHistoryItem[]
  onRestart: () => void
  isLoading: boolean
}

function ScoreCard({
  label,
  score,
  icon: Icon,
  color,
}: {
  label: string
  score: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-bold text-foreground">{score}</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  )
}

function getRecommendationColor(recommendation: string) {
  switch (recommendation) {
    case "Strong Yes":
      return "bg-[color:var(--success)] text-[color:var(--success-foreground)]"
    case "Yes":
      return "bg-primary text-primary-foreground"
    case "Maybe":
      return "bg-[color:var(--warning)] text-[color:var(--warning-foreground)]"
    case "No":
      return "bg-destructive text-destructive-foreground"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

export function InterviewReport({
  report,
  config,
  questionHistory,
  onRestart,
  isLoading,
}: InterviewReportProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          <Brain className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">Generating Your Report</h3>
          <p className="text-muted-foreground">Analyzing your performance...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">Interview Completed</h3>
          <p className="mb-4 text-muted-foreground">
            No detailed report available. You may have ended the interview early.
          </p>
          <Button onClick={onRestart} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start New Interview
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Interview Complete!</h1>
        <p className="text-muted-foreground">
          {config?.role} • {config?.level} Level
        </p>
      </div>

      {/* Overall Score & Recommendation */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col items-center justify-between gap-6 p-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className="text-5xl font-bold text-primary">{report.overallScore}</p>
            <p className="text-sm text-muted-foreground">out of 100</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm text-muted-foreground">Hiring Recommendation</p>
            <Badge className={`px-4 py-2 text-lg ${getRecommendationColor(report.hiringRecommendation)}`}>
              {report.hiringRecommendation}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Score Breakdown */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Technical"
          score={report.technicalAvg}
          icon={Target}
          color="text-primary"
        />
        <ScoreCard
          label="Confidence"
          score={report.confidenceAvg}
          icon={Sparkles}
          color="text-[color:var(--accent)]"
        />
        <ScoreCard
          label="English"
          score={report.englishAvg}
          icon={Mic}
          color="text-[color:var(--chart-3)]"
        />
        <ScoreCard
          label="Clarity"
          score={report.clarityAvg}
          icon={MessageSquare}
          color="text-[color:var(--chart-4)]"
        />
      </div>

      {/* Detailed Feedback */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Detailed Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-foreground">{report.detailedFeedback}</p>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[color:var(--success)]">
              <CheckCircle2 className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                  <span className="text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.weaknesses.map((weakness, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[color:var(--warning)]" />
            Suggestions for Next Time
          </CardTitle>
          <CardDescription>
            Here are some actionable tips to improve your interview performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-3"
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Question History */}
      {questionHistory.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Question History</CardTitle>
            <CardDescription>
              Review your answers and individual evaluations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questionHistory.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    Q{i + 1}: {item.question}
                  </p>
                  <Badge variant={item.questionType === "coding" ? "default" : "secondary"}>
                    {item.questionType}
                  </Badge>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  <strong>Your answer:</strong> {item.answer || "No answer provided"}
                </p>
                {item.evaluation && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Technical: {item.evaluation.technicalScore}
                    </Badge>
                    <Badge variant="outline">
                      Confidence: {item.evaluation.confidenceScore}
                    </Badge>
                    <Badge variant="outline">
                      English: {item.evaluation.englishScore}
                    </Badge>
                    <Badge variant="outline">
                      Clarity: {item.evaluation.clarityScore}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Restart Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={onRestart} className="gap-2">
          <RotateCcw className="h-5 w-5" />
          Start New Interview
        </Button>
      </div>
    </div>
  )
}
