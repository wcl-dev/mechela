"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/Icon"
import { useToast } from "@/components/Toast"
import { useT } from "@/lib/i18n"
import { getProjects, createProject, deleteProject, getReports, getDashboard } from "@/lib/api"
import type { Project } from "@/lib/types"

type ProjectStats = {
  threads: number
  confirmedSignals: number
  reports: number
  updatedAt?: string
}

export default function HomePage() {
  const router = useRouter()
  const { lang, t } = useT()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Record<number, ProjectStats>>({})
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")

  const refresh = () => {
    getProjects().then((list) => {
      setProjects(list)
      list.forEach(async (p) => {
        try {
          const [reports, dash] = await Promise.all([getReports(p.id), getDashboard(p.id)])
          const threadCount = dash.objectives.reduce((a, o) => a + o.threads.length, 0)
          setStats((s) => ({
            ...s,
            [p.id]: {
              threads: threadCount,
              confirmedSignals: dash.total_confirmed_signals,
              reports: reports.length,
              updatedAt: reports[reports.length - 1]?.report_date,
            },
          }))
        } catch {}
      })
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createProject(name.trim(), desc.trim() || undefined)
      showToast((t.createdProjectT as (n: string) => string)(name.trim()))
      setName("")
      setDesc("")
      setShowForm(false)
      refresh()
      window.dispatchEvent(new Event("mechela-refresh"))
    } catch (err) {
      showToast(String(err))
    }
  }

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.stopPropagation()
    if (!confirm((t.confirmDeleteProject as (n: string) => string)(p.name))) return
    try {
      await deleteProject(p.id)
      showToast((t.deletedProjectT as (n: string) => string)(p.name))
      refresh()
      window.dispatchEvent(new Event("mechela-refresh"))
    } catch (err) {
      showToast(String(err))
    }
  }

  return (
    <div className="page page-narrow">
      <header className="ph">
        <div>
          <div className="ph-meta">mechela · narrative evidence index</div>
          <h1 className="ph-title">{t.home_title as string}</h1>
          <p className="ph-sub">{t.home_sub as string}</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" size={12} />
          {t.newProject as string}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="new-proj">
          <input
            autoFocus
            placeholder={t.projectName as string}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder={t.description as string}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="btn primary sm">
              {t.create as string}
            </button>
            <button
              type="button"
              className="btn subtle sm"
              onClick={() => {
                setShowForm(false)
                setName("")
                setDesc("")
              }}
            >
              {t.cancel as string}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="empty">{t.emptyProjectsHint as string}</div>
      ) : (
        <div className="proj-list">
          {projects.map((p) => {
            const s = stats[p.id]
            return (
              <div
                key={p.id}
                className="proj"
                onClick={() => router.push(`/projects/${p.id}`)}
              >
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description || ""}</p>
                </div>
                <div className="num">
                  {s?.threads ?? 0}
                  <small>{t.col_threads as string}</small>
                </div>
                <div className="num">
                  {s?.confirmedSignals ?? 0}
                  <small>{t.col_signals as string}</small>
                </div>
                <div className="num">
                  {s?.reports ?? 0}
                  <small>{t.col_reports as string}</small>
                </div>
                <div className="dt">{s?.updatedAt ?? "—"}</div>
                <button
                  className="del-sm"
                  title={t.delete as string}
                  onClick={(e) => handleDelete(e, p)}
                  aria-label={t.delete as string}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
