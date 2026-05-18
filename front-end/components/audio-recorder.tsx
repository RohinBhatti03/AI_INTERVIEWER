"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"
import { transcribeAudio } from "@/lib/api"

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onTranscription, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
       : "audio/mp4"

       const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        stream.getTracks().forEach((track) => track.stop())

        setIsTranscribing(true)
        try {
          const transcription = await transcribeAudio(audioBlob)
          onTranscription(transcription)
        } catch (error) {
          console.error("[v0] Transcription failed:", error)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch (error) {
      console.error("[v0] Failed to start recording:", error)
    }
  }, [onTranscription])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isTranscribing) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-secondary-foreground">
          Transcribing your answer...
        </span>
      </div>
    )
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="destructive"
          size="lg"
          className="gap-2"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4 fill-current" />
          Stop Recording
        </Button>
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive"></span>
          </span>
          <span className="font-mono text-sm font-medium text-destructive">
            {formatTime(recordingTime)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="gap-2"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="h-5 w-5" />
      Record Answer
    </Button>
  )
}
