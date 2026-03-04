"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { getProjects, createProject } from "@/lib/api"
import type { Project } from "@/lib/types"

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    getProjects().then(setProjects)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const p = await createProject(name.trim(), desc.trim() || undefined)
    setProjects(prev => [...prev, p])
    setName(""); setDesc(""); setShowForm(false); setCreating(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          + New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
            placeholder="Project name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-600"
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-400 transition-colors flex items-center justify-between text-gray-900"
            >
              <div>
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.description && <div className="text-sm text-gray-500 mt-0.5">{p.description}</div>}
              </div>
              <div className="text-sm text-gray-400">{p.objectives.length} objectives →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
