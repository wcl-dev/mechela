"use client"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon } from "@/components/Icon"
import { useT } from "@/lib/i18n"
import { useToast } from "@/components/Toast"
import { uploadReport, getProvider } from "@/lib/api"
import type { UploadResult } from "@/lib/types"

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useT()
  const { showToast } = useToast()
  const projectId = Number(id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isLlmMode, setIsLlmMode] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    getProvider().then((s) => setIsLlmMode(s.mode === "llm")).catch(() => {})
  }, [])

  useEffect(() => {
    if (uploading) {
      setElapsed(0)
      const start = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [uploading])

  const onFilePick = (f: File | null) => {
    if (!f) return
    setFile(f)
    if (!name) setName(f.name.replace(/\.docx$/i, ""))
    if (!reportDate) setReportDate(today)
  }

  const submit = async () => {
    if (!file) return
    if (!name.trim()) return showToast(t.nameRequired as string)
    if (!reportDate) return showToast(t.dateRequired as string)
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("project_id", String(projectId))
      fd.append("name", name.trim())
      fd.append("report_date", reportDate)
      fd.append("file", file)
      const r = await uploadReport(fd)
      setResult(r)
    } catch (err) {
      showToast(String(err))
    } finally {
      setUploading(false)
    }
  }

  // Stage heuristic based on elapsed time (backend gives no fine-grained progress)
  const stageText = (() => {
    if (elapsed < 3) return t.uploadStageParsing as string
    if (!isLlmMode || elapsed < 8) return t.uploadStageDetecting as string
    return t.uploadStageLlm as string
  })()

  return (
    <div className="page page-narrow">
      <header className="ph">
        <div>
          <div className="ph-meta">{t.upload as string}</div>
          <h1 className="ph-title">{t.upload as string}</h1>
          <p className="ph-sub">{t.uploadPageSub as string}</p>
        </div>
      </header>

      {/* Success card */}
      {result && !uploading && (
        <div
          className="card"
          style={{
            background: "var(--l1-bg)",
            borderColor: "var(--l1-ink)",
            padding: "var(--gap-5)",
            gap: "var(--gap-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--l1-ink)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="check" size={16} />
            </span>
            <h4 style={{ margin: 0, fontSize: 16, color: "var(--ink-1)" }}>
              {t.uploadSuccess as string}
            </h4>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--ink-2)" }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-3)" }}>
                {t.col_reports as string}
              </div>
              <div style={{ fontWeight: 500 }}>{result.total_paragraphs} ¶</div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-3)" }}>
                {t.col_signals as string}
              </div>
              <div style={{ fontWeight: 500 }}>{result.signals_detected}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-3)" }}>
                {t.detectionMode as string}
              </div>
              <div style={{ fontWeight: 500 }}>
                {result.mode === "llm" ? (t.modeLocalT as string) : (t.modeBasicT as string)}
              </div>
            </div>
          </div>
          {result.output_warning && result.output_warning_message && (
            <div
              style={{
                fontSize: 12,
                color: "var(--l2-ink)",
                background: "var(--l2-bg)",
                padding: "8px 10px",
                borderRadius: 6,
              }}
            >
              {result.output_warning_message}
            </div>
          )}
          {result.fallback_reason && (
            <div
              style={{
                fontSize: 12,
                color: "var(--l2-ink)",
                background: "var(--l2-bg)",
                padding: "8px 10px",
                borderRadius: 6,
              }}
            >
              {result.fallback_reason}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn primary"
              onClick={() => router.push(`/projects/${projectId}/review/${result.report_id}`)}
            >
              {t.uploadGoReview as string}
            </button>
            <button
              className="btn subtle"
              onClick={() => {
                setResult(null)
                setFile(null)
                setName("")
                setReportDate("")
              }}
            >
              {t.uploadAnother as string}
            </button>
          </div>
        </div>
      )}

      {!result && (
        <>
          <div
            className="drop"
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (!uploading) onFilePick(e.dataTransfer.files?.[0] || null)
            }}
            style={uploading ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            <div className="ic">
              <Icon name="upload" size={26} />
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 20 }}>
              {file ? file.name : (t.dropTitle as string)}
            </div>
            <div style={{ color: "var(--ink-3)", fontSize: 12 }}>{t.dropSub as string}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              style={{ display: "none" }}
              onChange={(e) => onFilePick(e.target.files?.[0] || null)}
            />
          </div>

          {file && !uploading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="m-lbl" style={{ marginBottom: 4 }}>{t.rp_name as string}</div>
                <input
                  className="kw-in"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.rp_name as string}
                />
              </div>
              <div>
                <div className="m-lbl" style={{ marginBottom: 4 }}>{t.rp_date as string}</div>
                <input
                  className="kw-in"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn primary" onClick={submit}>
                  <Icon name="upload" size={12} />
                  {t.upload as string}
                </button>
                <button
                  className="btn subtle"
                  onClick={() => router.push(`/projects/${projectId}`)}
                >
                  {t.cancel as string}
                </button>
              </div>
            </div>
          )}

          {/* Progress card while uploading */}
          {uploading && (
            <div className="card" style={{ padding: "var(--gap-5)", gap: "var(--gap-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  aria-hidden
                  style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "2px solid var(--line)",
                    borderTopColor: "var(--accent)",
                    animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "var(--ink-1)" }}>{stageText}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {(t.uploadElapsedT as (s: number) => string)(elapsed)}
                  </div>
                </div>
              </div>
              {isLlmMode && elapsed > 30 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--accent-ink)",
                    background: "var(--accent-soft)",
                    padding: "8px 10px",
                    borderRadius: 6,
                  }}
                >
                  {t.uploadStageLlm as string}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
