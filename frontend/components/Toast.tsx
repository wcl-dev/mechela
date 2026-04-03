"use client"
import { useEffect, useState, useRef } from "react"

let showToastGlobal: (msg: string) => void = () => {}

export function useToast() {
  return { showToast: (msg: string) => showToastGlobal(msg) }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("")
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    showToastGlobal = (msg: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setMessage(msg)
      setVisible(true)
      timerRef.current = setTimeout(() => setVisible(false), 2500)
    }
  }, [])

  return (
    <>
      {children}
      {visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg shadow-lg z-50 animate-fade-in">
          {message}
        </div>
      )}
    </>
  )
}
