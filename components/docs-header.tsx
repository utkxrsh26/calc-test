'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { SearchModal } from './search-modal'

export function DocsHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-14 z-30 w-full border-b border-border/50 bg-[#0A0A0A]">
        <div className="container flex h-14 items-center px-4 sm:px-8">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-semibold text-white">Documentation</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-gray-700 bg-black/50 px-4 text-sm text-gray-400 hover:bg-black/70 hover:text-gray-300 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline-flex">Search docs...</span>
                <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-900 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
              
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
