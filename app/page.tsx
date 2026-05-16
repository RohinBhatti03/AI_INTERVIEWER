"use client"

import { InterviewProvider, useInterview } from "@/lib/interview-context"
import { Header } from "@/components/header"
import { Landing } from "@/components/landing"
import { InterviewSetup } from "@/components/interview-setup"
import { InterviewRoom } from "@/components/interview-room"
import { InterviewReport } from "@/components/interview-report"

function InterviewApp() {
  const {
    state,
    startSetup,
    startInterview,
    submitAnswer,
    endInterview,
    resetInterview,
    isLoading,
  } = useInterview()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {state.status === "idle" && (
        <Landing onStart={startSetup} />
      )}

      {state.status === "setup" && (
        <InterviewSetup
          onStart={startInterview}
          onBack={resetInterview}
          isLoading={isLoading}
        />
      )}

      {state.status === "interviewing" && (
        <InterviewRoom
          state={state}
          onSubmitAnswer={submitAnswer}
          onEndInterview={endInterview}
          isLoading={isLoading}
        />
      )}

      {state.status === "completed" && (
        <InterviewReport
          report={state.report}
          config={state.config}
          questionHistory={state.questionHistory}
          onRestart={resetInterview}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <InterviewProvider>
      <InterviewApp />
    </InterviewProvider>
  )
}
