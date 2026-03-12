'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, FileText, Hash, BookOpen, MapPin, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Doc {
  id: string
  title: string
  slug: string
  content?: string
  section_id?: string
}

interface Section {
  id: string
  name: string
  slug: string
  order_index: number
}

interface SearchResult {
  id: string
  title: string
  slug: string
  score: number
  matchedField: 'title' | 'slug' | 'content' | 'section'
  type: 'doc' | 'section' | 'heading' | 'content-match'
  sectionName?: string
  headingId?: string
  snippet?: string
  matchText?: string
}

// Extract headings from markdown/MDX content
function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    // Create ID similar to how markdown parsers do it
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    
    headings.push({ id, text, level })
  }
  
  return headings
}

// Simple scoring function for search relevance
function calculateScore(
  item: Doc | Section,
  query: string,
  type: 'doc' | 'section',
  sectionName?: string
): SearchResult | null {
  const lowerQuery = query.toLowerCase()
  
  if (type === 'section') {
    const section = item as Section
    const lowerName = section.name.toLowerCase()
    
    let score = 0
    if (lowerName === lowerQuery) score = 95
    else if (lowerName.startsWith(lowerQuery)) score = 85
    else if (lowerName.includes(lowerQuery)) score = 65
    
    if (score === 0) return null
    
    return {
      id: section.id,
      title: section.name,
      slug: section.slug,
      score,
      matchedField: 'section',
      type: 'section'
    }
  }
  
  const doc = item as Doc
  const lowerTitle = doc.title.toLowerCase()
  const lowerSlug = doc.slug.toLowerCase()
  const lowerContent = (doc.content || '').toLowerCase()
  
  let score = 0
  let matchedField: 'title' | 'slug' | 'content' | 'section' = 'content'
  
  // Exact title match gets highest score
  if (lowerTitle === lowerQuery) {
    score = 100
    matchedField = 'title'
  }
  // Title starts with query
  else if (lowerTitle.startsWith(lowerQuery)) {
    score = 90
    matchedField = 'title'
  }
  // Title contains query
  else if (lowerTitle.includes(lowerQuery)) {
    score = 70
    matchedField = 'title'
  }
  // Slug matches
  else if (lowerSlug.includes(lowerQuery)) {
    score = 50
    matchedField = 'slug'
  }
  // Content contains query
  else if (lowerContent.includes(lowerQuery)) {
    score = 30
    matchedField = 'content'
  }
  
  if (score === 0) return null
  
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    score,
    matchedField,
    type: 'doc',
    sectionName
  }
}

// Search within headings
function searchHeadings(doc: Doc, query: string, sectionName?: string): SearchResult[] {
  const headings = extractHeadings(doc.content || '')
  const lowerQuery = query.toLowerCase()
  const results: SearchResult[] = []
  
  for (const heading of headings) {
    const lowerText = heading.text.toLowerCase()
    let score = 0
    
    if (lowerText === lowerQuery) score = 80
    else if (lowerText.startsWith(lowerQuery)) score = 75
    else if (lowerText.includes(lowerQuery)) score = 60
    
    if (score > 0) {
      results.push({
        id: `${doc.id}-${heading.id}`,
        title: `${doc.title} → ${heading.text}`,
        slug: doc.slug,
        score,
        matchedField: 'content',
        type: 'heading',
        headingId: heading.id,
        sectionName
      })
    }
  }
  
  return results
}

