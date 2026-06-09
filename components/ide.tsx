"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically imported to keep the Monaco runtime (~2 MB) out of the
// initial page bundle. Only loaded when the IDE tab is first rendered.
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
)
import { toast } from "sonner"
import {
  File as FileIcon,
  FileCode,
  FileJson,
  FileText,
  Save,
  Loader2,
  TerminalSquare,
  ChevronRight,
} from "lucide-react"
import { projectService } from "@/services/projectService"
import type { ProjectFile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/helpers"

function fileIcon(path: string) {
  if (path.endsWith(".json")) return FileJson
  if (path.endsWith(".md")) return FileText
  if (path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".js")) return FileCode
  return FileIcon
}

export function IDE({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [activePath, setActivePath] = useState<string>("")
  const [draft, setDraft] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [term, setTerm] = useState<string[]>([
    "$ mcp dev --watch",
    "▸ Building MCP server…",
    "✓ Compiled successfully. Listening on stdio.",
  ])
  const [cmd, setCmd] = useState("")
  const termRef = useRef<HTMLDivElement>(null)

  // Load project files (integration point: GET /projects/{id}/files).
  useEffect(() => {
    let active = true
    setLoading(true)
    projectService.listFiles(projectId).then((f) => {
      if (!active) return
      setFiles(f)
      if (f.length) {
        setActivePath(f[0].path)
        setDraft(f[0].content)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [projectId])

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath),
    [files, activePath],
  )

  function openFile(path: string) {
    if (dirty && !confirm("Discard unsaved changes?")) return
    const f = files.find((x) => x.path === path)
    if (!f) return
    setActivePath(path)
    setDraft(f.content)
    setDirty(false)
  }

  // Save the active file (integration point: PUT /projects/{id}/files).
  async function save() {
    if (!activeFile) return
    setSaving(true)
    try {
      await projectService.saveFile(projectId, activeFile.path, draft)
      setFiles((prev) =>
        prev.map((f) => (f.path === activeFile.path ? { ...f, content: draft } : f)),
      )
      setDirty(false)
      toast.success(`Saved ${activeFile.path}`)
    } catch {
      toast.error("Failed to save file.")
    } finally {
      setSaving(false)
    }
  }

  function runCommand(e: React.FormEvent) {
    e.preventDefault()
    if (!cmd.trim()) return
    const responses: Record<string, string> = {
      ls: files.map((f) => f.path).join("  "),
      "mcp deploy": "▸ Deploying to platform… ✓ Live at https://acme-postgres-mcp.mcp.app",
      clear: "",
    }
    const out = responses[cmd.trim()] ?? `command not found: ${cmd}`
    setTerm((prev) =>
      cmd.trim() === "clear" ? [] : [...prev, `$ ${cmd}`, ...(out ? [out] : [])],
    )
    setCmd("")
    requestAnimationFrame(() => {
      termRef.current?.scrollTo({ top: termRef.current.scrollHeight })
    })
  }

  // Ctrl/Cmd+S to save.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, draft])

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{projectId}</span>
          {activePath && (
            <>
              <ChevronRight className="size-3.5" />
              <span className="font-mono text-xs">{activePath}</span>
              {dirty && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Unsaved" />}
            </>
          )}
        </div>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* File tree */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r bg-card/50 py-2 sm:block">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Files
          </p>
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
          ) : (
            <ul>
              {files.map((f) => {
                const Icon = fileIcon(f.path)
                return (
                  <li key={f.path}>
                    <button
                      onClick={() => openFile(f.path)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        activePath === f.path && "bg-accent font-medium text-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs">{f.path}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Editor + terminal */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Editor
              theme="vs-dark"
              path={activePath}
              language={activeFile?.language}
              value={draft}
              onChange={(v) => {
                setDraft(v ?? "")
                setDirty(true)
              }}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                fontFamily: "var(--font-geist-mono), monospace",
                tabSize: 2,
              }}
              loading={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading editor…
                </div>
              }
            />
          </div>

          {/* Terminal */}
          <div className="h-44 shrink-0 border-t bg-[#1e1e1e] text-[#d4d4d4]">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs text-white/70">
              <TerminalSquare className="size-3.5" />
              Terminal
            </div>
            <div
              ref={termRef}
              className="h-[calc(11rem-2.4rem)] overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed"
            >
              {term.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              <form onSubmit={runCommand} className="flex items-center gap-1.5">
                <span className="text-emerald-400">$</span>
                <input
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  className="flex-1 bg-transparent outline-none placeholder:text-white/30"
                  placeholder="Type a command (try: ls, mcp deploy, clear)"
                  spellCheck={false}
                  aria-label="Terminal command"
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
