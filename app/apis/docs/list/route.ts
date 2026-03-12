import { NextResponse } from 'next/server'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface NavOrderConfig {
  order?: string[]
}

/**
 * Loads the navigation order configuration from docs/nav-order.json
 * Returns null if the file doesn't exist or is invalid
 */
async function loadNavOrderConfig(): Promise<string[] | null> {
  try {
    const configPath = join(process.cwd(), 'docs', 'nav-order.json')
    const configContent = await readFile(configPath, 'utf-8')
    const config: NavOrderConfig = JSON.parse(configContent)
    
    if (config.order && Array.isArray(config.order)) {
      return config.order
    }
    
    return null
  } catch (error) {
    // Config file doesn't exist or is invalid - that's okay, use default ordering
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    console.warn('Failed to load nav-order.json, using default ordering:', error)
    return null
  }
}

/**
 * Sorts docs according to the navigation order config
 * Items in the config order appear first, followed by items not in the config (alphabetically)
 */
function sortDocsByConfig(
  docs: Array<{ slug: string; title: string }>,
  order: string[] | null
): Array<{ slug: string; title: string }> {
  if (!order || order.length === 0) {
    // No config, return alphabetically sorted
    return docs.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  // Create a map for quick lookup
  const orderMap = new Map<string, number>()
  order.forEach((slug, index) => {
    orderMap.set(slug, index)
  })

  // Separate docs into ordered and unordered
  const ordered: Array<{ slug: string; title: string; orderIndex: number }> = []
  const unordered: Array<{ slug: string; title: string }> = []

  docs.forEach((doc) => {
    const orderIndex = orderMap.get(doc.slug)
    if (orderIndex !== undefined) {
      ordered.push({ ...doc, orderIndex })
    } else {
      unordered.push(doc)
    }
  })

  // Sort ordered docs by their index in the config
  ordered.sort((a, b) => a.orderIndex - b.orderIndex)

  // Sort unordered docs alphabetically
  unordered.sort((a, b) => a.slug.localeCompare(b.slug))

  // Combine: ordered first, then unordered
  return [...ordered.map(({ orderIndex, ...doc }) => doc), ...unordered]
}

/**
 * GET /apis/docs/list
 * 
 * Lists all available documentation slugs from the configured source.
 * This endpoint is used by the sidebar and search components.
 * 
 * The order of items can be configured via docs/nav-order.json
 */
export async function GET() {
  try {
    const source = DocsSourceFactory.getSource()
    const slugs = await source.listDocs()

    // Load navigation order config
    const navOrder = await loadNavOrderConfig()

    // Return simple list of slugs with basic metadata
    // The sidebar/search can use these to build navigation
    const docs = slugs.map((slug) => {
      // Extract just the filename part (last segment) for the title
      // e.g., "providers/overview" -> "overview"
      const filename = slug.includes('/') ? slug.split('/').pop()! : slug
      
      // Convert filename to title (e.g., "overview" -> "Overview", "api-keys" -> "Api Keys")
      const title = filename
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      return {
        slug,
        title,
      }
    })

    // Sort docs according to nav-order.json if it exists
    const sortedDocs = sortDocsByConfig(docs, navOrder)

    return NextResponse.json(sortedDocs, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error listing docs:', error)

    // Return empty array on error instead of failing
    // This allows the UI to gracefully degrade
    return NextResponse.json([], {
      status: 200, // Return 200 with empty array so UI doesn't break
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
  }
}

