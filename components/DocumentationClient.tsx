'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'

interface Doc {
  id: string
  title: string
  slug: string
}

interface DocumentationClientProps {
  docs: Doc[]
}

export function DocumentationClient({ docs }: DocumentationClientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -80px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          const delay = index * 80
          setTimeout(() => {
            target.style.opacity = '1'
            target.style.transform = 'translateY(0) scale(1)'
          }, delay)
        }
      })
    }, observerOptions)

    cardsRef.current.forEach((card) => {
      if (card) {
        card.style.opacity = '0'
        card.style.transform = 'translateY(30px) scale(0.95)'
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        observer.observe(card)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [docs])

  if (docs.length === 0) {
    return (
      <div className="text-muted-foreground text-base">
        <p>No documents have been uploaded yet. Please use the admin panel to add content.</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="grid gap-3">
      {docs.map((doc, index) => (
        <Link
          key={doc.id}
          href={`/docs/${doc.slug}`}
          ref={(el) => {
            cardsRef.current[index] = el
          }}
          className="group relative block p-5 rounded-lg border border-border/30 bg-gradient-to-br from-card/40 via-card/20 to-card/10 hover:from-card/60 hover:via-card/40 hover:to-card/20 hover:border-primary/30 transition-all duration-300 doc-card-modern overflow-hidden"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-all duration-300"></div>
          
          <div className="relative flex items-center gap-4">
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg group-hover:bg-primary/30 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              <div className="relative bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 rounded-lg border border-primary/20 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300">
                <FileText className="h-4 w-4 text-primary/90 group-hover:text-primary transition-colors duration-300" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                {doc.title}
              </h3>
              <p className="text-xs text-muted-foreground font-mono group-hover:text-muted-foreground/70 transition-colors duration-300">
                {doc.slug}
              </p>
            </div>
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              <ArrowRight className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

