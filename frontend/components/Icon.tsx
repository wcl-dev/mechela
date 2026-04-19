"use client"
import React from "react"

const PATHS: Record<string, string> = {
  upload: "M12 3v13 M7 8l5-5 5 5 M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  download: "M12 3v13 M7 11l5 5 5-5 M4 21h16",
  plus: "M12 5v14 M5 12h14",
  x: "M6 6l12 12 M6 18L18 6",
  check: "M4 12l5 5 11-11",
  chev: "M9 6l6 6-6 6",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6A7 7 0 0 0 19 12z",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z",
  doc: "M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v4h4",
  arrL: "M15 18l-6-6 6-6",
  arrR: "M9 6l6 6-6 6",
  tag: "M20 12l-8 8-9-9V4h7l10 8z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  home: "M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11z",
  refresh: "M4 4v6h6 M20 20v-6h-6 M20 9a8 8 0 0 0-14-3l-2 4 M4 15a8 8 0 0 0 14 3l2-4",
}

export function Icon({ name, size = 14 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
