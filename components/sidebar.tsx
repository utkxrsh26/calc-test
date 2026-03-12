'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  FileText,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Doc {
  id: string
  title: string
  slug: string
  file_path: string
  section_id?: string
  created_at: string
  updated_at: string
}

interface Section {
  id: string
  name: string
  slug: string
  order_index: number
}

export function Sidebar() {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<string[]>([])
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const sidebarRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  useEffect(() => {
    // Fetch documents from the new docs system
    async function fetchData() {
      try {
        // Try new docs API first
        const docsResponse = await fetch('/apis/docs/list')
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          if (Array.isArray(docsData)) {
            // Transform to match expected format
            const transformedDocs = docsData.map((doc: { slug: string; title: string }) => ({
              id: doc.slug,
              slug: doc.slug,
              title: doc.title,
              file_path: '',
              created_at: '',
              updated_at: '',
            }))
            setDocs(transformedDocs)
            setSections([]) // New system doesn't use sections
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Failed to fetch docs from new system:', error)
      }

      // Fallback: Try old admin API (for backward compatibility)
      try {
        // Try to fetch sections (may fail if Supabase is not configured)
        try {
          const sectionsResponse = await fetch('/apis/admin/sections')
          if (sectionsResponse.ok) {
            const sectionsData = await sectionsResponse.json()
            if (Array.isArray(sectionsData)) {
              setSections(sectionsData)
              setOpenSections(sectionsData.map((s: Section) => s.id))
            }
          }
        } catch (error) {
          // Sections not available - that's okay, we'll show flat list
          console.warn('Sections not available:', error)
          setSections([])
        }

        const docsResponse = await fetch('/apis/admin/files')
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          if (Array.isArray(docsData)) {
            setDocs(docsData)
          } else {
            setDocs([])
          }
        } else {
          setDocs([])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setDocs([])
        setSections([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    // Auto-expand sections/folders containing current path
    const currentDoc = docs.find((doc) => `/docs/${doc.slug}` === pathname)

    // Handle old section-based system
    if (currentDoc?.section_id && !openSections.includes(currentDoc.section_id)) {
      setOpenSections((prev) => [...prev, currentDoc.section_id!])
    }

    // Handle new folder-based system (nested slugs)
    if (currentDoc && currentDoc.slug.includes('/')) {
      const pathParts = currentDoc.slug.split('/')
      // Auto-expand all parent folders
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/')
        if (!openSections.includes(folderPath)) {
          setOpenSections((prev) => [...prev, folderPath])
        }
      }
    }
  }, [pathname, docs, openSections])

  // Swipe gesture handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isDragging.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return
      
      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const deltaX = touchX - touchStartX.current
      const deltaY = touchY - touchStartY.current
      
      // Check if it's a horizontal swipe (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging.current = true
        
        // Swipe from left edge (first 20px) to open
        if (touchStartX.current < 20 && deltaX > 30 && !isMobileOpen) {
          e.preventDefault()
          setIsMobileOpen(true)
        }
        
        // Swipe left to close (from anywhere when sidebar is open)
        if (isMobileOpen && deltaX < -50) {
          e.preventDefault()
          setIsMobileOpen(false)
        }
      }
    }

    const handleTouchEnd = () => {
      touchStartX.current = 0
      touchStartY.current = 0
      isDragging.current = false
    }

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobileOpen])

  // Close sidebar when clicking overlay
  useEffect(() => {
    const handleOverlayClick = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        setIsMobileOpen(false)
      }
    }

    if (isMobileOpen) {
      document.addEventListener('click', handleOverlayClick)
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('click', handleOverlayClick)
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Group documents by section (for old system)
  const getDocsForSection = (sectionId: string) => {
    return docs.filter(doc => doc.section_id === sectionId)
  }

  // Get documents without a section (orphaned/root docs)
  const rootDocs = docs.filter(doc => !doc.section_id)

  // Build folder tree structure from nested slugs
  interface FolderNode {
    name: string
    path: string
    docs: Doc[]
    children: Map<string, FolderNode>
    folderOrder: string[] // Track order of folders as they appear
  }

  const buildFolderTree = (): FolderNode => {
    const root: FolderNode = {
      name: 'root',
      path: '',
      docs: [],
      children: new Map(),
      folderOrder: [],
    }

    docs.forEach((doc) => {
      // Skip docs that belong to old section system
      if (doc.section_id) return

      if (doc.slug.includes('/')) {
        // Nested path: split and build tree
        const parts = doc.slug.split('/')
        const fileName = parts[parts.length - 1]
        const folderPath = parts.slice(0, -1).join('/')

        let current = root
        const pathParts = parts.slice(0, -1)

        // Navigate/create folder structure
        for (const part of pathParts) {
          if (!current.children.has(part)) {
            const folderPath = current.path ? `${current.path}/${part}` : part
            current.children.set(part, {
              name: part,
              path: folderPath,
              docs: [],
              children: new Map(),
              folderOrder: [],
            })
            // Track folder order
            if (!current.folderOrder.includes(part)) {
              current.folderOrder.push(part)
            }
          }
          current = current.children.get(part)!
        }

        // Add doc to the appropriate folder (preserve order from docs array)
        current.docs.push(doc)
      } else {
        // Root-level doc
        root.docs.push(doc)
      }
    })

    return root
  }

  // Render folder tree recursively
  const renderFolderTree = (node: FolderNode, level: number = 0): ReactNode => {
    const items: ReactNode[] = []

    // Use folder order from config, fallback to alphabetical if not configured
    const folderEntries: Array<[string, FolderNode]> = node.folderOrder.length > 0
      ? node.folderOrder
        .map((name): [string, FolderNode] | null => {
          const folderNode = node.children.get(name)
          return folderNode ? [name, folderNode] : null
        })
        .filter((entry): entry is [string, FolderNode] => entry !== null)
      : Array.from(node.children.entries()).sort(([a], [b]) => a.localeCompare(b))

    // Preserve docs order from API (already sorted by config), don't re-sort
    const orderedDocs = node.docs

    // Render folders
    folderEntries.forEach(([folderName, folderNode]) => {
      const isOpen = openSections.includes(folderNode.path)
      const hasActiveChild =
        folderNode.docs.some((doc: Doc) => `/docs/${doc.slug}` === pathname) ||
        Array.from(folderNode.children.values()).some((child: FolderNode) =>
          child.docs.some((doc: Doc) => `/docs/${doc.slug}` === pathname) ||
          Array.from(child.children.values()).some((grandchild: FolderNode) =>
            grandchild.docs.some((doc: Doc) => `/docs/${doc.slug}` === pathname)
          )
        )

      items.push(
        <div key={folderNode.path} className="space-y-1">
          <button
            onClick={() => toggleSection(folderNode.path)}
            className={cn(
              'w-full flex items-center justify-between text-white/80 hover:bg-white/5 transition-all duration-150',
              hasActiveChild && 'text-white'
            )}
            style={{
              height: '36px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '2px',
              paddingLeft: `${16 + level * 12}px`,
              paddingRight: '12px'
            }}
          >
            <span>{folderName.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-150',
                isOpen && 'rotate-90'
              )}
            />
          </button>

          {isOpen && (
            <div className="space-y-1">
              {/* Render nested folders and docs */}
              {renderFolderTree(folderNode, level + 1)}
            </div>
          )}
        </div>
      )
    })

    // Render docs in current folder (preserve order from API/config)
    orderedDocs.forEach((doc) => {
      const isActive = `/docs/${doc.slug}` === pathname
      items.push(
        <Link
          key={doc.id}
          href={`/docs/${doc.slug}`}
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            'block px-3 truncate transition-all duration-150',
            isActive
              ? 'text-white font-medium'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
          )}
          style={isActive ? {
            paddingLeft: `${16 + level * 12}px`,
            fontSize: '14px',
            fontWeight: 500,
            height: '32px',
            lineHeight: '32px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%)',
          } : {
            paddingLeft: `${16 + level * 12}px`,
            fontSize: '14px',
            fontWeight: 500,
            height: '32px',
            lineHeight: '32px',
            borderRadius: '2px'
          }}
        >
          {doc.title}
        </Link>
      )
    })

    return <>{items}</>
  }

  const folderTree = buildFolderTree()

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-[rgba(30,41,59,0.9)] backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg transition-all hover:bg-[rgba(30,41,59,1)]"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          ref={overlayRef}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed top-0 left-0 h-screen z-40 border-r border-white/10 overflow-y-auto sidebar-modern transition-transform duration-300 ease-out',
          'lg:block lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          width: '280px',
          background: 'linear-gradient(180deg, rgba(2, 119, 255, 0.15) 0%, rgba(2, 119, 255, 0.02) 100%)',
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
          touchStartY.current = e.touches[0].clientY
        }}
        onTouchMove={(e) => {
          if (!touchStartX.current || !touchStartY.current) return
          const deltaX = e.touches[0].clientX - touchStartX.current
          const deltaY = e.touches[0].clientY - touchStartY.current
          
          // Swipe left to close from within sidebar
          if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50 && isMobileOpen) {
            setIsMobileOpen(false)
          }
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header with Logo and Title */}
          <div className="border-b border-white/10" style={{ paddingTop: '24px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px' }}>
            <div className="flex items-center gap-3">
              <Image 
                src="/logo-navbar.svg" 
                alt="Codity Logo" 
                width={36} 
                height={36}
                className="shrink-0"
              />
              <h1 className="text-xl font-semibold text-white">Codity Docs</h1>
            </div>
          </div>

          <nav className="flex-1 space-y-1" style={{ paddingTop: '32px', paddingLeft: '24px', paddingRight: '24px' }}>
            {loading ? (
              <div className="px-3 py-2 text-sm text-white/50 animate-pulse">
                Loading sections...
              </div>
            ) : (
              <>
                {/* Render sections with their documents */}
                {sections.map((section) => {
                  const isOpen = openSections.includes(section.id)
                  const sectionDocs = getDocsForSection(section.id)
                  const hasActiveChild = sectionDocs.some(
                    (doc) => `/docs/${doc.slug}` === pathname
                  )

                  return (
                    <div key={section.id} className="space-y-1">
                      {/* Level 1: Section */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={cn(
                          'w-full flex items-center justify-between text-white/80 hover:bg-white/5 transition-all duration-150',
                          hasActiveChild && 'text-white'
                        )}
                        style={{
                          height: '36px',
                          fontSize: '15px',
                          fontWeight: 600,
                          borderRadius: '2px',
                          paddingLeft: '16px',
                          paddingRight: '12px'
                        }}
                      >
                        <span>{section.name}</span>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-150',
                            isOpen && 'rotate-90'
                          )}
                        />
                      </button>

                      {/* Level 2: Documents in this section */}
                      {isOpen && (
                        <div className="space-y-1">
                          {sectionDocs.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-white/50" style={{ paddingLeft: '24px' }}>
                              No documents in this section
                            </div>
                          ) : (
                            sectionDocs.map((doc) => {
                              const isActive = `/docs/${doc.slug}` === pathname
                              return (
                                <Link
                                  key={doc.id}
                                  href={`/docs/${doc.slug}`}
                                  onClick={() => setIsMobileOpen(false)}
                                  className={cn(
                                    'block px-3 truncate transition-all duration-150',
                                    isActive
                                      ? 'text-white font-medium'
                                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                                  )}
                                  style={isActive ? {
                                    paddingLeft: '24px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    height: '32px',
                                    lineHeight: '32px',
                                    borderRadius: '2px',
                                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%)',
                                  } : {
                                    paddingLeft: '24px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    height: '32px',
                                    lineHeight: '32px',
                                    borderRadius: '2px'
                                  }}
                                >
                                  {doc.title}
                                </Link>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                  {/* Render folder-based structure (new system) */}
                  {sections.length === 0 && renderFolderTree(folderTree)}

                  {/* Render root documents (without section) if any exist (old system) */}
                  {sections.length > 0 && rootDocs.length > 0 && (
                    <div className="space-y-1" >
                    <div className="px-3 text-white/60 text-xs font-medium uppercase tracking-wider" style={{ height: '32px', lineHeight: '32px' }}>
                      Other Documents
                    </div>
                    {rootDocs.map((doc) => {
                      const isActive = `/docs/${doc.slug}` === pathname
                      return (
                        <Link
                          key={doc.id}
                          href={`/docs/${doc.slug}`}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'block px-3 truncate transition-all duration-150',
                            isActive
                              ? 'text-white font-medium'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          )}
                          style={isActive ? {
                            paddingLeft: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            height: '32px',
                            lineHeight: '32px',
                            borderRadius: '2px',
                            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%)',
                          } : {
                            paddingLeft: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            height: '32px',
                            lineHeight: '32px',
                            borderRadius: '2px'
                          }}
                        >
                          {doc.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  )
}
