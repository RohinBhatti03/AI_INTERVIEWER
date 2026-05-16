"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle2, X, Loader2 } from "lucide-react"
import { parseResume } from "@/lib/api"
import type { ResumeParseResponse } from "@/lib/types"

interface ResumeUploadProps {
  onResumeParsed: (data: ResumeParseResponse) => void
  resumeData: ResumeParseResponse | null
  onClear: () => void
}

export function ResumeUpload({ onResumeParsed, resumeData, onClear }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsUploading(true)
      setError(null)

      try {
        const data = await parseResume(file)
        onResumeParsed(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse resume")
      } finally {
        setIsUploading(false)
      }
    },
    [onResumeParsed]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  if (resumeData) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {resumeData.name || "Resume Uploaded"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {resumeData.skills.length} skills • {resumeData.experience.length} experiences
                </p>
                {resumeData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {resumeData.skills.slice(0, 5).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {resumeData.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{resumeData.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {isDragActive ? (
                <FileText className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">
              {isUploading
                ? "Analyzing resume..."
                : isDragActive
                  ? "Drop your resume here"
                  : "Upload your resume (optional)"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isUploading
                ? "This may take a moment"
                : "PDF format • Get personalized questions"}
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
