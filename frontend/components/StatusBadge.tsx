import type { SignalStatus } from "@/lib/types"

const styles: Record<SignalStatus, string> = {
  candidate: "bg-blue-50 text-blue-700 border border-blue-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  rejected: "bg-red-50 text-red-500 border border-red-200",
  context: "bg-purple-50 text-purple-700 border border-purple-200",
}

const labels: Record<SignalStatus, string> = {
  candidate: "待審閱",
  confirmed: "已確認",
  rejected: "已排除",
  context: "背景脈絡",
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
