import { redirect } from 'next/navigation'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'

/**
 * Documentation Index Page
 * 
 * Redirects to the first available document.
 * If no documents are available, shows a fallback message.
 */
export default async function DocsIndexPage() {
  try {
    const source = DocsSourceFactory.getSource()
    const docs = await source.listDocs()

    if (docs.length > 0) {
      redirect(`/docs/${docs[0]}`)
    }

    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Documentation Found</h1>
          <p className="text-muted-foreground">
            Please check your documentation source configuration.
          </p>
        </div>
      </div>
    )
  } catch (error) {
    // Next.js redirect() throws a special error that we should re-throw
    // Check if it's a redirect error by looking at the digest
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = String(error.digest)
      if (digest.startsWith('NEXT_REDIRECT')) {
        // Re-throw redirect errors so Next.js can handle them
        throw error
      }
    }

    console.error('Error loading docs index:', error)

    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-500">Error Loading Documentation</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
        </div>
      </div>
    )
  }
}
