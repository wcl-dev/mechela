import type { SignalLevel } from "@/lib/types"

const styles: Record<SignalLevel, string> = {
  L1: "bg-green-100 text-green-800 border border-green-300",
  L2: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  L3: "bg-gray-100 text-gray-600 border border-gray-300",
  pending: "bg-orange-100 text-orange-700 border border-orange-300",
}

export function LevelBadge({ level }: { level: SignalLevel }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles[level]}`}>
      {level === "pending" ? "待判斷" : level}
    </span>
  )
}
