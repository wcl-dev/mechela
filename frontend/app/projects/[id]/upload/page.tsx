"use client"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { uploadReport } from "@/lib/api"
import type { UploadResult } from "@/lib/types"

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")

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
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-gray-600">Projects</Link> /
        <Link href={`/projects/${id}`} className="hover:text-gray-600 ml-1">Project</Link> /
        <span className="ml-1">Upload</span>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Upload Report</h1>

      {!result ? (
        <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report name</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
              placeholder="e.g. Q1 2024"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File (.docx only)</label>
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
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Parsing & detecting signals..." : "Upload & Analyse"}
          </button>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">✓</span>
            <span className="font-medium">Report processed</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">Paragraphs</div>
              <div className="font-semibold">{result.total_paragraphs}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">Signals detected</div>
              <div className="font-semibold">{result.signals_detected}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-gray-500">Mode</div>
              <div className="font-semibold capitalize">{result.mode}</div>
            </div>
          </div>

          {result.output_warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              ⚠ {result.output_warning_message}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => router.push(`/projects/${id}/review/${result.report_id}`)}
              className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm hover:bg-gray-700"
            >
              Start ABC Review →
            </button>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-gray-400 px-4 py-2 hover:text-gray-700"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
