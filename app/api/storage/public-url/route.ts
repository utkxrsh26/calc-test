import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { bucket, path } = await request.json()

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Bucket and path are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    
    // Check if file exists first
    const { data: fileData, error: fileError } = await supabase.storage
      .from(bucket)
      .download(path)

    if (fileError) {
      console.error('File download error:', fileError)
      return NextResponse.json(
        { error: `File not found: ${fileError.message}` },
        { status: 404 }
      )
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return NextResponse.json({ publicUrl: data.publicUrl })
  } catch (error) {
    console.error('Get public URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
