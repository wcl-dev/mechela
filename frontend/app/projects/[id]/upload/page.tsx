"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { uploadReport, getProvider } from "@/lib/api"
import type { UploadResult } from "@/lib/types"

const PROGRESS_STEPS = [
  "正在解析文件...",
  "擷取段落與表格中...",
  "偵測改變 Signal 中...",
  "AI 分析中...",
  "即將完成...",
]

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [progressMsg, setProgressMsg] = useState("")
  const [isLlmMode, setIsLlmMode] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getProvider().then(s => setIsLlmMode(s.mode === "llm"))
  }, [])

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      const start = Date.now()
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - start) / 1000)
        setElapsed(secs)
        if (secs < 3) setProgressMsg(PROGRESS_STEPS[0])
        else if (secs < 6) setProgressMsg(PROGRESS_STEPS[1])
        else if (secs < 15) setProgressMsg(PROGRESS_STEPS[2])
        else if (secs < 60) setProgressMsg(PROGRESS_STEPS[3])
        else setProgressMsg(PROGRESS_STEPS[4])
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !name || !date) return
    setLoading(true); setError("")

    try {
      const fd = new FormData()
      fd.append("project_id", id)
      fd.append("name", name)
      fd.append("report_date", date)
      fd.append("file", file)
      const res = await uploadReport(fd)
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上傳失敗")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-gray-600">Project 列表</Link> /
        <Link href={`/projects/${id}`} className="hover:text-gray-600 ml-1">Project</Link> /
        <span className="ml-1">上傳報告</span>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">上傳報告</h1>

      {!result ? (
        <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">報告名稱</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
              placeholder="例如：2024 年第一季報"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">報告日期</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">檔案（僅限 .docx）</label>
            <input
              type="file"
              accept=".docx"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              required
            />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "處理中..." : "上傳並分析"}
          </button>
          {loading && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                <span className="text-sm text-gray-700">{progressMsg}</span>
              </div>
              <div className="text-xs text-gray-400">
                {elapsed > 0 && `已經過 ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}
                {isLlmMode && elapsed < 5 && " — AI 分析可能需要數分鐘"}
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">✓</span>
            <span className="font-medium">報告處理完成</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">段落數</div>
              <div className="font-semibold">{result.total_paragraphs}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">偵測到的 Signal</div>
              <div className="font-semibold">{result.signals_detected}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">分析模式</div>
              <div className="font-semibold capitalize">{result.mode === "llm" ? "AI 模式" : "基礎模式"}</div>
            </div>
          </div>

          {result.output_warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              {result.output_warning_message}
            </div>
          )}

          {result.fallback_reason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              {result.fallback_reason}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => router.push(`/projects/${id}/review/${result.report_id}`)}
              className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm hover:bg-teal-700"
            >
              開始審閱 Signal →
            </button>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-gray-400 px-4 py-2 hover:text-gray-700"
            >
              再上傳一份
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
