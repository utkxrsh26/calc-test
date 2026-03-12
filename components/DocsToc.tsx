'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface Heading {
  id: string
  text: string
  level: number
}

export function DocsToc() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const pathname = usePathname()

  useEffect(() => {
    // Function to update headings (h2 and h3)
    const updateHeadings = () => {
      const headingElements = document.querySelectorAll(
        '.documentation-content h2, .documentation-content h3'
      )
      const headingData = Array.from(headingElements).map((heading) => ({
        id: heading.id,
        text: heading.textContent || '',
        level: heading.tagName.toLowerCase() === 'h2' ? 2 : 3,
      }))
      setHeadings(headingData)
    }

    // Update immediately
    updateHeadings()

    // Also update after a short delay to ensure content is loaded
    const timer = setTimeout(updateHeadings, 100)

    // Set up intersection observer for active heading
    const headingElements = document.querySelectorAll(
      '.documentation-content h2, .documentation-content h3'
    )
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    headingElements.forEach((heading) => observer.observe(heading))

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [pathname]) // Re-run when pathname changes

  if (headings.length === 0) return null

  return (
    <div className="docs-toc">
      <div className="docs-toc-header">On this page</div>
      <nav className="docs-toc-nav">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`docs-toc-link ${activeId === heading.id ? 'active' : ''} ${
              heading.level === 3 ? 'docs-toc-link-h3' : ''
            }`}
            onClick={(e) => {
              e.preventDefault()
              const element = document.getElementById(heading.id)
              if (element) {
                // Calculate offset for fixed header
                const headerOffset = 120
                const elementPosition = element.getBoundingClientRect().top
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                })
                window.history.pushState(null, '', `#${heading.id}`)
              }
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  )
}
