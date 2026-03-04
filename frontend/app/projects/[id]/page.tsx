"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getDashboard, createObjective, exportMarkdown, getReports } from "@/lib/api"
import { LevelBadge } from "@/components/LevelBadge"
import type { Dashboard } from "@/lib/types"

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [reports, setReports] = useState<{ id: number; name: string; report_date: string }[]>([])
  const [objTitle, setObjTitle] = useState("")
  const [showObjForm, setShowObjForm] = useState(false)
  const [exported, setExported] = useState("")

  useEffect(() => {
    getDashboard(projectId).then(setDashboard)
    getReports(projectId).then(setReports)
  }, [projectId])

  async function handleAddObjective(e: React.FormEvent) {
    e.preventDefault()
    if (!objTitle.trim()) return
    await createObjective(projectId, objTitle.trim())
    setObjTitle(""); setShowObjForm(false)
    getDashboard(projectId).then(setDashboard)
  }

  async function handleExport() {
    const result = await exportMarkdown(projectId)
    setExported(result.markdown)
  }

  if (!dashboard) return <div className="text-sm text-gray-400 py-8">Loading...</div>

  const totalSignals = dashboard.total_confirmed_signals

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">
            <Link href="/" className="text-gray-500 hover:text-gray-800">Projects</Link> /
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{dashboard.project_name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${id}/upload`}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            + Upload Report
          </Link>
          <button
            onClick={handleExport}
            className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Export MD
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-semibold text-gray-400">{dashboard.objectives.length}</div>
          <div className="text-sm text-gray-500">Objectives</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-semibold text-gray-400">
            {dashboard.objectives.flatMap(o => o.threads).length}
          </div>
          <div className="text-sm text-gray-500">Threads</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-semibold text-gray-400">{totalSignals}</div>
          <div className="text-sm text-gray-500">Confirmed Signals</div>
        </div>
      </div>

      {exported && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Markdown Export</span>
            <button onClick={() => { navigator.clipboard.writeText(exported); }} className="text-xs text-gray-400 hover:text-gray-700">Copy</button>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto">{exported}</pre>
        </div>
      )}

      {reports.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
          <div className="font-medium text-gray-900 mb-3">Reports</div>
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-gray-400 ml-2">{r.report_date}</span>
                </div>
                <Link
                  href={`/projects/${id}/review/${r.id}`}
                  className="text-sm text-gray-400 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-100 hover:text-gray-700"
                >
                  Review Signals
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {dashboard.objectives.map(obj => (
          <div key={obj.objective_id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="font-medium text-gray-900 mb-4">{obj.objective_title}</div>
            {obj.threads.length === 0 ? (
              <div className="text-sm text-gray-400">No threads yet.</div>
            ) : (
              <div className="space-y-3">
                {obj.threads.map(thread => (
                  <div key={thread.thread_id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-800">{thread.statement}</span>
                      <span className="text-xs text-gray-400 shrink-0">{thread.signal_count} signals</span>
                    </div>
                    <div className="space-y-1.5">
                      {thread.signals.map(sig => (
                        <div key={sig.signal_id} className="flex items-start gap-2">
                          <LevelBadge level={sig.level} />
                          <span className="text-xs text-gray-600">{sig.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4">
          {showObjForm ? (
            <form onSubmit={handleAddObjective} className="flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
                placeholder="Objective title"
                value={objTitle}
                onChange={e => setObjTitle(e.target.value)}
                autoFocus
              />
              <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">Add</button>
              <button type="button" onClick={() => setShowObjForm(false)} className="text-sm text-gray-400 px-2">Cancel</button>
            </form>
          ) : (
            <button onClick={() => setShowObjForm(true)} className="text-sm text-gray-400 hover:text-gray-700">
              + Add Objective
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
