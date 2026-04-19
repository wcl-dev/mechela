"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { Icon } from "./Icon"
import { useT } from "@/lib/i18n"
import type { Project, ProviderStatus } from "@/lib/types"
import { getProjects, getProvider } from "@/lib/api"

export function Shell({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [provider, setProvider] = useState<ProviderStatus | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {})
    getProvider().then(setProvider).catch(() => {})
  }, [refreshTick])

  useEffect(() => {
    const onRefresh = () => setRefreshTick((x) => x + 1)
    window.addEventListener("mechela-refresh", onRefresh)
    return () => window.removeEventListener("mechela-refresh", onRefresh)
  }, [])

  return (
    <div className="app">
      <Sidebar projects={projects} provider={provider} />
      <div className="main">
        <Topbar projects={projects} />
        {children}
      </div>
    </div>
  )
}

function Sidebar({ projects, provider }: { projects: Project[]; provider: ProviderStatus | null }) {
  const { lang, t, setLang } = useT()
  const pathname = usePathname()
  const params = useParams()
  const currentProjectId = params?.id ? Number(params.id) : null

  const modeMeta = {
    "rule-based": { label: t.modeBasicT as string, priv: t.priv_local as string },
    ollama: { label: t.modeLocalT as string, priv: t.priv_local as string },
    openai: { label: t.modeOpenAIT as string, priv: t.priv_cloud as string },
  }
  const m = provider ? modeMeta[provider.provider] : modeMeta["rule-based"]
  const dotColor = m.priv === t.priv_cloud ? "var(--accent)" : "var(--ink-1)"

  return (
    <aside className="side">
      <div>
        <div className="brand">
          <h1>mechela</h1>
          <span className="brand-dot" />
        </div>
        <div className="brand-sub">Narrative Evidence Index</div>
      </div>
      <div className="side-sec">
        <div className="side-lbl">{t.projects as string}</div>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="nav"
            aria-current={currentProjectId === p.id ? "page" : undefined}
            title={p.name}
          >
            <span className="dot" style={{ background: "var(--ink-1)" }} />
            <span className="name">{p.name}</span>
            <span className="n">{p.objectives.length}</span>
          </Link>
        ))}
      </div>
      <div className="side-sec">
        <div className="side-lbl">·</div>
        <Link href="/" className="nav" aria-current={pathname === "/" ? "page" : undefined}>
          <Icon name="home" /> {t.home_title as string}
        </Link>
        <Link
          href="/settings"
          className="nav"
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <Icon name="settings" /> {t.settings as string}
        </Link>
      </div>
      <div className="side-foot">
        <Link
          href="/settings"
          className="mode-ind"
          title={t.changeMode as string}
        >
          <span className="mode-dot" style={{ background: dotColor }} />
          <span className="mode-lbl">{m.label}</span>
          <span className="mode-priv">{m.priv}</span>
        </Link>
        <div style={{ display: "flex", gap: 4, padding: "2px 0" }}>
          <button
            className="mode-ind"
            style={{
              padding: "2px 6px",
              borderRadius: 3,
              background: lang === "zh" ? "var(--bg-card)" : "transparent",
              border: `1px solid ${lang === "zh" ? "var(--line)" : "transparent"}`,
              flex: 1,
              justifyContent: "center",
            }}
            onClick={() => setLang("zh")}
          >
            繁中
          </button>
          <button
            className="mode-ind"
            style={{
              padding: "2px 6px",
              borderRadius: 3,
              background: lang === "en" ? "var(--bg-card)" : "transparent",
              border: `1px solid ${lang === "en" ? "var(--line)" : "transparent"}`,
              flex: 1,
              justifyContent: "center",
            }}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
        <div className="foot-meta">v1.0 · mvp · {(t.localFirst as string).toLowerCase()}</div>
      </div>
    </aside>
  )
}

function Topbar({ projects }: { projects: Project[] }) {
  const { t } = useT()
  const pathname = usePathname()
  const params = useParams()
  const currentProjectId = params?.id ? Number(params.id) : null
  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null

  const crumbs: Array<{ label: string; href?: string; cur?: boolean }> = [
    { label: t.projects as string, href: "/" },
  ]
  if (currentProject) {
    crumbs.push({
      label: currentProject.name,
      href: `/projects/${currentProject.id}`,
    })
  }
  if (pathname?.includes("/review/")) crumbs.push({ label: t.review as string, cur: true })
  if (pathname === "/settings") crumbs.push({ label: t.settings as string, cur: true })
  if (pathname?.includes("/upload")) crumbs.push({ label: t.upload as string, cur: true })

  return (
    <div className="top">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="sep">
                <Icon name="chev" size={11} />
              </span>
            )}
            {c.cur || !c.href ? (
              <span className="cur">{c.label}</span>
            ) : (
              <Link href={c.href} className="btn subtle sm">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="top-r" id="mechela-topbar-actions" />
    </div>
  )
}
