import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const mdFile = formData.get('mdFile') as File | null;
    const coverImageFile = formData.get('coverImageFile') as File | null;
    const manualTitle = formData.get('title') as string;
    const manualAuthor = formData.get('author') as string;
    const manualCategory = formData.get('category') as string;

    if (!id) {
      return NextResponse.json({ error: 'No blog ID provided' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration error' },
        { status: 500 }
      );
    }

    // Get existing blog data
    const { data: existingBlog, error: fetchError } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingBlog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    let filePath = existingBlog.file_path;
    let coverImageUrl = existingBlog.image;

    // If new markdown file is uploaded, replace it
    if (mdFile) {
      console.log('Attempting to update markdown file...');
      console.log('File details:', {
        name: mdFile.name,
        type: mdFile.type,
        size: mdFile.size,
        filePath: filePath
      });

      // Read the file and create a proper markdown blob
      // This is needed because the browser may detect .md files as application/octet-stream
      const fileBuffer = await mdFile.arrayBuffer();
      const markdownBlob = new Blob([fileBuffer], { 
        type: 'text/markdown'
      });
      
      console.log('Created markdown blob with type:', markdownBlob.type);

      // Upload with upsert to replace existing file
      const { data: uploadData, error: mdUploadError } = await supabase.storage
        .from('DOCUMENTATIONS and BLOGS')
        .upload(filePath, markdownBlob, { 
          contentType: 'text/markdown',
          upsert: true
        });

      if (mdUploadError) {
        console.error('Error updating markdown file:', {
          message: mdUploadError.message,
          error: mdUploadError
        });
        return NextResponse.json({ 
          error: `Failed to update markdown file: ${mdUploadError.message}. Please go to Supabase Dashboard → Storage → "DOCUMENTATIONS and BLOGS" → Settings → Allowed MIME types and add "text/markdown".`,
          details: {
            originalError: mdUploadError.message,
            blobType: markdownBlob.type,
            suggestion: 'Add "text/markdown" to allowed MIME types in Supabase bucket settings'
          }
        }, { status: 500 });
      }

      console.log('Markdown file updated successfully:', uploadData);
    }

    // If new cover image is uploaded, replace it
    if (coverImageFile) {
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const coverImagePath = `${folderPath}/cover/${coverImageFile.name}`;
      
      const { error: coverUploadError } = await supabase.storage
        .from('DOCUMENTATIONS and BLOGS')
        .upload(coverImagePath, coverImageFile, { upsert: true });

      if (!coverUploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('DOCUMENTATIONS and BLOGS')
          .getPublicUrl(coverImagePath);
        coverImageUrl = publicUrlData.publicUrl;
      }
    }

    // Update database record
    const { error: dbError } = await supabase
      .from('blogs')
      .update({
        title: manualTitle || existingBlog.title,
        author: manualAuthor || existingBlog.author,
        category: manualCategory || existingBlog.category,
        image: coverImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (dbError) {
      console.error('Error updating database:', dbError);
      return NextResponse.json({ error: 'Failed to update blog metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug: existingBlog.slug });
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Failed to update blog' }, { status: 500 });
  }
}
