import { redirect } from 'next/navigation'
import { DocsSourceFactory } from '@/lib/docs/DocsSourceFactory'

/**
 * Documentation Page
 * 
 * Redirects to the first available document using the new documentation system.
 * This is an alias for /docs that uses the same source configuration.
 */
export default async function DocumentationPage() {
  try {
    const source = DocsSourceFactory.getSource()
    const docs = await source.listDocs()

    // Redirect to the first document if available
    if (docs.length > 0) {
      redirect(`/docs/${docs[0]}`)
    }

    // Fallback if no documents are found
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

    console.error('Error loading documentation:', error)

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
