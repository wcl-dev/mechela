export type SignalLevel = "L1" | "L2" | "L3" | "pending"
export type SignalType = "capability" | "institutional" | "relational"
export type SignalStatus = "candidate" | "confirmed" | "rejected" | "context"
export type ThreadType = "capability" | "institutional" | "relational"

export interface Objective {
  id: number
  project_id: number
  title: string
  description?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  objectives: Objective[]
}

export interface Signal {
  id: number
  anchor_id: number
  text: string
  subject?: string
  level: SignalLevel
  signal_type?: SignalType
  status: SignalStatus
  confidence?: number
  llm_mode: boolean
}

export interface Thread {
  id: number
  objective_id: number
  statement: string
  thread_type?: ThreadType
  progression_summary?: string
  signal_count: number
}

export interface ThreadCandidate {
  thread_id: number
  statement: string
  score: number
}

export interface UploadResult {
  report_id: number
  total_paragraphs: number
  signals_detected: number
  mode: "llm" | "rule-based"
  output_warning: boolean
  output_warning_message?: string
  fallback_reason?: string
}

export interface DashboardSignal {
  signal_id: number
  text: string
  level: SignalLevel
  signal_type?: SignalType
  report_name: string
  report_date: string
  paragraph_index: number
  confidence?: number
}

export interface DashboardThread {
  thread_id: number
  statement: string
  thread_type?: ThreadType
  progression_summary?: string
  signal_count: number
  signals: DashboardSignal[]
}

export interface DashboardObjective {
  objective_id: number
  objective_title: string
  threads: DashboardThread[]
}

export interface Dashboard {
  project_id: number
  project_name: string
  total_confirmed_signals: number
  objectives: DashboardObjective[]
}

export interface CustomKeywords {
  L1: string[]
  L2: string[]
  L3: string[]
}

export interface InternalKeywords {
  keywords: string[]
}

export type LlmProvider = "openai" | "ollama" | "rule-based"

export interface ProviderConfig {
  provider: LlmProvider
  openai_api_key?: string
  ollama_base_url: string
  ollama_chat_model: string
  ollama_embed_model: string
}

export interface ProviderStatus {
  provider: LlmProvider
  mode: "llm" | "rule-based"
  reachable?: boolean
  available_models: string[]
}
