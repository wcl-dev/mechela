import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mechela",
  description: "Narrative Evidence Index & Change Progression Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900 text-lg tracking-tight">
            Mechela
          </Link>
          <Link href="/" className="text-sm text-gray-700 hover:text-gray-900">
            Projects
          </Link>
          <div className="ml-auto">
            <Link href="/settings" className="text-sm text-gray-700 hover:text-gray-900">
              Settings
            </Link>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
