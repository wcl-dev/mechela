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
  const [mode, setMode] = useState<SettingsMode>("basic")
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [apiKey, setApiKey] = useState("")

  const [health, setHealth] = useState<ProviderStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const [keywords, setKw] = useState<CustomKeywords>({ L1: [], L2: [], L3: [] })
  const [kwInput, setKwInput] = useState({ L1: "", L2: "", L3: "" })
  const [kwSaved, setKwSaved] = useState(false)

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
      ? status.provider === "ollama" ? "地端 AI 模式" : `雲端模式（${status.provider}）`
      : "基礎模式（關鍵字比對）"
    : "..."

  const MODE_OPTIONS: { value: SettingsMode; label: string; desc: string }[] = [
    { value: "basic", label: "基礎模式", desc: "使用關鍵字比對偵測，不需安裝任何 AI 模型" },
    { value: "local", label: "地端 AI", desc: "完全在你的電腦上執行 AI 分析，資料不會離開你的電腦" },
    { value: "cloud", label: "OpenAI（雲端）", desc: "最高準確度，報告文字會傳送至 OpenAI 伺服器" },
  ]

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">設定</h1>

      {/* 分析模式 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">分析模式</div>
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

        {/* OpenAI 設定 */}
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
              金鑰只儲存在你的電腦上。分析時報告段落會傳送至 OpenAI。
            </p>
          </div>
        )}

        {/* 地端 AI 狀態 */}
        {mode === "local" && (
          <div className="space-y-2 pl-7">
            <p className="text-sm text-gray-600">
              所有資料完全留在你的電腦，分析時不需要網路連線。
            </p>
            {!health?.reachable && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                尚未連線？請先執行 <code className="bg-amber-100 px-1 rounded">setup_local_ai.bat</code>（Windows）或 <code className="bg-amber-100 px-1 rounded">./setup_local_ai.sh</code>（Mac/Linux）。
              </p>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
          {mode !== "basic" && (
            <button
              onClick={handleHealthCheck}
              disabled={checking}
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              {checking ? "檢查中..." : "測試連線"}
            </button>
          )}
        </div>

        {saved && <div className="text-sm text-green-600">設定已儲存。</div>}

        {health && (
          <div className={`text-sm p-3 rounded-lg ${
            health.reachable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {health.reachable
              ? "已連線，地端 AI 可以使用。"
              : "無法連線。請確認 Ollama 服務正在執行。"}
          </div>
        )}
      </div>

      {/* 自訂 Signal 關鍵字 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">自訂 Signal 關鍵字</div>
          <p className="text-sm text-gray-500">
            加入你的領域常用詞彙，讓基礎模式的偵測更準確。
          </p>
        </div>

        {(["L1", "L2", "L3"] as const).map(level => (
          <div key={level}>
            <div className="text-sm font-medium text-gray-700 mb-2">
              {level} — {level === "L1" ? "已確立的改變" : level === "L2" ? "承諾或試行" : "意識萌發"}
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
                placeholder={`新增 ${level} 關鍵字...`}
                value={kwInput[level]}
                onChange={e => setKwInput(prev => ({ ...prev, [level]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddKeyword(level))}
              />
              <button
                onClick={() => handleAddKeyword(level)}
                className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                新增
              </button>
            </div>
          </div>
        ))}
        {kwSaved && <div className="text-sm text-green-600">關鍵字已儲存。</div>}
      </div>

      {/* 組織名稱 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div>
          <div className="font-medium text-gray-900 mb-1">組織名稱</div>
          <p className="text-sm text-gray-500">
            加入你的組織名稱和縮寫，幫助系統區分「我們做了什麼」和「外部發生了什麼改變」。
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
            placeholder="例如：你的組織縮寫..."
            value={intKwInput}
            onChange={e => setIntKwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddIntKw())}
          />
          <button
            onClick={handleAddIntKw}
            className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            新增
          </button>
        </div>
        {intKwSaved && <div className="text-sm text-green-600">已儲存。</div>}
      </div>
    </div>
  )
}
