import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { ProjectFile } from "@/lib/types"
import { mockProjectFiles } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// projectService — powers the embedded IDE.
//
// Backend endpoints consumed:
//   GET  /projects/{id}/files              List all files for a project.
//   PUT  /projects/{id}/files/{filePath}   Save (upsert) a single file.
//
// These endpoints are not yet in the published OpenAPI spec (v1.0.1).
// Tracked in: https://github.com/your-org/mcp-builder/issues/XX
//
// In mock mode (USE_MOCK_FALLBACK=true) an in-memory store keeps edits alive
// for the duration of the browser session, giving the full IDE experience
// without a backend.
// -----------------------------------------------------------------------------

// In-memory fallback store — keyed by projectId.
const store = new Map<string, ProjectFile[]>()

function mockFilesFor(projectId: string): ProjectFile[] {
  if (!store.has(projectId)) {
    store.set(projectId, mockProjectFiles.map((f) => ({ ...f })))
  }
  return store.get(projectId) as ProjectFile[]
}

export const projectService = {
  // GET /projects/{projectId}/files
  async listFiles(projectId: string): Promise<ProjectFile[]> {
    return withMock(
      () => apiFetch<ProjectFile[]>(`/projects/${projectId}/files`),
      () => delay(mockFilesFor(projectId).map((f) => ({ ...f }))),
      USE_MOCK_FALLBACK,
    )
  },

  // PUT /projects/{projectId}/files/{filePath}
  // filePath is URI-encoded so slashes in paths (e.g. "src/index.ts") are safe.
  async saveFile(projectId: string, path: string, content: string): Promise<ProjectFile> {
    return withMock(
      () =>
        apiFetch<ProjectFile>(
          `/projects/${projectId}/files/${encodeURIComponent(path)}`,
          { method: "PUT", body: { path, content } },
        ),
      () => {
        const files = mockFilesFor(projectId)
        const file = files.find((f) => f.path === path)
        if (!file) throw new Error("File not found")
        file.content = content
        return delay({ ...file }, 400)
      },
      USE_MOCK_FALLBACK,
    )
  },
}
