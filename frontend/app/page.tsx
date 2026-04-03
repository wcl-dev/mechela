"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { getProjects, createProject, deleteProject } from "@/lib/api"
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

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) return
    await deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

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
          className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
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
              className="bg-teal-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
            <div
              key={p.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <Link href={`/projects/${p.id}`} className="flex-1 min-w-0 hover:opacity-70 transition-opacity">
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.description && <div className="text-sm text-gray-500 mt-0.5">{p.description}</div>}
              </Link>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="text-sm text-gray-400">{p.objectives.length} objectives</span>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
