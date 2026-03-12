'use client'

import { Sidebar } from '@/components/sidebar'

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Modern subtle background */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-background pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(2,127,247,0.02),transparent_70%)] pointer-events-none"></div>
      <div className="flex relative z-10">
        <Sidebar />
        <main className="flex-1 lg:ml-60 min-h-screen" style={{ paddingTop: '6rem' }}>
          <div className="w-full max-w-3xl mx-auto px-6 py-12 sm:px-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
