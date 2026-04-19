"use client"
import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon } from "@/components/Icon"
import { useT } from "@/lib/i18n"
import { useToast } from "@/components/Toast"
import { uploadReport } from "@/lib/api"

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang, t } = useT()
  const { showToast } = useToast()
  const projectId = Number(id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const onFilePick = (f: File | null) => {
    if (!f) return
    setFile(f)
    if (!name) setName(f.name.replace(/\.docx$/i, ""))
    if (!reportDate) setReportDate(today)
  }

  const submit = async () => {
    if (!file) return
    if (!name.trim()) return showToast(lang === "en" ? "Name required" : "請填寫名稱")
    if (!reportDate) return showToast(lang === "en" ? "Date required" : "請填寫日期")
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("project_id", String(projectId))
      fd.append("name", name.trim())
      fd.append("report_date", reportDate)
      fd.append("file", file)
      const result = await uploadReport(fd)
      showToast(
        lang === "en"
          ? `Detected ${result.signals_detected} signals`
          : `偵測到 ${result.signals_detected} 個訊號`
      )
      router.push(`/projects/${projectId}/review/${result.report_id}`)
    } catch (err) {
      showToast(String(err))
      setUploading(false)
    }
  }

  return (
    <div className="page page-narrow">
      <header className="ph">
        <div>
          <div className="ph-meta">{t.upload as string}</div>
          <h1 className="ph-title">{t.upload as string}</h1>
          <p className="ph-sub">
            {lang === "en"
              ? "Drop a .docx file and fill in its metadata. Signal detection runs immediately."
              : "拖曳 .docx 檔案並填寫 metadata，系統會立即執行訊號偵測。"}
          </p>
        </div>
      </header>

      <div
        className="drop"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFilePick(e.dataTransfer.files?.[0] || null)
        }}
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

      {file && (
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
            <button className="btn primary" onClick={submit} disabled={uploading}>
              <Icon name="upload" size={12} />
              {uploading ? (lang === "en" ? "Uploading…" : "上傳中…") : (t.upload as string)}
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
    </div>
  )
}
