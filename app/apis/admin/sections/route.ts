import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

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
 * GET /api/admin/sections
 * Fetch all sections
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    const { data, error } = await supabase
      .from('doc_sections')
      .select('*')
      .order('order_index', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data || [], { headers: corsHeaders })
  } catch (error) {
    console.error('GET /api/admin/sections error:', error)
    return NextResponse.json(
      { error: 'Failed to load sections' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/admin/sections
 * Create a new section
 */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Section name is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    // Get max order_index
    const { data: sections } = await supabase
      .from('doc_sections')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
    
    const nextOrderIndex = sections && sections.length > 0 ? sections[0].order_index + 1 : 0
    
    const { data, error } = await supabase
      .from('doc_sections')
      .insert({
        name,
        slug,
        order_index: nextOrderIndex,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data, { headers: corsHeaders })
  } catch (error) {
    console.error('POST /api/admin/sections error:', error)
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * DELETE /api/admin/sections
 * Delete a section by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    // Delete the section (documents will have their section_id set to NULL due to ON DELETE SET NULL)
    const { error } = await supabase
      .from('doc_sections')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('DELETE /api/admin/sections error:', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500, headers: corsHeaders }
    )
  }
}
