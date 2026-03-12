import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error('Failed to create Supabase admin client');
      return NextResponse.json(
        { error: 'Failed to initialize database connection' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blogs:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    console.log(`Successfully fetched ${data?.length || 0} blogs`);
    return NextResponse.json({ blogs: data || [] });
  } catch (error) {
    console.error('Unexpected error in /api/blog/list:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
