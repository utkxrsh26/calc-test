import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const blogSlug = formData.get('blogSlug') as string;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!blogSlug) {
      return NextResponse.json({ error: 'No blog slug provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration error' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = image.name.split('.').pop();
    const filename = `${blogSlug}/images/${timestamp}.${ext}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('DOCUMENTATIONS and BLOGS')
      .upload(filename, image, {
        contentType: image.type,
        upsert: false,
      });

    if (error) {
      console.error('Image upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload image: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('DOCUMENTATIONS and BLOGS')
      .getPublicUrl(filename);

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl 
    });
  } catch (error) {
    console.error('Error uploading editor image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
