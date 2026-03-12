import { NextRequest, NextResponse } from 'next/server'
import { fetchAllDocs, uploadDoc, downloadMdxContent } from '@/lib/docOperations'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/admin/files
 * Fetch all documents from Supabase
 */
export async function GET() {
  try {
    const docs = await fetchAllDocs()
    
    // Fetch content for each doc
    const docsWithContent = await Promise.all(
      docs.map(async (doc: any) => {
        try {
          const content = await downloadMdxContent(doc.file_path)
          return {
            id: doc.id,
            slug: doc.slug,
            title: doc.title,
            content,
            lastModified: doc.updated_at,
            section_id: doc.section_id,
            section_name: doc.section_name,
          }
        } catch (error) {
          console.error(`Failed to fetch content for ${doc.slug}:`, error)
          return {
            id: doc.id,
            slug: doc.slug,
            title: doc.title,
            content: '',
            lastModified: doc.updated_at,
            section_id: doc.section_id,
            section_name: doc.section_name,
          }
        }
      })
    )
    
    return NextResponse.json(docsWithContent, { headers: corsHeaders })
  } catch (error) {
    console.error('GET /api/admin/files error:', error)
    return NextResponse.json(
      { error: 'Failed to load files' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/admin/files
 * Create a new document with optional images
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const mdFile = formData.get('mdFile') as File | null
    const section_id = formData.get('section_id') as string | null

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Use content from form or read from uploaded MD file
    let mdContent = content
    if (mdFile) {
      mdContent = await mdFile.text()
    }

    if (!mdContent) {
      return NextResponse.json(
        { error: 'Content or MD file is required' },
        { status: 400 }
      )
    }

    // Extract image files
    const images: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        images.push(value)
      }
    }

    // Upload to Supabase
    const result = await uploadDoc({
      title,
      mdContent,
      images,
      section_id: section_id || undefined,
    })

    return NextResponse.json(
      {
        id: result.doc.id,
        slug: result.doc.slug,
        title: result.doc.title,
        content: mdContent,
        lastModified: result.doc.created_at,
        imageCount: result.imageCount,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/admin/files error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create file' },
      { status: 500 }
    )
  }
}
