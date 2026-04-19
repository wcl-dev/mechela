import type { Metadata } from "next"
import { ToastProvider } from "@/components/Toast"
import { LanguageProvider } from "@/lib/i18n"
import { Shell } from "@/components/Shell"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mechela",
  description: "Narrative Evidence Index & Change Progression Builder",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" data-theme="bureau">
      <body>
        <LanguageProvider>
          <ToastProvider>
            <Shell>{children}</Shell>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
