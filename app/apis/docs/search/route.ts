import { NextRequest, NextResponse } from 'next/server'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'
import { isValidSlug } from '@/lib/docs/security'

/**
 * Generates a slug from heading text
 * Matches the behavior of rehype-slug (same as in toc.ts)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * GET /api/docs/search?q=query
 * 
 * Searches through documentation content for specific topics and keywords.
 * Returns documents with content matches, headings, and relevant snippets.
 * 
 * @param request - Next.js request object
 * @returns Search results with content matches
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const source = DocsSourceFactory.getSource()
    const docSlugs = await source.listDocs()
    const results: Array<{
      slug: string
      title: string
      score: number
      matches: Array<{
        type: 'heading' | 'content'
        text: string
        snippet?: string
        headingId?: string
      }>
    }> = []

    const lowerQuery = query.toLowerCase()
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0)

    // Search through each document
    for (const slug of docSlugs) {
      if (!isValidSlug(slug)) continue

      try {
        const content = await source.getDoc(slug)
        const matches: Array<{
          type: 'heading' | 'content'
          text: string
          snippet?: string
          headingId?: string
        }> = []

        // Extract title (first h1 or first line)
        const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m)
        const title = titleMatch ? titleMatch[1].trim() : slug

        // Search in headings
        const headingRegex = /^(#{1,6})\s+(.+)$/gm
        let headingMatch
        while ((headingMatch = headingRegex.exec(content)) !== null) {
          const headingText = headingMatch[2].trim()
          const headingLevel = headingMatch[1].length
          const lowerHeading = headingText.toLowerCase()

          // Check if query matches heading
          let headingScore = 0
          if (lowerHeading === lowerQuery) headingScore = 100
          else if (lowerHeading.startsWith(lowerQuery)) headingScore = 80
          else if (lowerHeading.includes(lowerQuery)) headingScore = 60
          else {
            // Check if all query words are in heading
            const allWordsMatch = queryWords.every(word => lowerHeading.includes(word))
            if (allWordsMatch) headingScore = 50
          }

          if (headingScore > 0) {
            const headingId = slugify(headingText)

            matches.push({
              type: 'heading',
              text: headingText,
              headingId,
            })
          }
        }

        // Search in content (paragraphs, excluding headings)
        const contentWithoutHeadings = content
          .split('\n')
          .filter(line => !line.trim().startsWith('#'))
          .join('\n')

        // Split into paragraphs
        const paragraphs = contentWithoutHeadings
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        for (const paragraph of paragraphs) {
          const lowerParagraph = paragraph.toLowerCase()
          
          // Check if query matches paragraph
          let contentScore = 0
          if (lowerParagraph.includes(lowerQuery)) {
            // All words match
            const allWordsMatch = queryWords.every(word => lowerParagraph.includes(word))
            if (allWordsMatch) {
              // Extract snippet (100 chars around match)
              const matchIndex = lowerParagraph.indexOf(lowerQuery)
              const start = Math.max(0, matchIndex - 50)
              const end = Math.min(paragraph.length, matchIndex + lowerQuery.length + 50)
              let snippet = paragraph.substring(start, end)
              
              if (start > 0) snippet = '...' + snippet
              if (end < paragraph.length) snippet = snippet + '...'

              matches.push({
                type: 'content',
                text: paragraph.substring(0, 100),
                snippet: snippet.trim(),
              })
            }
          }
        }

        if (matches.length > 0) {
          // Calculate document score based on matches
          const headingMatches = matches.filter(m => m.type === 'heading').length
          const contentMatches = matches.filter(m => m.type === 'content').length
          const score = headingMatches * 10 + contentMatches * 5

          results.push({
            slug,
            title,
            score,
            matches: matches.slice(0, 5), // Limit matches per document
          })
        }
      } catch (error) {
        // Skip documents that can't be read
        console.warn(`Failed to search in document ${slug}:`, error)
        continue
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score)

    return NextResponse.json(results.slice(0, 20), {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error searching docs:', error)
    return NextResponse.json(
      { error: 'Failed to search documentation' },
      { status: 500 }
    )
  }
}

