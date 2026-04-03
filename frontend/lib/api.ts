import type {
  Project, Objective, Signal, Thread, ThreadCandidate,
  UploadResult, Dashboard, CustomKeywords, InternalKeywords,
  ProviderConfig, ProviderStatus,
} from "./types"

const BASE = "http://localhost:8000"

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

// Projects
export const getProjects = () => req<Project[]>("/projects")
export const createProject = (name: string, description?: string) =>
  req<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  })
export const getProject = (id: number) => req<Project>(`/projects/${id}`)
export const deleteProject = (id: number) =>
  req<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" })
export const createObjective = (projectId: number, title: string, description?: string) =>
  req<Objective>(`/projects/${projectId}/objectives`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  })

// Reports
export const getReports = (projectId: number) =>
  req<{ id: number; name: string; report_date: string }[]>(`/reports/project/${projectId}`)
export const uploadReport = (formData: FormData) =>
  fetch(`${BASE}/reports/upload`, { method: "POST", body: formData }).then(r => r.json()) as Promise<UploadResult>
export const getSignals = (reportId: number) => req<Signal[]>(`/reports/${reportId}/signals`)
export const redetectReport = (reportId: number) =>
  req<UploadResult & { previous_confirmed_replaced: number }>(`/reports/${reportId}/redetect`, { method: "POST" })

// Signals
export const reviewSignal = (
  signalId: number,
  data: { level?: string; signal_type?: string; status?: string; thread_id?: number }
) =>
  req<Signal>(`/signals/${signalId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
export const getThreadSuggestions = (signalId: number, objectiveId: number) =>
  req<ThreadCandidate[]>(`/signals/${signalId}/thread-suggestions?objective_id=${objectiveId}`)

// Threads
export const getThreads = (objectiveId: number) =>
  req<Thread[]>(`/threads/objective/${objectiveId}`)
export const createThread = (objectiveId: number, statement: string, thread_type?: string) =>
  req<Thread>("/threads", {
    method: "POST",
    body: JSON.stringify({ objective_id: objectiveId, statement, thread_type }),
  })
export const updateThread = (threadId: number, data: { statement?: string; progression_summary?: string }) =>
  req<Thread>(`/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
export const mergeThreads = (sourceId: number, targetId: number) =>
  req<Thread>("/threads/merge", {
    method: "POST",
    body: JSON.stringify({ source_thread_id: sourceId, target_thread_id: targetId }),
  })
export const deleteThread = (threadId: number, targetThreadId: number) =>
  req(`/threads/${threadId}`, {
    method: "DELETE",
    body: JSON.stringify({ target_thread_id: targetThreadId }),
  })

// Dashboard
export const getDashboard = (projectId: number) =>
  req<Dashboard>(`/projects/${projectId}/dashboard`)
export const searchSignals = (projectId: number, q: string) =>
  req(`/projects/${projectId}/search?q=${encodeURIComponent(q)}`)
export const exportMarkdown = (projectId: number) =>
  req<{ markdown: string }>(`/projects/${projectId}/export`)

// Settings
export const getApiKeyStatus = () =>
  req<{ has_key: boolean; mode: string }>("/settings/apikey")
export const setApiKey = (key: string) =>
  req("/settings/apikey", { method: "PUT", body: JSON.stringify({ openai_api_key: key }) })
export const getKeywords = () => req<CustomKeywords>("/settings/keywords")
export const setKeywords = (keywords: CustomKeywords) =>
  req<CustomKeywords>("/settings/keywords", {
    method: "PUT",
    body: JSON.stringify(keywords),
  })

// Internal Keywords
export const getInternalKeywords = () => req<InternalKeywords>("/settings/internal-keywords")
export const setInternalKeywords = (data: InternalKeywords) =>
  req<InternalKeywords>("/settings/internal-keywords", {
    method: "PUT",
    body: JSON.stringify(data),
  })

// Provider
export const getProvider = () => req<ProviderStatus>("/settings/provider")
export const setProvider = (config: ProviderConfig) =>
  req<ProviderStatus>("/settings/provider", {
    method: "PUT",
    body: JSON.stringify(config),
  })
export const checkProviderHealth = () =>
  req<ProviderStatus>("/settings/provider/health")
