'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * HashScrollHandler
 * 
 * Handles scrolling to hash anchors when navigating to a page with a hash.
 * This is especially important when navigating from another page/screen.
 */
export function HashScrollHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasScrolledRef = useRef<string | null>(null)

  useEffect(() => {
    const scrollToHash = () => {
      // Get hash from URL
      const hash = window.location.hash
      
      if (hash) {
        // Remove the # symbol
        const id = hash.substring(1)
        
        // Don't scroll if we already scrolled to this hash
        if (hasScrolledRef.current === id) {
          return
        }
        
        // Function to perform the scroll
        const performScroll = (element: HTMLElement) => {
          const headerOffset = 120
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          })
          
          hasScrolledRef.current = id
        }

        // Try to find the element
        const findAndScroll = () => {
          // Try direct ID lookup first
          let element = document.getElementById(id)
          
          // If not found, try finding all headings and matching by various methods
          if (!element) {
            const headings = document.querySelectorAll('.documentation-content h1, .documentation-content h2, .documentation-content h3, .documentation-content h4, .documentation-content h5, .documentation-content h6')
            headings.forEach((heading) => {
              const headingId = heading.id
              // Try exact match
              if (headingId === id) {
                element = heading as HTMLElement
              }
              // Try case-insensitive match
              else if (headingId.toLowerCase() === id.toLowerCase()) {
                element = heading as HTMLElement
              }
              // Try if one contains the other
              else if (headingId && (headingId.includes(id) || id.includes(headingId))) {
                element = heading as HTMLElement
              }
            })
          }
          
          // Also try querySelector with various selectors
          if (!element) {
            element = document.querySelector(`[id="${id}"]`) as HTMLElement
          }
          if (!element) {
            element = document.querySelector(`[id*="${id}"]`) as HTMLElement
          }
          if (!element) {
            // Try case-insensitive
            const allElements = document.querySelectorAll('[id]')
            allElements.forEach((el) => {
              if (el.id.toLowerCase() === id.toLowerCase()) {
                element = el as HTMLElement
              }
            })
          }
          
          if (element) {
            performScroll(element)
            return true
          }
          return false
        }

        // Try immediately
        if (findAndScroll()) {
          return
        }

        // Use MutationObserver to watch for content
        const observer = new MutationObserver((mutations, obs) => {
          if (findAndScroll()) {
            obs.disconnect()
          }
        })

        // Observe the entire document body for changes
        observer.observe(document.body, {
          childList: true,
          subtree: true
        })

        // Also try with increasing delays
        const delays = [200, 500, 1000, 2000, 3000]
        delays.forEach((delay) => {
          setTimeout(() => {
            if (hasScrolledRef.current !== id && findAndScroll()) {
              observer.disconnect()
            }
          }, delay)
        })

        // Cleanup observer after max time
        setTimeout(() => {
          observer.disconnect()
        }, 5000)
      } else {
        // No hash, reset the ref
        hasScrolledRef.current = null
      }
    }

    // Reset when pathname changes
    hasScrolledRef.current = null

    // Wait a bit for Next.js to finish navigation
    const timeoutId = setTimeout(() => {
      scrollToHash()
    }, 50)
    
    // Also listen for hash changes
    const handleHashChange = () => {
      hasScrolledRef.current = null
      setTimeout(scrollToHash, 50)
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [pathname, searchParams])

  return null
}

