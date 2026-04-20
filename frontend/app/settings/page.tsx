"use client"
import { useEffect, useState } from "react"
import { Icon } from "@/components/Icon"
import { useToast } from "@/components/Toast"
import { useT } from "@/lib/i18n"
import {
  getProvider, setProvider, checkProviderHealth,
  getKeywords, setKeywords,
  getInternalKeywords, setInternalKeywords,
} from "@/lib/api"
import type { LlmProvider, ProviderStatus, CustomKeywords } from "@/lib/types"

type UiMode = "basic" | "local" | "openai"

const UI_TO_PROVIDER: Record<UiMode, LlmProvider> = {
  basic: "rule-based",
  local: "ollama",
  openai: "openai",
}
const PROVIDER_TO_UI: Record<LlmProvider, UiMode> = {
  "rule-based": "basic",
  ollama: "local",
  openai: "openai",
}

export default function SettingsPage() {
  const { lang, t } = useT()
  const { showToast } = useToast()
  const [uiMode, setUiMode] = useState<UiMode>("basic")
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434/v1")
  const [ollamaModel, setOllamaModel] = useState("gemma4:e2b")
  const [kw, setKw] = useState<CustomKeywords>({ L1: [], L2: [], L3: [] })
  const [kwd, setKwd] = useState({ L1: "", L2: "", L3: "", ignore: "" })
  const [ignoreList, setIgnoreList] = useState<string[]>([])

  useEffect(() => {
    getProvider().then((p) => {
      setProviderStatus(p)
      setUiMode(PROVIDER_TO_UI[p.provider] || "basic")
    }).catch(() => {})
    getKeywords().then(setKw).catch(() => {})
    getInternalKeywords().then((r) => setIgnoreList(r.keywords || [])).catch(() => {})
  }, [])

  const saveProvider = async (mode: UiMode) => {
    setUiMode(mode)
    try {
      await setProvider({
        provider: UI_TO_PROVIDER[mode],
        openai_api_key: mode === "openai" ? apiKey : undefined,
        ollama_base_url: ollamaUrl,
        ollama_chat_model: ollamaModel,
        ollama_embed_model: "nomic-embed-text",
      })
      // Refresh full status (includes reachable + available models) after save
      try {
        const health = await checkProviderHealth()
        setProviderStatus(health)
      } catch {
        // Health check failure doesn't invalidate the save
      }
      showToast(t.savedT as string)
      window.dispatchEvent(new Event("mechela-refresh"))
    } catch (err) {
      showToast(String(err))
    }
  }

  const addKw = async (level: "L1" | "L2" | "L3" | "ignore") => {
    const v = (kwd as any)[level].trim()
    if (!v) return
    if (level === "ignore") {
      const next = [...ignoreList, v]
      setIgnoreList(next)
      setKwd({ ...kwd, ignore: "" })
      try {
        await setInternalKeywords({ keywords: next })
      } catch (err) {
        showToast(String(err))
      }
    } else {
      const next = { ...kw, [level]: [...(kw as any)[level], v] }
      setKw(next)
      setKwd({ ...kwd, [level]: "" })
      try {
        await setKeywords(next)
      } catch (err) {
        showToast(String(err))
      }
    }
  }
  const removeKw = async (level: "L1" | "L2" | "L3" | "ignore", i: number) => {
    if (level === "ignore") {
      const next = ignoreList.filter((_, idx) => idx !== i)
      setIgnoreList(next)
      try {
        await setInternalKeywords({ keywords: next })
      } catch (err) {
        showToast(String(err))
      }
    } else {
      const next = { ...kw, [level]: (kw as any)[level].filter((_: any, idx: number) => idx !== i) }
      setKw(next)
      try {
        await setKeywords(next)
      } catch (err) {
        showToast(String(err))
      }
    }
  }

  const checkHealth = async () => {
    try {
      const r = await checkProviderHealth()
      setProviderStatus(r)
      showToast(
        r.reachable
          ? (t.providerReachableT as string)
          : (t.providerUnreachableT as string)
      )
    } catch (err) {
      showToast(String(err))
    }
  }

  return (
    <div className="page page-narrow">
      <header className="ph">
        <div>
          <div className="ph-meta">mechela</div>
          <h1 className="ph-title">{t.settings as string}</h1>
          <p className="ph-sub">
            {t.allSettingsLocal as string}
          </p>
        </div>
      </header>

      <div className="set-grid">
        <div className="set-lbl">{t.detectionMode as string}</div>
        <div className="mode-opts">
          {[
            { k: "basic", tTitle: t.modeBasicT, tDesc: t.modeBasicD, priv: t.priv_local },
            { k: "local", tTitle: t.modeLocalT, tDesc: t.modeLocalD, priv: t.priv_local },
            { k: "openai", tTitle: t.modeOpenAIT, tDesc: t.modeOpenAID, priv: t.priv_cloud },
          ].map((m) => (
            <button
              key={m.k}
              className={`mode ${uiMode === m.k ? "on" : ""}`}
              onClick={() => saveProvider(m.k as UiMode)}
            >
              <h4>{m.tTitle as string}</h4>
              <p>{m.tDesc as string}</p>
              <span
                className="priv"
                style={{
                  background: m.priv === t.priv_cloud ? "var(--l2-bg)" : "var(--accent-soft)",
                  color: m.priv === t.priv_cloud ? "var(--l2-ink)" : "var(--accent-ink)",
                }}
              >
                {m.priv as string}
              </span>
            </button>
          ))}
        </div>
      </div>

      {uiMode === "openai" && (
        <div className="set-grid">
          <div className="set-lbl">
            OpenAI API key
            <p>{t.openaiKeyHint as string}</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="password"
              className="kw-in"
              placeholder="sk-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button className="btn primary" onClick={() => saveProvider("openai")}>
              {t.save as string}
            </button>
          </div>
        </div>
      )}

      {uiMode === "local" && (
        <div className="set-grid">
          <div className="set-lbl">
            Ollama
            <p>{t.ollamaConfigHint as string}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="kw-in"
              placeholder="http://localhost:11434/v1"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
            />
            <input
              className="kw-in"
              placeholder="gemma4:e2b"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn primary" onClick={() => saveProvider("local")}>
                {t.save as string}
              </button>
              <button className="btn ghost" onClick={checkHealth}>
                {t.checkHealth as string}
              </button>
              {providerStatus?.reachable !== undefined && (
                <span
                  style={{
                    alignSelf: "center",
                    color: providerStatus.reachable ? "var(--l1-ink)" : "var(--rej-ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                >
                  {providerStatus.reachable
                    ? (t.statusReachable as string)
                    : (t.statusUnreachable as string)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="set-grid">
        <div className="set-lbl">
          {t.customKeywords as string}
          <p>{t.kwDesc as string}</p>
        </div>
        <div className="kw-groups">
          {[
            { k: "L1", lbl: t.lvlL1, dsc: t.l1Desc, ph: t.kwL1Ph },
            { k: "L2", lbl: t.lvlL2, dsc: t.l2Desc, ph: t.kwL2Ph },
            { k: "L3", lbl: t.lvlL3, dsc: t.l3Desc, ph: t.kwL3Ph },
            { k: "ignore", lbl: t.kwIgnoreLbl, dsc: t.kwIgnoreDsc, ph: t.kwIgnorePh },
          ].map((g) => {
            const list = g.k === "ignore" ? ignoreList : (kw as any)[g.k as string] as string[]
            return (
              <div className="kw-grp" key={g.k}>
                <div className="kw-grp-h">
                  <span className={`chip ${g.k.toLowerCase()}`}>{g.lbl as string}</span>
                  <span className="kw-grp-dsc">{g.dsc as string}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="kw-in"
                    value={(kwd as any)[g.k]}
                    onChange={(e) => setKwd({ ...kwd, [g.k]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addKw(g.k as any)
                    }}
                    placeholder={g.ph as string}
                  />
                  <button className="btn ghost" onClick={() => addKw(g.k as any)}>
                    <Icon name="plus" size={12} />
                    {t.add as string}
                  </button>
                </div>
                <div className="kw-chips">
                  {list.map((k, i) => (
                    <span className="kw" key={`${g.k}-${i}`}>
                      {k}
                      <button onClick={() => removeKw(g.k as any, i)}>
                        <Icon name="x" size={9} />
                      </button>
                    </span>
                  ))}
                  {list.length === 0 && (
                    <span className="kw-empty">
                      {t.noKeywordsYet as string}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
