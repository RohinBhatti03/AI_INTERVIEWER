"use client"

import { Bot, Sparkles } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Interviewer</h1>
            <p className="text-xs text-muted-foreground">Practice Technical Interviews</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-secondary-foreground">AI Powered</span>
        </div>
      </div>
    </header>
  )
}