export function DocsSearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [docs, setDocs] = useState<Doc[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Fetch all docs from the new docs system
    async function fetchData() {
      try {
        // Try new docs API first
        const response = await fetch('/apis/docs/list')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            // Transform to match expected format
            const transformedDocs = data.map((doc: { slug: string; title: string }) => ({
              id: doc.slug,
              slug: doc.slug,
              title: doc.title,
              content: '', // Content not needed for search, can be fetched on demand
            }))
            setDocs(transformedDocs)
            localStorage.setItem('docs-cache', JSON.stringify(transformedDocs))
            localStorage.setItem('docs-cache-time', Date.now().toString())
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Failed to fetch docs from new system:', error)
      }

      // Fallback: Try old admin API (for backward compatibility)
      try {
        const response = await fetch('/apis/admin/files')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setDocs(data)
            localStorage.setItem('docs-cache', JSON.stringify(data))
            localStorage.setItem('docs-cache-time', Date.now().toString())
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        // Try to load from cache if fetch fails
        const cachedDocs = localStorage.getItem('docs-cache')
        if (cachedDocs) {
          try {
            setDocs(JSON.parse(cachedDocs))
          } catch (e) {
            console.error('Failed to parse cached docs:', e)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    // Check cache first (valid for 1 hour)
    const cachedDocs = localStorage.getItem('docs-cache')
    const cachedSections = localStorage.getItem('sections-cache')
    const cacheTime = localStorage.getItem('docs-cache-time')
    const oneHour = 60 * 60 * 1000
    
    if (cachedDocs && cacheTime && Date.now() - parseInt(cacheTime) < oneHour) {
      try {
        setDocs(JSON.parse(cachedDocs))
        if (cachedSections) {
          setSections(JSON.parse(cachedSections))
        }
        setIsLoading(false)
        // Fetch in background to update cache
        fetchData()
      } catch (e) {
        console.error('Failed to parse cache:', e)
        fetchData()
      }
    } else {
      fetchData()
    }
  }, [])

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Enhanced search that includes content search
  useEffect(() => {
    const performSearch = async () => {
      const query = searchQuery.trim()

      if (query.length < 2) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      try {
        // Use the new search API that searches content
        const response = await fetch(`/apis/docs/search?q=${encodeURIComponent(query)}`)

        if (response.ok) {
          const data = await response.json()
          const results: SearchResult[] = []

          // Transform API results to SearchResult format
          for (const docResult of data) {
            // Add heading matches
            for (const match of docResult.matches) {
              if (match.type === 'heading') {
                results.push({
                  id: `${docResult.slug}-${match.headingId}`,
                  title: `${docResult.title} → ${match.text}`,
                  slug: docResult.slug,
                  score: docResult.score + 20, // Boost heading matches
                  matchedField: 'content',
                  type: 'heading',
                  headingId: match.headingId,
                  matchText: match.text,
                })
              } else if (match.type === 'content') {
                results.push({
                  id: `${docResult.slug}-content-${results.length}`,
                  title: docResult.title,
                  slug: docResult.slug,
                  score: docResult.score,
                  matchedField: 'content',
                  type: 'content-match',
                  snippet: match.snippet,
                  matchText: match.text,
                })
              }
            }

            // If no matches but document title matches, add it
            if (docResult.matches.length === 0) {
              const lowerTitle = docResult.title.toLowerCase()
              if (lowerTitle.includes(query.toLowerCase())) {
                results.push({
                  id: docResult.slug,
                  title: docResult.title,
                  slug: docResult.slug,
                  score: 50,
                  matchedField: 'title',
                  type: 'doc',
                })
              }
            }
          }

          // Also search in local docs for title/slug matches (fallback)
          const sectionMap = new Map(sections.map(s => [s.id, s.name]))

          docs.forEach(doc => {
            const sectionName = doc.section_id ? sectionMap.get(doc.section_id) : undefined
            const lowerTitle = doc.title.toLowerCase()
            const lowerSlug = doc.slug.toLowerCase()
            const lowerQuery = query.toLowerCase()

            // Only add if not already in results
            const alreadyInResults = results.some(r => r.slug === doc.slug)
            if (!alreadyInResults && (lowerTitle.includes(lowerQuery) || lowerSlug.includes(lowerQuery))) {
              const docResult = calculateScore(doc, query, 'doc', sectionName)
              if (docResult) {
                results.push(docResult)
              }
            }
          })

          // Sort by score and limit
          results.sort((a, b) => b.score - a.score)
          setSearchResults(results.slice(0, 10))
        } else {
          // Fallback to local search if API fails
          const query = searchQuery.trim()
          const results: SearchResult[] = []
          const sectionMap = new Map(sections.map(s => [s.id, s.name]))

          docs.forEach(doc => {
            const sectionName = doc.section_id ? sectionMap.get(doc.section_id) : undefined
            const docResult = calculateScore(doc, query, 'doc', sectionName)
            if (docResult) results.push(docResult)

            const headingResults = searchHeadings(doc, query, sectionName)
            results.push(...headingResults)
          })

          results.sort((a, b) => b.score - a.score)
          setSearchResults(results.slice(0, 8))
        }
      } catch (error) {
        console.error('Search error:', error)
        // Fallback to empty results
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, docs, sections])

  // Memoized search for better performance (kept for backward compatibility)
  const filteredResults = useMemo(() => {
    return searchResults
  }, [searchResults])

  useEffect(() => {
    setIsOpen((filteredResults.length > 0 || isSearching) && searchQuery.trim() !== '')
  }, [filteredResults, searchQuery, isSearching])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
      // CMD+K or CTRL+K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        const input = searchRef.current?.querySelector('input')
        input?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setSearchQuery('')
    setIsOpen(false)
    
    // Navigate to section (show first doc in section) or doc with optional heading anchor
    if (result.type === 'section') {
      const firstDocInSection = docs.find(d => d.section_id === result.id)
      if (firstDocInSection) {
        router.push(`/docs/${firstDocInSection.slug}`)
      }
    } else if (result.type === 'heading' && result.headingId) {
      router.push(`/docs/${result.slug}#${result.headingId}`)
      // Scroll to heading after navigation
      setTimeout(() => {
        const element = document.getElementById(result.headingId!)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else {
      // Navigate to document (for content matches or regular docs)
      router.push(`/docs/${result.slug}`)
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'section':
        return <FileText size={16} />
      case 'heading':
        return <Hash size={16} />
      case 'content-match':
        return <FileText size={16} />
      default:
        return <FileText size={16} />
    }
  }

  const getMatchLabel = (result: SearchResult) => {
    if (result.type === 'section') return 'Section'
    if (result.type === 'heading') return 'Section in doc'
    
    switch (result.matchedField) {
      case 'title': return 'Title match'
      case 'slug': return 'URL match'
      case 'content': return 'Content match'
      default: return ''
    }
  }

  const getMatchIcon = (result: SearchResult) => {
    if (result.type === 'section') return <BookOpen size={14} className="text-white/60" />
    if (result.type === 'heading') return <MapPin size={14} className="text-white/60" />

    switch (result.matchedField) {
      case 'title': return <FileText size={14} className="text-white/60" />
      case 'slug': return <LinkIcon size={14} className="text-white/60" />
      case 'content': return <FileText size={14} className="text-white/60" />
      default: return null
    }
  }

  return (
    <div ref={searchRef} className="docs-search-container">
      <div className="docs-search-wrapper">
        <Search className="docs-search-icon" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (filteredResults.length > 0) setIsOpen(true)
          }}
          placeholder="Search documentation"
          className="docs-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setIsOpen(false)
            }}
            className="docs-search-clear"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && filteredResults.length > 0 && (
        <div className="docs-search-results">
          {filteredResults.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="docs-search-result-item"
            >
              {getResultIcon(result.type)}
              <div className="docs-search-result-content">
                <span className="docs-search-result-title">{result.title}</span>
                {result.snippet && (
                  <span className="docs-search-result-snippet">{result.snippet}</span>
                )}
                {result.matchText && !result.snippet && (
                  <span className="docs-search-result-snippet">{result.matchText.substring(0, 100)}...</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchQuery && filteredResults.length === 0 && !isLoading && (
        <div className="docs-search-results">
          <div className="docs-search-no-results">
            No results found for "{searchQuery}"
          </div>
        </div>
      )}

      {(isLoading || isSearching) && searchQuery && (
        <div className="docs-search-results">
          <div className="docs-search-loading">
            Searching...
          </div>
        </div>
      )}
    </div>
  )
}
