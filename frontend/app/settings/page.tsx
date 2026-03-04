"use client"
import { useEffect, useState } from "react"
import { getApiKeyStatus, setApiKey, getKeywords, setKeywords } from "@/lib/api"
import type { CustomKeywords } from "@/lib/types"

export default function SettingsPage() {
  const [mode, setMode] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKeyInput] = useState("")
  const [keySaved, setKeySaved] = useState(false)
  const [keywords, setKw] = useState<CustomKeywords>({ L1: [], L2: [], L3: [] })
  const [kwInput, setKwInput] = useState({ L1: "", L2: "", L3: "" })
  const [kwSaved, setKwSaved] = useState(false)

  useEffect(() => {
    getApiKeyStatus().then(s => { setMode(s.mode); setHasKey(s.has_key) })
    getKeywords().then(setKw)
  }, [])

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return
    await setApiKey(apiKey.trim())
    setKeySaved(true); setApiKeyInput("")
    getApiKeyStatus().then(s => { setMode(s.mode); setHasKey(s.has_key) })
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

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* API Key */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <div className="font-medium text-gray-900 mb-1">OpenAI API Key</div>
          <div className={`text-sm inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            hasKey ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? "bg-green-500" : "bg-gray-400"}`} />
            {hasKey ? "LLM mode active" : "Rule-based mode (no key)"}
          </div>
        </div>
        <form onSubmit={handleSaveKey} className="flex gap-2">
          <input
            type="password"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
            placeholder="sk-..."
            value={apiKey}
            onChange={e => setApiKeyInput(e.target.value)}
          />
          <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700">
            Save
          </button>
        </form>
        {keySaved && <div className="text-sm text-green-600">✓ API key saved. LLM mode activated.</div>}
        <p className="text-xs text-gray-400">
          Your key is stored locally on this machine and only used for signal detection and thread matching.
        </p>
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
                  <button onClick={() => handleRemoveKeyword(level, kw)} className="text-gray-400 hover:text-gray-700 leading-none">×</button>
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
        {kwSaved && <div className="text-sm text-green-600">✓ Keywords saved.</div>}
      </div>
    </div>
  )
}
