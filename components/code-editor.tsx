"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Code } from "lucide-react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CodeEditor({ value, onChange, disabled }: CodeEditorProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-base font-medium">
        <Code className="h-4 w-4 text-primary" />
        Code Editor
      </Label>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="// Write your code here..."
          className="min-h-[300px] resize-y font-mono text-sm bg-muted/30"
          spellCheck={false}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Write your solution above. You can also explain your approach verbally.
      </p>
    </div>
  )
}
