"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getSignals, reviewSignal, getThreadSuggestions, getProject, createThread } from "@/lib/api"
import { LevelBadge } from "@/components/LevelBadge"
import { StatusBadge } from "@/components/StatusBadge"
import type { Signal, Objective, ThreadCandidate } from "@/lib/types"

export default function ReviewPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>()
  const projectId = Number(id)
  const [signals, setSignals] = useState<Signal[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [selected, setSelected] = useState<Signal | null>(null)
  const [suggestions, setSuggestions] = useState<ThreadCandidate[]>([])
  const [selectedObjId, setSelectedObjId] = useState<number | null>(null)
  const [newThreadStmt, setNewThreadStmt] = useState("")
  const [showNewThread, setShowNewThread] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingText, setEditingText] = useState(false)
  const [editText, setEditText] = useState("")
  const [textSaved, setTextSaved] = useState(false)

  useEffect(() => {
    getSignals(Number(reportId)).then(setSignals)
    getProject(projectId).then(p => {
      setObjectives(p.objectives)
      if (p.objectives.length > 0) setSelectedObjId(p.objectives[0].id)
    })
  }, [reportId, projectId])

  async function selectSignal(sig: Signal) {
    setSelected(sig)
    setSuggestions([])
    setShowNewThread(false)
    setEditingText(false)
    setEditText("")
    setTextSaved(false)
    if (selectedObjId) {
      const s = await getThreadSuggestions(sig.id, selectedObjId)
      setSuggestions(s)
    }
  }

  async function updateStatus(status: string) {
    if (!selected) return
    setSaving(true)
    const updated = await reviewSignal(selected.id, { status })
    setSignals(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelected(updated)
    setSaving(false)
  }

  async function updateLevel(level: string) {
    if (!selected) return
    const updated = await reviewSignal(selected.id, { level })
    setSignals(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelected(updated)
  }

  async function assignThread(threadId: number) {
    if (!selected) return
    setSaving(true)
    const updated = await reviewSignal(selected.id, { status: "confirmed", thread_id: threadId })
    setSignals(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelected(updated)
    setSaving(false)
  }

  async function handleCreateThread() {
    if (!newThreadStmt.trim() || !selectedObjId) return
    const thread = await createThread(selectedObjId, newThreadStmt.trim())
    await assignThread(thread.id)
    setNewThreadStmt(""); setShowNewThread(false)
  }

  const pending = signals.filter(s => s.status === "candidate" || s.status === "context")
  const done = signals.filter(s => s.status === "confirmed" || s.status === "rejected")

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">Projects</Link> /
          <Link href={`/projects/${id}`} className="hover:text-gray-600 ml-1">Project</Link> /
          <span className="ml-1">ABC Review</span>
        </div>
        <Link
          href={`/projects/${id}`}
          className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
        >
          ✓ Done — Back to Project
        </Link>
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Signal List */}
        <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto">
          {pending.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 px-1 mb-1">To Review ({pending.length})</div>
              {pending.map(sig => (
                <button
                  key={sig.id}
                  onClick={() => selectSignal(sig)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    selected?.id === sig.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <LevelBadge level={sig.level} />
                    {sig.status === "context" && <StatusBadge status="context" />}
                  </div>
                  <div className="line-clamp-2 text-xs leading-relaxed">{sig.text}</div>
                </button>
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 px-1 mt-3 mb-1">Reviewed ({done.length})</div>
              {done.map(sig => (
                <button
                  key={sig.id}
                  onClick={() => selectSignal(sig)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm opacity-60 transition-colors ${
                    selected?.id === sig.id ? "bg-gray-100 border-gray-400" : "bg-white border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <LevelBadge level={sig.level} />
                    <StatusBadge status={sig.status} />
                  </div>
                  <div className="line-clamp-1 text-xs">{sig.text}</div>
                </button>
              ))}
            </>
          )}
          {signals.length === 0 && (
            <div className="text-sm text-gray-400 px-2 py-4">No signals detected.</div>
          )}
        </div>

        {/* Review Panel */}
        {selected ? (
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5 overflow-y-auto flex flex-col gap-5">
            {/* A: Signal text (click to edit) */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                A — Signal
                {!editingText && (
                  <button
                    onClick={() => { setEditingText(true); setEditText(selected.text); setTextSaved(false) }}
                    className="ml-2 text-teal-600 font-normal normal-case hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingText ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-200 leading-relaxed resize-y min-h-20"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Escape") { setEditingText(false); setEditText("") }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!editText.trim() || editText === selected.text) { setEditingText(false); return }
                        const updated = await reviewSignal(selected.id, { text: editText.trim() })
                        setSignals(prev => prev.map(s => s.id === updated.id ? updated : s))
                        setSelected(updated)
                        setEditingText(false)
                        setTextSaved(true)
                      }}
                      className="text-sm bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingText(false); setEditText("") }}
                      className="text-sm text-gray-400 px-3 py-1 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed">{selected.text}</p>
              )}
              {textSaved && <div className="text-xs text-teal-600 mt-1">Text updated.</div>}
              {selected.confidence !== null && (
                <div className="text-xs text-gray-400 mt-1">
                  Confidence: {Math.round((selected.confidence ?? 0) * 100)}%
                  {!selected.llm_mode && " -- Rule-based mode, review carefully"}
                </div>
              )}
            </div>

            {/* B: Level & Status */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">B — Classify</div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selected.level}
                  onChange={e => updateLevel(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="L1">L1 — Confirmed change</option>
                  <option value="L2">L2 — Intent / trial</option>
                  <option value="L3">L3 — Weak signal</option>
                  <option value="pending">Pending</option>
                </select>
                <button
                  onClick={() => updateStatus("confirmed")}
                  disabled={saving}
                  className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateStatus("rejected")}
                  disabled={saving}
                  className="text-sm border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => updateStatus("context")}
                  disabled={saving}
                  className="text-sm border border-purple-200 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                >
                  Context Signal
                </button>
              </div>
            </div>

            {/* Thread Assignment */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Thread Assignment</div>
              <div className="mb-2">
                <label className="text-xs text-gray-500 mr-2">Objective:</label>
                <select
                  value={selectedObjId ?? ""}
                  onChange={e => {
                    setSelectedObjId(Number(e.target.value))
                    getThreadSuggestions(selected.id, Number(e.target.value)).then(setSuggestions)
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none"
                >
                  {objectives.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>

              {suggestions.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {suggestions.map(s => (
                    <button
                      key={s.thread_id}
                      onClick={() => assignThread(s.thread_id)}
                      className="w-full text-left text-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-500 flex items-center justify-between"
                    >
                      <span>{s.statement}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{Math.round(s.score * 100)}% match</span>
                    </button>
                  ))}
                </div>
              )}

              {!showNewThread ? (
                <button
                  onClick={() => setShowNewThread(true)}
                  className="text-sm text-gray-400 hover:text-gray-700"
                >
                  + New thread
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
                    placeholder="Thread statement..."
                    value={newThreadStmt}
                    onChange={e => setNewThreadStmt(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleCreateThread} className="bg-teal-600 text-white text-sm px-3 py-1.5 rounded-lg">
                    Create & Assign
                  </button>
                  <button onClick={() => setShowNewThread(false)} className="text-sm text-gray-400 px-2">×</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-400">
            Select a signal to review
          </div>
        )}
      </div>
    </div>
  )
}
