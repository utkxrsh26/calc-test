import { NextRequest, NextResponse } from 'next/server'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'
import { isValidSlug } from '@/lib/docs/security'

/**
 * GET /api/docs/[slug]
 * 
 * Fetches raw markdown content for a documentation page.
 * 
 * Security:
 * - Validates slug format (whitelist)
 * - Server-side only (no client exposure)
 * - Returns raw markdown (no HTML, no MDX execution)
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing the slug
 * @returns Raw markdown content or error response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Validate slug to prevent path traversal and XSS
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 }
      )
    }

    // Get the configured docs source
    const source = DocsSourceFactory.getSource()

    // Fetch markdown content
    const content = await source.getDoc(slug)

    // Return raw markdown with appropriate headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching doc:', error)

    if (error instanceof Error) {
      // Document not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Other errors
      return NextResponse.json(
        { error: error.message || 'Failed to fetch document' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

