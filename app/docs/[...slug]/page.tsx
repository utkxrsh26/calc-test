import { notFound } from 'next/navigation'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'
import { MarkdownRenderer } from '@/lib/docs/renderer'
import { generateToc, extractTitle } from '@/lib/docs/toc'
import { DocsToc } from '@/components/DocsToc'

interface PageProps {
  params: Promise<{
    slug: string[]
  }>
}

/**
 * Generate static params for all available docs
 * This enables static generation at build time
 */
export async function generateStaticParams() {
  try {
    const source = DocsSourceFactory.getSource()
    const slugs = await source.listDocs()

    // Convert slugs to arrays for catch-all route
    return slugs.map((slug) => ({
      slug: slug.split('/'),
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  try {
    const { slug } = await params
    const slugString = Array.isArray(slug) ? slug.join('/') : slug
    const source = DocsSourceFactory.getSource()
    const content = await source.getDoc(slugString)
    const title = extractTitle(content) || slugString

    return {
      title: `${title} - Documentation`,
      description: `Documentation: ${title}`,
    }
  } catch (error) {
    return {
      title: 'Documentation Not Found',
    }
  }
}

/**
 * Documentation Page (Server Component)
 * 
 * Fetches markdown from the configured source and renders it securely.
 * Uses Server Components for optimal performance and security.
 * 
 * Supports nested folder paths via catch-all route [...slug]
 */
export default async function DocsPage({ params }: PageProps) {
  try {
    const { slug } = await params
    // Join array segments into a single slug string
    const slugString = Array.isArray(slug) ? slug.join('/') : slug

    // Get the configured docs source
    const source = DocsSourceFactory.getSource()

    // Fetch markdown content
    const content = await source.getDoc(slugString)

    // Generate TOC from markdown
    const toc = generateToc(content)

    // Extract title
    const title = extractTitle(content) || slugString

    return (
      <article className="w-full documentation-content" role="article">
        <MarkdownRenderer content={content} />
      </article>
    )
  } catch (error) {
    console.error('Error loading doc:', error)

    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes('not found')) {
      notFound()
    }

    // Return error UI
    return (
      <article className="w-full documentation-content" role="article">
        <div className="prose prose-invert max-w-none p-8">
          <h1 className="text-3xl font-bold text-red-500">Error Loading Document</h1>
          <p className="text-gray-300">
            There was an error loading the documentation. Please try again later.
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer text-blue-400 font-semibold">
              Show Error Details
            </summary>
            <pre className="mt-2 p-4 bg-gray-800 rounded overflow-auto text-sm text-red-300">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </article>
    )
  }
}

