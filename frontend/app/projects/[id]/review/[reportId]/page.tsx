"use client"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Icon } from "@/components/Icon"
import { useToast } from "@/components/Toast"
import { useT } from "@/lib/i18n"
import {
  getAnchors, getSignals, reviewSignal, createSignal, getDashboard, createThread,
} from "@/lib/api"
import type { Signal, SignalLevel, SignalStatus, Dashboard, DashboardThread } from "@/lib/types"

type Anchor = {
  id: number
  paragraph_index: number
  section: string | null
  text: string
  context_text: string | null
  signal_id: number | null
}

type Decision = {
  level: SignalLevel
  status: SignalStatus
  text: string
  threadId: number | null
}

// Derive visual status for paragraph highlighting
function visualStatus(d: Decision): string {
  if (d.status === "rejected") return "rejected"
  if (d.status === "confirmed" && d.level === "context") return "context"
  if (d.status === "confirmed") return String(d.level).toLowerCase()
  return String(d.level).toLowerCase() || "pending"
}

export default function ReviewPage() {
  const params = useParams<{ id: string; reportId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang, t } = useT()
  const { showToast } = useToast()
  const projectId = Number(params.id)
  const reportId = Number(params.reportId)
  const sidFromUrl = searchParams.get("sid")

  const [report, setReport] = useState<{ name: string; date: string } | null>(null)
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [idx, setIdx] = useState(0)
  const [editingText, setEditingText] = useState(false)
  const [viewMode, setViewMode] = useState<"context" | "full">("context")
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [saving, setSaving] = useState(false)
  const [newThreadDraft, setNewThreadDraft] = useState("")

  const textRef = useRef<HTMLDivElement>(null)

  // Load data
  const refresh = useCallback(async () => {
    try {
      const [anchorData, sigs, dash] = await Promise.all([
        getAnchors(reportId),
        getSignals(reportId),
        getDashboard(projectId),
      ])
      setReport({ name: anchorData.report_name, date: anchorData.report_date })
      setAnchors(anchorData.anchors)
      setSignals(sigs)
      setDashboard(dash)
      // Initialize decisions from server
      setDecisions((prev) => {
        const next = { ...prev }
        sigs.forEach((s) => {
          if (!next[s.id]) {
            next[s.id] = {
              level: s.level,
              status: s.status,
              text: s.text,
              threadId: findThreadId(dash, s.id),
            }
          }
        })
        return next
      })
    } catch (err) {
      showToast(String(err))
    }
  }, [reportId, projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    try {
      const v = localStorage.getItem("mechela_review_view")
      if (v === "context" || v === "full") setViewMode(v)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem("mechela_review_view", viewMode) } catch {}
  }, [viewMode])

  // Build signal queue sorted by paragraph index
  const sigIds = useMemo(() => {
    return anchors
      .filter((a) => a.signal_id !== null)
      .sort((a, b) => a.paragraph_index - b.paragraph_index)
      .map((a) => a.signal_id!) as number[]
  }, [anchors])

  // Jump to sid from URL after data loaded
  useEffect(() => {
    if (sidFromUrl && sigIds.length > 0) {
      const i = sigIds.indexOf(Number(sidFromUrl))
      if (i >= 0) setIdx(i)
    }
  }, [sidFromUrl, sigIds])

  const sid = sigIds[idx] ?? null
  const currentSignal = signals.find((s) => s.id === sid) || null
  const currentAnchor = anchors.find((a) => a.signal_id === sid) || null
  const d = sid ? decisions[sid] : null

  // Scroll the active paragraph into view
  useEffect(() => {
    if (!sid) return
    const el = document.querySelector(`[data-sid="${sid}"]`) as HTMLElement | null
    if (el) {
      const parent = el.closest(".rev-src") as HTMLElement | null
      if (parent) parent.scrollTop = el.offsetTop - parent.offsetTop - 80
    }
  }, [sid, viewMode])

  // Decision mutation + save
  const setLevel = (lv: SignalLevel) => {
    if (!sid) return
    setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], level: lv } }))
    reviewSignal(sid, { level: lv }).catch(() => {})
  }
  const setTextValue = (txt: string) => {
    if (!sid) return
    setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], text: txt } }))
    reviewSignal(sid, { text: txt }).catch(() => {})
  }
  const setThread = async (threadId: number) => {
    if (!sid) return
    setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], threadId } }))
    try {
      await reviewSignal(sid, { thread_id: threadId })
      const th = allThreads().find((x) => x.thread_id === threadId)
      showToast(`${t.assignedT as string} "${(th?.statement || "").slice(0, 30)}…"`)
    } catch (err) {
      showToast(String(err))
    }
  }

  const confirmIt = async () => {
    if (!sid || !d) return
    setSaving(true)
    try {
      await reviewSignal(sid, { status: "confirmed", level: d.level })
      setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], status: "confirmed" } }))
      showToast(`${t.confirmedT as string} ${String(d.level).toUpperCase()}`)
      setTimeout(() => setIdx((i) => Math.min(i + 1, sigIds.length - 1)), 180)
    } catch (err) {
      showToast(String(err))
    } finally {
      setSaving(false)
    }
  }
  const rejectIt = async () => {
    if (!sid) return
    setSaving(true)
    try {
      await reviewSignal(sid, { status: "rejected" })
      setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], status: "rejected" } }))
      showToast(t.rejectedT as string)
      setTimeout(() => setIdx((i) => Math.min(i + 1, sigIds.length - 1)), 180)
    } catch (err) {
      showToast(String(err))
    } finally {
      setSaving(false)
    }
  }
  const contextIt = async () => {
    if (!sid) return
    setSaving(true)
    try {
      await reviewSignal(sid, { status: "confirmed", level: "context" })
      setDecisions((ds) => ({ ...ds, [sid]: { ...ds[sid], status: "confirmed", level: "context" } }))
      showToast(t.contextT as string)
      setTimeout(() => setIdx((i) => Math.min(i + 1, sigIds.length - 1)), 180)
    } catch (err) {
      showToast(String(err))
    } finally {
      setSaving(false)
    }
  }

  // Manual signal creation from Full report mode
  const markAsSignal = async (anchorId: number) => {
    try {
      const newSig = await createSignal(anchorId)
      showToast(t.signalAdded as string)
      await refresh()
      // Wait for anchors/sigs to update, then set idx
      setTimeout(() => {
        setIdx((_) => {
          // Find new index: anchor whose signal_id matches newSig.id
          const idxInList = anchors
            .map((a) => (a.id === anchorId ? newSig.id : a.signal_id))
            .filter((x) => x !== null)
            .indexOf(newSig.id)
          return idxInList >= 0 ? idxInList : 0
        })
      }, 80)
    } catch (err) {
      showToast(String(err))
    }
  }

  // Keyboard shortcuts
  // Keep latest versions of handlers in a ref so the keyboard listener
  // (registered once per editing/queue change) always calls the current
  // closure — avoids stale-closure bugs when idx advances between keys.
  const handlersRef = useRef({ setLevel, confirmIt, rejectIt })
  handlersRef.current = { setLevel, confirmIt, rejectIt }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingText) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setIdx((i) => Math.min(i + 1, sigIds.length - 1))
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setIdx((i) => Math.max(i - 1, 0))
      }
      if (e.key === "1") handlersRef.current.setLevel("L1")
      if (e.key === "2") handlersRef.current.setLevel("L2")
      if (e.key === "3") handlersRef.current.setLevel("L3")
      if (e.key === "c" || e.key === "Enter") handlersRef.current.confirmIt()
      if (e.key === "x" || e.key === "Backspace") handlersRef.current.rejectIt()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sigIds.length, editingText])

  const done = useMemo(
    () => Object.values(decisions).filter((x) => x.status !== "pending").length,
    [decisions]
  )

  // Flatten threads
  const allThreads = (): DashboardThread[] => {
    if (!dashboard) return []
    return dashboard.objectives.flatMap((o) => o.threads)
  }
  const objectiveOfThread = (thId: number): { index: number; title: string } | null => {
    if (!dashboard) return null
    for (let i = 0; i < dashboard.objectives.length; i++) {
      if (dashboard.objectives[i].threads.some((th) => th.thread_id === thId)) {
        return { index: i, title: dashboard.objectives[i].objective_title }
      }
    }
    return null
  }
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

  // Text-match scoring for thread suggestions
  const suggested = useMemo(() => {
    if (!d) return []
    const threads = allThreads()
    return threads
      .map((th) => {
        const words = th.statement.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
        let hits = 0
        words.forEach((w) => {
          if (d.text.toLowerCase().includes(w)) hits++
        })
        const match = hits / Math.max(1, words.length)
        return { thread: th, match, isCurrent: th.thread_id === d.threadId }
      })
      .sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0) || b.match - a.match)
      .slice(0, 3)
  }, [d?.text, d?.threadId, dashboard])

  const handleCreateThread = async () => {
    const v = newThreadDraft.trim()
    if (!v || !dashboard) return
    // default to first objective
    const objId = dashboard.objectives[0]?.objective_id
    if (!objId) return
    try {
      const th = await createThread(objId, v)
      setNewThreadDraft("")
      await refresh()
      setThread(th.id)
    } catch (err) {
      showToast(String(err))
    }
  }

  if (!report) {
    return <div className="page"><div className="empty">…</div></div>
  }

  const currentPara = anchors.find((a) => a.signal_id === sid)
  const currentIdx = currentPara ? anchors.findIndex((a) => a.id === currentPara.id) : -1
  const prevPara = currentIdx > 0 ? anchors[currentIdx - 1] : null
  const nextPara = currentIdx >= 0 && currentIdx < anchors.length - 1 ? anchors[currentIdx + 1] : null

  return (
    <>
      <div className="rev">
        {/* LEFT — source */}
        <div className={`rev-src${viewMode === "full" ? " fullmode" : ""}`}>
          <div className="src-m-row">
            <div className="src-m">
              <Icon name="doc" size={11} />{" "}
              {viewMode === "context" ? (
                <>
                  {t.viewContext as string} · ¶{currentPara?.paragraph_index}
                  {" · "}
                  {currentPara?.section || "—"}
                </>
              ) : (
                <>
                  {t.viewFullReport as string} · {anchors.length} ¶
                </>
              )}
            </div>
            <div className="rev-view-toggle" role="tablist">
              <button
                className={viewMode === "context" ? "on" : ""}
                onClick={() => setViewMode("context")}
              >
                {t.viewContext as string}
              </button>
              <button
                className={viewMode === "full" ? "on" : ""}
                onClick={() => setViewMode("full")}
              >
                {t.viewFullReport as string}
              </button>
            </div>
          </div>
          <h1 className="src-t">{report.name}</h1>
          <div className="src-sub">{report.date}</div>
          <div className="src-body">
            {viewMode === "context" && d && currentPara && (
              <>
                {prevPara && (
                  <p data-ctx="1" key="prev">
                    <span className="ctx-lbl">¶{prevPara.paragraph_index}</span>
                    {prevPara.text}
                  </p>
                )}
                <p
                  data-sig={visualStatus(d)}
                  data-active="1"
                  data-sid={sid}
                  key="cur"
                >
                  <span className="ctx-lbl">¶{currentPara.paragraph_index}</span>
                  {d.text}
                </p>
                {nextPara && (
                  <p data-ctx="1" key="next">
                    <span className="ctx-lbl">¶{nextPara.paragraph_index}</span>
                    {nextPara.text}
                  </p>
                )}
                <div className="ctx-hint">{t.showingContext as string}</div>
              </>
            )}

            {viewMode === "full" &&
              anchors.map((a) => {
                const hasSig = a.signal_id !== null
                const dec = hasSig ? decisions[a.signal_id!] : null
                const vs = dec ? visualStatus(dec) : null
                const isActive = hasSig && a.signal_id === sid
                const badge = vs === "rejected" ? "REJ" : vs === "context" ? "CTX" : String(dec?.level || "").toUpperCase()
                if (hasSig) {
                  return (
                    <p
                      key={`fp-${a.paragraph_index}`}
                      data-pp={a.paragraph_index}
                      data-sid={a.signal_id}
                      className="fp"
                      data-sig={vs || undefined}
                      data-active={isActive ? "1" : undefined}
                      onClick={() => {
                        const i = sigIds.indexOf(a.signal_id!)
                        if (i >= 0) setIdx(i)
                      }}
                      title={t.clickToReview as string}
                    >
                      <span className="ctx-lbl">
                        ¶{a.paragraph_index} · {a.section || "—"}
                      </span>
                      <span className="sig-badge">{badge}</span>
                      {dec?.text || a.text}
                    </p>
                  )
                }
                return (
                  <p
                    key={`fp-${a.paragraph_index}`}
                    data-pp={a.paragraph_index}
                    className="fp"
                    onClick={() => markAsSignal(a.id)}
                    title={t.clickToMark as string}
                  >
                    <span className="ctx-lbl">
                      ¶{a.paragraph_index} · {a.section || "—"}
                    </span>
                    <span className="mark-sig">+ {t.markAsSignal as string}</span>
                    {a.text}
                  </p>
                )
              })}
          </div>
          {viewMode === "full" && (
            <div className="minimap" aria-label="paragraph minimap">
              <div className="minimap-track">
                {anchors.map((a) => {
                  const hasSig = a.signal_id !== null
                  const dec = hasSig ? decisions[a.signal_id!] : null
                  const lvl = dec ? visualStatus(dec) : "none"
                  const isActive = hasSig && a.signal_id === sid
                  const click = () => {
                    if (hasSig) {
                      const i = sigIds.indexOf(a.signal_id!)
                      if (i >= 0) setIdx(i)
                    }
                    const el = document.querySelector(
                      `[data-pp="${a.paragraph_index}"]`
                    ) as HTMLElement | null
                    if (el) {
                      const parent = el.closest(".rev-src") as HTMLElement | null
                      if (parent) parent.scrollTop = el.offsetTop - parent.offsetTop - 80
                    }
                  }
                  return (
                    <div
                      key={`mm-${a.paragraph_index}`}
                      className={`mm-cell${isActive ? " active" : ""}`}
                      data-lvl={lvl}
                      onClick={click}
                    >
                      <span className="mm-tip">
                        ¶{a.paragraph_index} · {a.section || "—"} ·{" "}
                        {lvl === "none"
                          ? (t.unmarked as string)
                          : lvl.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — panel */}
        <div className="rev-panel">
          <div className="rev-head">
            <div className="rev-prog">
              <b>{String(idx + 1).padStart(2, "0")}</b>/{sigIds.length} ·{" "}
              {t.reviewProgress as string}
            </div>
            <div style={{ flex: 1, margin: "0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <div className="pbar2">
                <i style={{ width: `${sigIds.length ? (done / sigIds.length) * 100 : 0}%` }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                {done}/{sigIds.length}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              <button
                className="btn ghost sm"
                disabled={idx === 0}
                onClick={() => setIdx((i) => Math.max(i - 1, 0))}
              >
                <Icon name="arrL" size={11} />
              </button>
              <button
                className="btn ghost sm"
                disabled={idx >= sigIds.length - 1}
                onClick={() => setIdx((i) => Math.min(i + 1, sigIds.length - 1))}
              >
                <Icon name="arrR" size={11} />
              </button>
            </div>
          </div>

          <div className="queue">
            {sigIds.map((s, i) => {
              const x = decisions[s]
              const cls = ["qp"]
              if (i === idx) cls.push("on")
              else if (x?.status === "confirmed" && x.level === "context") cls.push("context")
              else if (x?.status === "confirmed") cls.push(String(x.level).toLowerCase())
              else if (x?.status === "rejected") cls.push("rejected")
              return (
                <button key={s} className={cls.join(" ")} onClick={() => setIdx(i)}>
                  {String(i + 1).padStart(2, "0")}
                </button>
              )
            })}
          </div>

          {sid && d ? (
            <>
              {/* A — text */}
              <div className="card">
                <div className="step">
                  <span className="step-l">A</span>
                  <div>
                    <h4>{t.aTitle as string}</h4>
                    <p>{t.aDesc as string}</p>
                  </div>
                  <span className="hint">
                    ¶{currentAnchor?.paragraph_index} · {currentAnchor?.section || "—"}
                  </span>
                </div>
                <div
                  ref={textRef}
                  className="sig-txt"
                  contentEditable={editingText}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    setTextValue(e.currentTarget.textContent || "")
                    setEditingText(false)
                  }}
                  onClick={() => !editingText && setEditingText(true)}
                >
                  {d.text}
                </div>
                <div className="sig-meta">
                  <span>{report.date}</span>
                  <span>·</span>
                  <span>{report.name}</span>
                  {editingText && (
                    <span style={{ marginLeft: "auto", color: "var(--accent-ink)" }}>
                      {t.editingHint as string}
                    </span>
                  )}
                </div>
                <KeywordMatchHint signal={currentSignal} decisionLevel={d.level} />
              </div>

              {/* B — level + actions */}
              <div className="card">
                <div className="step">
                  <span className="step-l">B</span>
                  <div>
                    <h4>{t.bTitle as string}</h4>
                    <p>{t.bDesc as string}</p>
                  </div>
                  <span className="hint">1 · 2 · 3</span>
                </div>
                <div className="lvl-pick">
                  {(
                    [
                      { k: "L1", lbl: t.lvlL1, dsc: t.l1Desc },
                      { k: "L2", lbl: t.lvlL2, dsc: t.l2Desc },
                      { k: "L3", lbl: t.lvlL3, dsc: t.l3Desc },
                      { k: "pending", lbl: t.lvlPending, dsc: t.pendingDesc },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.k}
                      className={`lvl-opt ${d.level === o.k ? "on" : ""}`}
                      onClick={() => setLevel(o.k as SignalLevel)}
                    >
                      <span className="k">
                        <span className={`dot-lvl ${o.k.toLowerCase()}`} />
                        {o.lbl as string}
                      </span>
                      <span className="dsc">{o.dsc as string}</span>
                    </button>
                  ))}
                </div>
                <div className="actions">
                  <button className="btn confirm" onClick={confirmIt} disabled={saving}>
                    <Icon name="check" size={12} />
                    {t.confirm as string}
                    <span className="kbd" style={{ marginLeft: 4 }}>
                      C
                    </span>
                  </button>
                  <button className="btn ghost" onClick={contextIt} disabled={saving}>
                    {t.context as string}
                  </button>
                  <button className="btn danger" onClick={rejectIt} disabled={saving}>
                    <Icon name="x" size={12} />
                    {t.reject as string}
                    <span className="kbd" style={{ marginLeft: 4 }}>
                      X
                    </span>
                  </button>
                </div>
              </div>

              {/* C — thread */}
              <div className="card">
                <div className="step">
                  <span className="step-l">C</span>
                  <div>
                    <h4>{t.cTitle as string}</h4>
                    <p>{t.cDesc as string}</p>
                  </div>
                  <span className="hint">{(t.suggested as string).toLowerCase()}</span>
                </div>
                <div className="th-pick">
                  {suggested.map(({ thread, match, isCurrent }) => {
                    const objInfo = objectiveOfThread(thread.thread_id)
                    const objNum = objInfo ? romans[objInfo.index] : "?"
                    return (
                      <button
                        key={thread.thread_id}
                        className={`ts ${d.threadId === thread.thread_id ? "on" : ""}`}
                        onClick={() => setThread(thread.thread_id)}
                      >
                        <span className="ob">{objNum}</span>
                        <span className="nm">{thread.statement}</span>
                        {match > 0.1 && (
                          <span className="mt">{Math.round(match * 100)}%</span>
                        )}
                        {isCurrent && <Icon name="check" size={12} />}
                      </button>
                    )
                  })}
                  <div className="new-th">
                    <Icon name="plus" size={12} />
                    <input
                      type="text"
                      placeholder={t.createThread as string}
                      value={newThreadDraft}
                      onChange={(e) => setNewThreadDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateThread()
                      }}
                    />
                    {newThreadDraft && (
                      <button className="btn primary sm" onClick={handleCreateThread}>
                        {t.create as string}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              className="card"
              style={{ textAlign: "center", color: "var(--ink-3)", padding: "40px 20px" }}
            >
              {t.noSignalsAddFromFull as string}
            </div>
          )}
        </div>
      </div>
      <div className="kbd-bar">
        <span>
          <span className="kbd">J</span>
          {t.kbNext as string}
        </span>
        <span>
          <span className="kbd">K</span>
          {t.kbPrev as string}
        </span>
        <span>
          <span className="kbd">1</span>
          <span className="kbd">2</span>
          <span className="kbd">3</span>
          {t.kbLevel as string}
        </span>
        <span>
          <span className="kbd">C</span>
          {(t.confirm as string).toLowerCase()}
        </span>
        <span>
          <span className="kbd">X</span>
          {(t.reject as string).toLowerCase()}
        </span>
        <span style={{ marginLeft: "auto" }}>
          {done === sigIds.length && sigIds.length > 0 && (
            <button
              className="btn primary sm"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              <Icon name="check" size={12} /> {t.done as string}
            </button>
          )}
        </span>
      </div>
    </>
  )
}

function findThreadId(dash: Dashboard, signalId: number): number | null {
  for (const obj of dash.objectives) {
    for (const th of obj.threads) {
      if (th.signals.some((s) => s.signal_id === signalId)) return th.thread_id
    }
  }
  return null
}

function KeywordMatchHint({
  signal,
  decisionLevel,
}: {
  signal: Signal | null
  decisionLevel: SignalLevel
}) {
  const { t, lang } = useT()
  if (!signal) return null
  const kws = signal.matched_user_keywords
  const matchedLevels = (["L1", "L2", "L3"] as const).filter(
    (l) => (kws as any)[l]?.length > 0
  )
  if (matchedLevels.length === 0) return null
  const llmMode = signal.llm_mode
  const disagreement =
    llmMode &&
    matchedLevels.length > 0 &&
    !matchedLevels.includes(String(decisionLevel).toUpperCase() as "L1" | "L2" | "L3")
  return (
    <div className={`kw-match ${disagreement ? "disagree" : "agree"}`}>
      <b>{disagreement ? t.kwMatchDisagree : t.kwMatchAgree}</b>
      {matchedLevels.map((l) => (
        <div key={l}>
          {l}:{" "}
          {(kws as any)[l]
            .map((k: string) => `${t.kwQuoteOpen}${k}${t.kwQuoteClose}`)
            .join("、")}
        </div>
      ))}
      {disagreement && (
        <div>
          {(t.kwMatchAsk as (lvl: string) => string)(
            String(decisionLevel).toUpperCase()
          )}
        </div>
      )}
    </div>
  )
}
