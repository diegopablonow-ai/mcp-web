"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { reportError } from "@/lib/reportError"

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportError(error)
  }, [error])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error.message ?? "Failed to load."}</p>
      <Button size="sm" variant="outline" onClick={reset}>Retry</Button>
    </div>
  )
}
