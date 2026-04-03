"use client"
import { useEffect, useState } from "react"
import {
  getProvider, setProvider, checkProviderHealth,
  getKeywords, setKeywords,
  getInternalKeywords, setInternalKeywords,
} from "@/lib/api"
import type { LlmProvider, ProviderStatus, CustomKeywords } from "@/lib/types"

type SettingsMode = "basic" | "local" | "cloud"

function providerToMode(p: LlmProvider): SettingsMode {
  if (p === "ollama") return "local"
  if (p === "openai") return "cloud"
  return "basic"
}

export default function SettingsPage() {
  // Mode state
  const [mode, setMode] = useState<SettingsMode>("basic")
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // OpenAI
  const [apiKey, setApiKey] = useState("")

  // Health check
  const [health, setHealth] = useState<ProviderStatus | null>(null)
  const [checking, setChecking] = useState(false)

  // Keywords
  const [keywords, setKw] = useState<CustomKeywords>({ L1: [], L2: [], L3: [] })
  const [kwInput, setKwInput] = useState({ L1: "", L2: "", L3: "" })
  const [kwSaved, setKwSaved] = useState(false)

  // Internal keywords
  const [intKw, setIntKw] = useState<string[]>([])
  const [intKwInput, setIntKwInput] = useState("")
  const [intKwSaved, setIntKwSaved] = useState(false)

  useEffect(() => {
    getProvider().then(s => {
      setMode(providerToMode(s.provider))
      setStatus(s)
    })
    getKeywords().then(setKw)
    getInternalKeywords().then(d => setIntKw(d.keywords))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    if (mode === "local") {
      await setProvider({
        provider: "ollama",
        ollama_base_url: "http://localhost:11434/v1",
        ollama_chat_model: "phi4-mini",
        ollama_embed_model: "nomic-embed-text",
      })
    } else if (mode === "cloud") {
      await setProvider({
        provider: "openai",
        openai_api_key: apiKey || undefined,
        ollama_base_url: "",
        ollama_chat_model: "",
        ollama_embed_model: "",
      })
    } else {
      await setProvider({
        provider: "rule-based",
        ollama_base_url: "",
        ollama_chat_model: "",
        ollama_embed_model: "",
      })
    }

    const s = await getProvider()
    setStatus(s)
    setSaving(false)
    setSaved(true)
  }

  async function handleHealthCheck() {
    setChecking(true)
    setHealth(null)
    const h = await checkProviderHealth()
    setHealth(h)
    setChecking(false)
  }

  async function handleAddKeyword(level: keyof CustomKeywords) {
    const val = kwInput[level].trim().toLowerCase()
    if (!val || keywords[level].includes(val)) return
    const updated = { ...keywords, [level]: [...keywords[level], val] }
    setKw(updated)
    setKwInput(prev => ({ ...prev, [level]: "" }))
    await setKeywords(updated)
    setKwSaved(true)
  }

  async function handleRemoveKeyword(level: keyof CustomKeywords, kw: string) {
    const updated = { ...keywords, [level]: keywords[level].filter(k => k !== kw) }
    setKw(updated)
    await setKeywords(updated)
  }

  async function handleAddIntKw() {
    const val = intKwInput.trim().toLowerCase()
    if (!val || intKw.includes(val)) return
    const updated = [...intKw, val]
    setIntKw(updated)
    setIntKwInput("")
    await setInternalKeywords({ keywords: updated })
    setIntKwSaved(true)
  }

  async function handleRemoveIntKw(kw: string) {
    const updated = intKw.filter(k => k !== kw)
    setIntKw(updated)
    await setInternalKeywords({ keywords: updated })
  }

  const modeLabel = status
    ? status.mode === "llm"
      ? status.provider === "ollama" ? "Local AI mode" : `LLM mode — ${status.provider}`
      : "Basic mode (rule-based)"
    : "..."

  const MODE_OPTIONS: { value: SettingsMode; label: string; desc: string }[] = [
    { value: "basic", label: "Basic mode", desc: "Keyword matching only — no AI model or setup needed" },
    { value: "local", label: "Local AI", desc: "Privacy-first — runs fully on your machine using Ollama" },
    { value: "cloud", label: "OpenAI (cloud)", desc: "Highest quality — data sent to OpenAI servers" },
  ]

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Provider Selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">Detection Mode</div>
          <div className={`text-sm inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            status?.mode === "llm" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status?.mode === "llm" ? "bg-green-500" : "bg-gray-400"
            }`} />
            {modeLabel}
          </div>
        </div>

        <div className="space-y-2">
          {MODE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                mode === opt.value
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => { setMode(opt.value); setSaved(false); setHealth(null) }}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* OpenAI config */}
        {mode === "cloud" && (
          <div className="space-y-2 pl-7">
            <label className="text-sm text-gray-700">API Key</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400">
              Stored locally. Report text is sent to OpenAI for analysis.
            </p>
          </div>
        )}

        {/* Local AI status */}
        {mode === "local" && (
          <div className="space-y-2 pl-7">
            <p className="text-sm text-gray-600">
              All data stays on your machine. No internet required for analysis.
            </p>
            {!health?.reachable && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                Not connected? Run <code className="bg-amber-100 px-1 rounded">setup_local_ai.bat</code> (Windows) or <code className="bg-amber-100 px-1 rounded">./setup_local_ai.sh</code> (Mac/Linux) first.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {mode !== "basic" && (
            <button
              onClick={handleHealthCheck}
              disabled={checking}
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Test Connection"}
            </button>
          )}
        </div>

        {saved && <div className="text-sm text-green-600">Settings saved.</div>}

        {health && (
          <div className={`text-sm p-3 rounded-lg ${
            health.reachable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {health.reachable
              ? "Connected. Local AI is ready to use."
              : "Cannot reach Ollama. Make sure the service is running."}
          </div>
        )}
      </div>

      {/* Custom Keywords */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">Custom Signal Keywords</div>
          <p className="text-sm text-gray-500">
            Add domain-specific keywords to improve rule-based detection for your organisation's language.
          </p>
        </div>

        {(["L1", "L2", "L3"] as const).map(level => (
          <div key={level}>
            <div className="text-sm font-medium text-gray-700 mb-2">
              {level} — {level === "L1" ? "Confirmed change" : level === "L2" ? "Intent / trial" : "Weak signal"}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
              {keywords[level].map(kw => (
                <span key={kw} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {kw}
                  <button onClick={() => handleRemoveKeyword(level, kw)} className="text-gray-400 hover:text-gray-700 leading-none">x</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
                placeholder={`Add ${level} keyword...`}
                value={kwInput[level]}
                onChange={e => setKwInput(prev => ({ ...prev, [level]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddKeyword(level))}
              />
              <button
                onClick={() => handleAddKeyword(level)}
                className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                Add
              </button>
            </div>
          </div>
        ))}
        {kwSaved && <div className="text-sm text-green-600">Keywords saved.</div>}
      </div>

      {/* Internal Keywords (Organisation Names) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">Organisation Names</div>
          <p className="text-sm text-gray-500">
            Add your organisation's name and abbreviations. These help the detector distinguish internal actions from external change signals.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
          {intKw.map(kw => (
            <span key={kw} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {kw}
              <button onClick={() => handleRemoveIntKw(kw)} className="text-gray-400 hover:text-gray-700 leading-none">x</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
            placeholder="e.g. your organisation abbreviation..."
            value={intKwInput}
            onChange={e => setIntKwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddIntKw())}
          />
          <button
            onClick={handleAddIntKw}
            className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Add
          </button>
        </div>
        {intKwSaved && <div className="text-sm text-green-600">Saved.</div>}
      </div>
    </div>
  )
}
