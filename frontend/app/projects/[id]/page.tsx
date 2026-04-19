"use client"
import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/Icon"
import { useToast } from "@/components/Toast"
import { useT } from "@/lib/i18n"
import { ExportModal } from "@/components/ExportModal"
import {
  getDashboard, getReports, redetectReport, deleteReport, updateThread, deleteThread,
  createThread, updateProject, updateObjective, deleteObjective, createObjective,
} from "@/lib/api"
import type { Dashboard, DashboardSignal, DashboardThread, Report } from "@/lib/types"

type ViewMode = "timeline" | "list"

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang, t } = useT()
  const { showToast } = useToast()
  const projectId = Number(id)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("timeline")
  const [exportOpen, setExportOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [redetecting, setRedetecting] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const v = localStorage.getItem("mechela_view") as ViewMode | null
      if (v === "timeline" || v === "list") setViewMode(v)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem("mechela_view", viewMode) } catch {}
  }, [viewMode])

  const refresh = useCallback(() => {
    getDashboard(projectId).then(setDashboard).catch(() => {})
    getReports(projectId).then(setReports).catch(() => {})
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveName = async () => {
    const v = nameDraft.trim()
    if (!v || !dashboard || v === dashboard.project_name) {
      setEditingName(false)
      return
    }
    try {
      await updateProject(projectId, { name: v })
      showToast(t.projectRenamedT as string)
      setEditingName(false)
      refresh()
      window.dispatchEvent(new Event("mechela-refresh"))
    } catch (err) {
      showToast(String(err))
    }
  }

  const allSignals = useMemo<DashboardSignal[]>(() => {
    if (!dashboard) return []
    const out: DashboardSignal[] = []
    dashboard.objectives.forEach((o) =>
      o.threads.forEach((th) => th.signals.forEach((s) => out.push(s)))
    )
    return out
  }, [dashboard])

  const pendingReport = useMemo(() => {
    // naive: any report where signals are still pending
    if (!dashboard) return null
    const pendingSignalsByReport: Record<string, number> = {}
    dashboard.objectives.forEach((o) =>
      o.threads.forEach((th) =>
        th.signals.forEach((s) => {
          if (s.status === "pending") {
            pendingSignalsByReport[s.report_name] = (pendingSignalsByReport[s.report_name] || 0) + 1
          }
        })
      )
    )
    // find a report that has pending signals
    for (const r of reports) {
      if (pendingSignalsByReport[r.name] > 0) {
        return { ...r, pending: pendingSignalsByReport[r.name] }
      }
    }
    return null
  }, [dashboard, reports])

  const { axis, minT, maxT } = useMemo(() => {
    if (allSignals.length === 0)
      return { axis: [] as string[], minT: 0, maxT: 0 }
    const dates = allSignals.map((s) => new Date(s.report_date).getTime())
    const minT = Math.min(...dates)
    const maxT = Math.max(...dates)
    const axis: string[] = []
    const s = new Date(minT)
    const e = new Date(maxT)
    let y = s.getFullYear()
    let q = Math.floor(s.getMonth() / 3) + 1
    const ey = e.getFullYear()
    const eq = Math.floor(e.getMonth() / 3) + 1
    while (y < ey || (y === ey && q <= eq)) {
      axis.push(`${y} Q${q}`)
      q++
      if (q > 4) {
        q = 1
        y++
      }
    }
    if (axis.length === 0) axis.push(`${y} Q${q}`)
    return { axis, minT, maxT }
  }, [allSignals])

  const pctFor = (d: string) => {
    if (maxT === minT) return 50
    return ((new Date(d).getTime() - minT) / (maxT - minT)) * 100
  }

  const confirmedSignals = allSignals.filter((s) => s.status === "confirmed")
  const l1Count = confirmedSignals.filter((s) => s.level === "L1").length
  const maturity = confirmedSignals.length ? l1Count / confirmedSignals.length : 0

  const threadCount = dashboard
    ? dashboard.objectives.reduce((a, o) => a + o.threads.length, 0)
    : 0

  if (!dashboard) {
    return <div className="page"><div className="empty">…</div></div>
  }

  return (
    <div className="page">
      <header className="ph">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ph-meta">{dashboard.project_name}</div>
          {editingName ? (
            <input
              className="editable-input ph-title"
              style={{ display: "block", margin: "0 0 4px" }}
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName()
                if (e.key === "Escape") setEditingName(false)
              }}
            />
          ) : (
            <h1
              className="ph-title editable"
              onClick={() => {
                setEditingName(true)
                setNameDraft(dashboard.project_name)
              }}
            >
              {dashboard.project_name}
              <span className="edit-pencil" title={t.editTitle as string}>✎</span>
            </h1>
          )}
          <div className="ph-sub">
            <Icon name="clock" size={11} /> {reports.length} {t.col_reports as string}
            {" · "}
            {dashboard.total_confirmed_signals} {(t.confirmedSignals as string).toLowerCase()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/projects/${projectId}/upload`} className="btn ghost sm">
            <Icon name="upload" size={12} />
            {t.upload as string}
          </Link>
          <button className="btn primary sm" onClick={() => setExportOpen(true)}>
            <Icon name="download" size={12} />
            {t.export as string}
          </button>
        </div>
      </header>

      <div className="metrics">
        <div className="metric">
          <div className="m-lbl">{t.objectives as string}</div>
          <div className="m-val">{dashboard.objectives.length}</div>
          <div className="m-foot">
            {threadCount} {(t.threads as string).toLowerCase()}
          </div>
        </div>
        <div className="metric">
          <div className="m-lbl">{t.confirmedSignals as string}</div>
          <div className="m-val">
            {dashboard.total_confirmed_signals}
            <span style={{ fontSize: "0.4em", color: "var(--ink-3)", marginLeft: 4 }}>
              / {allSignals.length}
            </span>
          </div>
          <div className="m-foot">
            {reports.length} {t.col_reports as string}
            {pendingReport && (
              <>
                , <span style={{ color: "var(--l2-ink)" }}>1 {t.pendingReview as string}</span>
              </>
            )}
          </div>
        </div>
        <div className="metric" title={`L1 / ${t.confirmedLabel as string} = ${l1Count}/${confirmedSignals.length}`}>
          <div className="m-lbl">{t.reportCoverage as string}</div>
          <div className="m-val">
            {Math.round(maturity * 100)}
            <span style={{ fontSize: "0.4em", color: "var(--ink-3)" }}>%</span>
          </div>
          <div className="pbar">
            <i style={{ width: `${maturity * 100}%` }} />
          </div>
          <div className="m-foot" style={{ marginTop: 2 }}>
            {l1Count} L1 / {confirmedSignals.length} {t.confirmedLabel as string}
          </div>
        </div>
      </div>

      {pendingReport && (
        <div className="banner">
          <div className="dot">A</div>
          <div style={{ flex: 1 }}>
            <div className="t">
              {(t.newSignalsPending as (n: number) => string)(pendingReport.pending)}
            </div>
            <div className="s">{t.reviewToConfirm as string}</div>
          </div>
          <Link
            href={`/projects/${projectId}/review/${pendingReport.id}`}
            className="btn accent"
          >
            {t.review as string} →
          </Link>
        </div>
      )}

      <section>
        <div className="sh">
          <div className="sh-left">
            <h2>{t.progressionOverview as string}</h2>
            <span className="n">
              · {threadCount} {(t.threads as string).toLowerCase()}
            </span>
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === "timeline" ? "on" : ""}
              onClick={() => setViewMode("timeline")}
            >
              {t.viewTimeline as string}
            </button>
            <button
              className={viewMode === "list" ? "on" : ""}
              onClick={() => setViewMode("list")}
            >
              {t.viewList as string}
            </button>
          </div>
        </div>
        {viewMode === "timeline" ? (
          <SwimLane dashboard={dashboard} axis={axis} pctFor={pctFor} onDotClick={(s) => {
            // find the report id from report_name
            const rep = reports.find((r) => r.name === s.report_name)
            if (rep) router.push(`/projects/${projectId}/review/${rep.id}?sid=${s.signal_id}`)
          }} />
        ) : (
          <div>
            {dashboard.objectives.map((obj, i) => (
              <ObjectiveCard
                key={obj.objective_id}
                obj={obj}
                index={i}
                projectId={projectId}
                reports={reports}
                onRefresh={refresh}
              />
            ))}
            <AddObjectiveForm projectId={projectId} onRefresh={refresh} />
          </div>
        )}
      </section>

      {viewMode === "timeline" && (
        <section>
          <div className="sh">
            <h2>{t.byObjective as string}</h2>
          </div>
          {dashboard.objectives.map((obj, i) => (
            <ObjectiveCard
              key={obj.objective_id}
              obj={obj}
              index={i}
              projectId={projectId}
              reports={reports}
              onRefresh={refresh}
            />
          ))}
          <AddObjectiveForm projectId={projectId} onRefresh={refresh} />
        </section>
      )}

      <section>
        <div className="sh">
          <h2>{t.reports as string}</h2>
          <span className="n">· {reports.length}</span>
        </div>
        <div className="rpt">
          <div className="rpt-row head">
            <div>{t.rp_name as string}</div>
            <div>{t.rp_date as string}</div>
            <div>{t.rp_signals as string}</div>
            <div>{t.rp_status as string}</div>
            <div />
          </div>
          {reports.map((r) => {
            const pendingForThis = allSignals.filter((s) => s.report_name === r.name && s.status === "pending").length
            const totalForThis = allSignals.filter((s) => s.report_name === r.name).length
            return (
              <div className="rpt-row" key={r.id}>
                <div className="nm">{r.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>
                  {r.report_date}
                </div>
                <div style={{ fontFamily: "var(--font-mono)" }}>{totalForThis}</div>
                <div>
                  {pendingForThis > 0 ? (
                    <span className="chip l2" style={{ fontSize: 10 }}>
                      {pendingForThis} {t.pendingReview as string}
                    </span>
                  ) : (
                    <span className="chip l1" style={{ fontSize: 10 }}>
                      {t.reviewed as string}
                    </span>
                  )}
                </div>
                <div className="ac">
                  <button
                    className="btn subtle sm"
                    disabled={redetecting.has(r.id)}
                    onClick={async () => {
                      if (redetecting.has(r.id)) return
                      setRedetecting((prev) => new Set(prev).add(r.id))
                      showToast(t.reanalysingToast as string)
                      try {
                        await redetectReport(r.id)
                        showToast((t.reanalysedReportT as (n: string) => string)(r.name))
                        refresh()
                      } catch (err) {
                        showToast(String(err))
                      } finally {
                        setRedetecting((prev) => {
                          const next = new Set(prev)
                          next.delete(r.id)
                          return next
                        })
                      }
                    }}
                  >
                    {redetecting.has(r.id)
                      ? (t.reanalysingButton as string)
                      : (t.reanalyse as string)}
                  </button>
                  <Link
                    href={`/projects/${projectId}/review/${r.id}`}
                    className={`btn ${pendingForThis > 0 ? "primary" : "ghost"} sm`}
                  >
                    {t.review as string}
                  </Link>
                  <button
                    className="del-sm"
                    title={t.delete as string}
                    onClick={async () => {
                      if (!confirm((t.confirmDeleteReport as (n: string) => string)(r.name))) return
                      try {
                        await deleteReport(r.id)
                        showToast((t.deletedReportT as (n: string) => string)(r.name))
                        refresh()
                      } catch (err) {
                        showToast(String(err))
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {exportOpen && (
        <ExportModal projectId={projectId} onClose={() => setExportOpen(false)} />
      )}
    </div>
  )
}

function SwimLane({
  dashboard,
  axis,
  pctFor,
  onDotClick,
}: {
  dashboard: Dashboard
  axis: string[]
  pctFor: (d: string) => number
  onDotClick: (s: DashboardSignal) => void
}) {
  const { t } = useT()
  return (
    <div className="swim">
      {dashboard.objectives.map((obj) => (
        <div className="swim-obj" key={obj.objective_id}>
          <div className="swim-obj-h">
            <b>{obj.objective_title}</b>
          </div>
          {obj.threads.map((th) => (
            <div className="lane" key={th.thread_id}>
              <div className="nm" title={th.statement}>
                {th.statement}
              </div>
              <div className="tr">
                {axis.map((_, i) => (
                  <span
                    className="tr-tick"
                    key={i}
                    style={{ left: `${axis.length > 1 ? (i / (axis.length - 1)) * 100 : 50}%` }}
                  />
                ))}
                {th.signals.map((s) => {
                  const lvl = (s.level || "").toLowerCase()
                  return (
                    <span
                      key={s.signal_id}
                      className={`tr-dot ${lvl}`}
                      style={{ left: `${pctFor(s.report_date)}%` }}
                      title={`${s.report_date} · ${String(s.level).toUpperCase()} · ${s.text.slice(0, 80)}…`}
                      onClick={() => onDotClick(s)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="swim-axis">
        <div />
        <div className="ticks">
          {axis.map((l, i) =>
            i % 2 === 0 ? (
              <span key={l + i}>{l}</span>
            ) : (
              <span key={l + i} style={{ opacity: 0 }}>
                {l}
              </span>
            )
          )}
        </div>
      </div>
      <div className="legend">
        <span>
          <span className="dot-lvl l1" />
          {t.lvlL1 as string} · {t.l1Desc as string}
        </span>
        <span>
          <span className="dot-lvl l2" />
          {t.lvlL2 as string} · {t.l2Desc as string}
        </span>
        <span>
          <span className="dot-lvl l3" />
          {t.lvlL3 as string} · {t.l3Desc as string}
        </span>
      </div>
    </div>
  )
}

function ObjectiveCard({
  obj,
  index,
  projectId,
  reports,
  onRefresh,
}: {
  obj: Dashboard["objectives"][number]
  index: number
  projectId: number
  reports: Report[]
  onRefresh: () => void
}) {
  const { lang, t } = useT()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
  const romanNum = romans[index] || String(index + 1)
  const confirmed = obj.threads.reduce(
    (a, th) => a + th.signals.filter((s) => s.status === "confirmed").length,
    0
  )

  const saveTitle = async () => {
    const v = draft.trim()
    if (!v || v === obj.objective_title) {
      setEditing(false)
      return
    }
    try {
      await updateObjective(projectId, obj.objective_id, { title: v })
      showToast(t.objectiveRenamedT as string)
      setEditing(false)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  const handleDelete = async () => {
    if (!confirm((t.confirmDeleteObj as (n: string, c: number) => string)(obj.objective_title, obj.threads.length))) return
    try {
      await deleteObjective(projectId, obj.objective_id)
      showToast((t.deletedObjectiveT as (n: string) => string)(obj.objective_title))
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  return (
    <div className="obj">
      <div className="obj-h">
        <div className="obj-num">{romanNum}</div>
        <div className="obj-body">
          {editing ? (
            <input
              className="editable-input obj-t"
              style={{ display: "block" }}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle()
                if (e.key === "Escape") setEditing(false)
              }}
            />
          ) : (
            <h3
              className="obj-t editable"
              onClick={() => {
                setEditing(true)
                setDraft(obj.objective_title)
              }}
            >
              {obj.objective_title}
              <span className="edit-pencil" title={t.editTitle as string}>✎</span>
            </h3>
          )}
          <div className="obj-stat">
            <span>
              <b>{obj.threads.length}</b> {(t.threads as string).toLowerCase()}
            </span>
            <span>
              <b>{confirmed}</b> {(t.confirmedSignals as string).toLowerCase()}
            </span>
          </div>
        </div>
        <button className="del-sm" title={t.delete as string} onClick={handleDelete}>
          ×
        </button>
      </div>
      {obj.threads.length === 0 ? (
        <div className="th-empty">{t.noThreadsYet as string}</div>
      ) : (
        obj.threads.map((th) => (
          <ThreadBlock
            key={th.thread_id}
            thread={th}
            objectiveId={obj.objective_id}
            threadCount={obj.threads.length}
            projectId={projectId}
            reports={reports}
            onRefresh={onRefresh}
          />
        ))
      )}
      <AddThreadForm
        objectiveId={obj.objective_id}
        onRefresh={onRefresh}
      />
    </div>
  )
}

function ThreadBlock({
  thread,
  objectiveId,
  threadCount,
  projectId,
  reports,
  onRefresh,
}: {
  thread: DashboardThread
  objectiveId: number
  threadCount: number
  projectId: number
  reports: Report[]
  onRefresh: () => void
}) {
  const { lang, t } = useT()
  const { showToast } = useToast()
  const [editingSum, setEditingSum] = useState(false)
  const [sumDraft, setSumDraft] = useState(thread.progression_summary || "")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")

  const sigs = [...thread.signals].sort((a, b) => a.report_date.localeCompare(b.report_date))

  const saveSum = async () => {
    try {
      await updateThread(thread.thread_id, { progression_summary: sumDraft })
      showToast(t.savedT as string)
      setEditingSum(false)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  const saveTitle = async () => {
    const v = titleDraft.trim()
    if (!v || v === thread.statement) {
      setEditingTitle(false)
      return
    }
    try {
      await updateThread(thread.thread_id, { statement: v })
      showToast(t.threadRenamedT as string)
      setEditingTitle(false)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  const handleDel = async () => {
    if (threadCount <= 1) {
      showToast(t.cannotDeleteOnlyThread as string)
      return
    }
    if (!confirm((t.confirmDeleteThread as (n: string) => string)(thread.statement))) return
    // need a target thread - just pick the first other thread in same objective via prompt
    const targetId = prompt(t.moveSignalsPrompt as string)
    if (!targetId) return
    try {
      await deleteThread(thread.thread_id, Number(targetId))
      showToast(t.threadDeletedT as string)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  return (
    <div className="th">
      <div className="th-h">
        {editingTitle ? (
          <input
            className="editable-input"
            style={{ fontSize: "calc(14px*var(--font-scale))", fontWeight: 600, flex: 1 }}
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle()
              if (e.key === "Escape") setEditingTitle(false)
            }}
          />
        ) : (
          <h3
            className="editable"
            onClick={() => {
              setEditingTitle(true)
              setTitleDraft(thread.statement)
            }}
          >
            {thread.statement}
            <span className="edit-pencil" title={t.editTitle as string}>✎</span>
          </h3>
        )}
        <span className="chip plain" style={{ fontSize: 10 }}>
          {sigs.filter((s) => s.status === "confirmed").length} / {sigs.length}
        </span>
        <button className="del-sm" title={t.delete as string} onClick={handleDel}>
          ×
        </button>
      </div>
      {editingSum ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            className="th-sum"
            style={{
              width: "100%",
              minHeight: 70,
              resize: "vertical",
              background: "var(--bg-card)",
              outline: "none",
            }}
            value={sumDraft}
            onChange={(e) => setSumDraft(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 5 }}>
            <button className="btn primary sm" onClick={saveSum}>
              <Icon name="check" size={11} />
              {t.save as string}
            </button>
            <button
              className="btn subtle sm"
              onClick={() => {
                setEditingSum(false)
                setSumDraft(thread.progression_summary || "")
              }}
            >
              {t.cancel as string}
            </button>
          </div>
        </div>
      ) : thread.progression_summary ? (
        <div className="th-sum" onClick={() => setEditingSum(true)}>
          {thread.progression_summary}
        </div>
      ) : (
        <div className="th-sum empty" onClick={() => setEditingSum(true)}>
          + {t.addSummary as string}
        </div>
      )}
      <div className="sig-list">
        {sigs.map((s) => {
          const rep = reports.find((r) => r.name === s.report_name)
          const rereview = () => {
            if (rep) {
              window.location.href = `/projects/${projectId}/review/${rep.id}?sid=${s.signal_id}`
            }
          }
          return (
            <div className="sig-row compact" key={s.signal_id}>
              <span>
                <span className={`chip ${String(s.level).toLowerCase()}`}>
                  {String(s.level).toUpperCase()}
                </span>
              </span>
              <span className="x">{s.text}</span>
              <span className="sig-acts">
                <button
                  className="sig-act"
                  title={t.rereview as string}
                  onClick={rereview}
                >
                  <Icon name="refresh" size={11} />
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddThreadForm({ objectiveId, onRefresh }: { objectiveId: number; onRefresh: () => void }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState("")

  const submit = async () => {
    const s = v.trim()
    if (!s) return
    try {
      await createThread(objectiveId, s)
      setV("")
      setOpen(false)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  if (!open) {
    return (
      <div className="th" style={{ padding: "8px 18px" }}>
        <button className="btn subtle sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={11} />
          {t.addThread as string}
        </button>
      </div>
    )
  }

  return (
    <div className="th" style={{ padding: 12 }}>
      <div className="new-th">
        <Icon name="plus" size={12} />
        <input
          autoFocus
          placeholder={t.newThreadName as string}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
            if (e.key === "Escape") setOpen(false)
          }}
          onBlur={() => v.trim() === "" && setOpen(false)}
        />
        <button className="btn primary sm" onClick={submit}>
          {t.create as string}
        </button>
      </div>
    </div>
  )
}

function AddObjectiveForm({ projectId, onRefresh }: { projectId: number; onRefresh: () => void }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState("")

  const submit = async () => {
    const s = v.trim()
    if (!s) return
    try {
      await createObjective(projectId, s)
      setV("")
      setOpen(false)
      onRefresh()
    } catch (err) {
      showToast(String(err))
    }
  }

  if (!open) {
    return (
      <button
        className="btn ghost"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={12} />
        {t.addObjective as string}
      </button>
    )
  }

  return (
    <div className="obj" style={{ padding: 16 }}>
      <div className="new-th">
        <Icon name="plus" size={12} />
        <input
          autoFocus
          placeholder={t.newObjectiveName as string}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
            if (e.key === "Escape") setOpen(false)
          }}
        />
        <button className="btn primary sm" onClick={submit}>
          {t.create as string}
        </button>
      </div>
    </div>
  )
}
