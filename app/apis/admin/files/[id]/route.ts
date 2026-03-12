import { NextRequest, NextResponse } from 'next/server'
import { deleteDoc, editDoc, downloadMdxContent, fetchAllDocs } from '@/lib/docOperations'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/files/[id]
 * Fetch a single document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const docs = await fetchAllDocs()
    const doc = docs.find(d => d.id === id)
    
    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const content = await downloadMdxContent(doc.file_path)
    
    return NextResponse.json({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      content,
      lastModified: doc.updated_at,
    })
  } catch (error) {
    console.error('GET /api/admin/files/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/files/[id]
 * Delete a document and all its files
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await deleteDoc(id)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/admin/files/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/files/[id]
 * Update a document
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    
    const title = formData.get('title') as string | null
    const content = formData.get('content') as string | null
    const mdFile = formData.get('mdFile') as File | null

    // Use content from form or read from uploaded MD file
    let mdContent = content
    if (mdFile) {
      mdContent = await mdFile.text()
    }

    // Extract image files
    const images: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        images.push(value)
      }
    }

    // Update in Supabase
    const result = await editDoc({
      id,
      title: title || undefined,
      mdContent: mdContent || undefined,
      images,
    })

    const updatedContent = mdContent || await downloadMdxContent(result.doc.file_path)

    return NextResponse.json({
      id: result.doc.id,
      slug: result.doc.slug,
      title: result.doc.title,
      content: updatedContent,
      lastModified: result.doc.updated_at,
    })
  } catch (error: any) {
    console.error('PUT /api/admin/files/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update file' },
      { status: 500 }
    )
  }
}
