"use client"
import React, { useEffect, useState } from "react"
import { Icon } from "./Icon"
import { useT } from "@/lib/i18n"
import { useToast } from "./Toast"
import { exportMarkdown } from "@/lib/api"

export function ExportModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { t } = useT()
  const { showToast } = useToast()
  const [md, setMd] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    exportMarkdown(projectId)
      .then((r) => setMd(r.markdown))
      .catch(() => setMd("# Export failed"))
      .finally(() => setLoading(false))
  }, [projectId])

  const copy = () => {
    navigator.clipboard?.writeText(md)
    showToast(t.copiedT as string)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{t.exportTitle as string}</h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn primary sm" onClick={copy} disabled={loading}>
              <Icon name="download" size={12} />
              {t.copyMd as string}
            </button>
            <button className="btn ghost sm" onClick={onClose}>
              {t.closeMd as string}
            </button>
          </div>
        </div>
        <div className="modal-b">{loading ? "…" : md}</div>
      </div>
    </div>
  )
}
