"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ResumeUpload } from "./resume-upload"
import { ArrowLeft, ArrowRight, Loader2, Briefcase, GraduationCap, Hash, Code } from "lucide-react"
import type { InterviewConfig, ResumeParseResponse } from "@/lib/types"

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => Promise<void>
  onBack: () => void
  isLoading: boolean
}

const roles = [
  "MERN Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Mobile Developer",
  "Software Engineer",
]

const levels = ["Junior", "Mid-Level", "Senior", "Lead", "Principal"]

export function InterviewSetup({ onStart, onBack, isLoading }: InterviewSetupProps) {
  const [role, setRole] = useState("MERN Stack Developer")
  const [customRole, setCustomRole] = useState("")
  const [level, setLevel] = useState("Junior")
  const [questionCount, setQuestionCount] = useState(5)
  const [interviewType, setInterviewType] = useState<"coding-mix" | "oral">("coding-mix")
  const [resumeData, setResumeData] = useState<ResumeParseResponse | null>(null)

  const handleStart = async () => {
    const finalRole = role === "custom" ? customRole : role
    if (!finalRole.trim()) return

    await onStart({
      role: finalRole,
      level,
      questionCount,
      interviewType,
      resumeSummary: resumeData?.summary,
      resumeData: resumeData || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-2xl">Configure Your Interview</CardTitle>
          <CardDescription>
            Set up your practice session. Upload your resume for personalized questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resume Upload */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Resume</Label>
            <ResumeUpload
              onResumeParsed={setResumeData}
              resumeData={resumeData}
              onClear={() => setResumeData(null)}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Briefcase className="h-4 w-4 text-primary" />
              Target Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Role...</SelectItem>
              </SelectContent>
            </Select>
            {role === "custom" && (
              <Input
                placeholder="Enter your target role"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Level Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <GraduationCap className="h-4 w-4 text-primary" />
              Experience Level
            </Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Hash className="h-4 w-4 text-primary" />
                Number of Questions
              </Label>
              <span className="font-mono text-lg font-semibold text-primary">
                {questionCount}
              </span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={(v) => setQuestionCount(v[0])}
              min={3}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Quick (3)</span>
              <span>Standard (5)</span>
              <span>Thorough (10)</span>
            </div>
          </div>

          {/* Interview Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Code className="h-4 w-4 text-primary" />
              Interview Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={interviewType === "coding-mix" ? "default" : "outline"}
                className="h-auto flex-col gap-1 py-4"
                onClick={() => setInterviewType("coding-mix")}
              >
                <span className="font-semibold">Mixed</span>
                <span className="text-xs opacity-80">Coding + Conceptual</span>
              </Button>
              <Button
                type="button"
                variant={interviewType === "oral" ? "default" : "outline"}
                className="h-auto flex-col gap-1 py-4"
                onClick={() => setInterviewType("oral")}
              >
                <span className="font-semibold">Oral Only</span>
                <span className="text-xs opacity-80">Conceptual Questions</span>
              </Button>
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleStart}
            disabled={isLoading || (role === "custom" && !customRole.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Questions...
              </>
            ) : (
              <>
                Start Interview
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
