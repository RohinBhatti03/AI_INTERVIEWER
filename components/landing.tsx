"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  Brain,
  FileText,
  Mic,
  Code,
  BarChart3,
  MessageSquare,
} from "lucide-react"

interface LandingProps {
  onStart: () => void
}

const features = [
  {
    icon: FileText,
    title: "Resume Analysis",
    description: "Upload your resume for personalized questions tailored to your experience",
  },
  {
    icon: Brain,
    title: "AI-Powered Questions",
    description: "Dynamic questions generated based on role, level, and your background",
  },
  {
    icon: Mic,
    title: "Voice Recognition",
    description: "Answer questions naturally using voice with real-time transcription",
  },
  {
    icon: Code,
    title: "Coding Challenges",
    description: "Practice coding problems with an integrated code editor",
  },
  {
    icon: MessageSquare,
    title: "Real-time Feedback",
    description: "Get instant follow-up questions and adaptive interviewing",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Report",
    description: "Detailed evaluation with scores, feedback, and hiring recommendation",
  },
]

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered Interview Practice</span>
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
          Master Your Technical
          <br />
          <span className="text-primary">Interview Skills</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground text-pretty">
          Practice with an AI interviewer that adapts to your skills and experience.
          Get real-time feedback, personalized questions, and comprehensive evaluation
          to help you ace your next technical interview.
        </p>

        <Button
          size="lg"
          className="group h-14 gap-2 px-8 text-lg"
          onClick={onStart}
        >
          Start Interview Practice
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-border bg-card transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
