'use client'

import { useState, useEffect, Suspense } from 'react'
import { Sidebar } from '@/components/sidebar'
import { DocsToc } from '@/components/DocsToc'
import { DocsSearchBar } from '@/components/DocsSearchBar'
import { HashScrollHandler } from '@/components/HashScrollHandler'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import './docs.css'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Hide when scrolling down, show when scrolling up or at top
      if (currentScrollY < 10) {
        setIsSearchBarVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsSearchBarVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setIsSearchBarVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        body:has(.docs-page) .navbar,
        body:has(.docs-page) .mobile-navbar,
        body:has(.docs-page) .desktop-navbar,
        body:has(.docs-page) footer {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        body:has(.docs-page) {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `}} />
      
      <div className="min-h-screen bg-background docs-page">
        <Suspense fallback={null}>
          <HashScrollHandler />
        </Suspense>
        <Sidebar />
        <DocsToc />
        <main className="docs-main-content">
          {/* Top Bar with Search */}
          <div className={`docs-top-bar ${isSearchBarVisible ? 'docs-top-bar-visible' : 'docs-top-bar-hidden'}`}>
            <div className="docs-top-bar-content">
              <DocsSearchBar />
              {/* Back to Home Button - Inside top bar on mobile */}
              <Link
                href="/"
                className="back-to-home-enhanced back-to-home-mobile"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="back-to-home-text">Back to Home</span>
              </Link>
            </div>
          </div>
          
          {/* Back to Home Button - Fixed Top Right (Desktop only) */}
          <Link
            href="/"
            className="back-to-home-enhanced back-to-home-desktop"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          
          {/* Content - Left Aligned */}
          <div className="docs-content-wrapper">
            <div className="docs-content-inner">
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
