import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { 
  generateBlogFolderName, 
  sanitizeFilename, 
  replaceImagePathsWithUrls,
  extractExcerpt 
} from '@/lib/blogUtils';

export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    const formData = await request.formData();
    const mdFile = formData.get('file') as File;
    const images: File[] = [];
    
    // Get manually entered metadata from form
    const manualTitle = formData.get('title') as string | null;
    const manualAuthor = formData.get('author') as string | null;
    const coverImageFile = formData.get('coverImageFile') as File | null;

    // Collect all image files
    for (const [key, value] of formData.entries()) {
      if (key === 'images' && value instanceof File) {
        images.push(value);
      }
    }

    if (!mdFile) {
      return NextResponse.json(
        { error: 'No markdown file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!mdFile.name.toLowerCase().endsWith('.md') && !mdFile.name.toLowerCase().endsWith('.mdx')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only markdown (.md or .mdx) files are allowed.' },
        { status: 400 }
      );
    }

    // Initialize Supabase admin client
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { 
          error: 'Supabase not configured. Please set up Supabase integration.',
          hint: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
        },
        { status: 500 }
      );
    }

    // Read and parse markdown file
    const fileContent = await mdFile.text();
    const { data: frontmatter, content } = matter(fileContent);

    // Prioritize manual input over frontmatter
    const title = manualTitle || frontmatter.title || mdFile.name.replace(/\.mdx?$/, '');
    // Always prioritize form input: if provided (even if empty), use it; otherwise check frontmatter
    // FormData.get() returns empty string if field exists but is empty, null if field doesn't exist
    const author = manualAuthor !== null && manualAuthor !== undefined
      ? (manualAuthor.trim() || 'Anonymous')  // Form field was provided: use it (or 'Anonymous' if empty)
      : (frontmatter.author || 'Anonymous');   // Form field not provided: use frontmatter or default
    const publishedAt = frontmatter.date || frontmatter.published_at || new Date().toISOString();
    const excerpt = frontmatter.description || frontmatter.excerpt || extractExcerpt(content);

    // Generate unique folder name for this blog post
    const folderName = generateBlogFolderName(title);
    const slug = folderName.split('-').slice(0, -1).join('-'); // Remove random ID for slug

    const bucket = 'DOCUMENTATIONS and BLOGS';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Step 1: Upload cover image file first (if provided)
    let uploadedCoverImageUrl = '';
    if (coverImageFile) {
      const coverFilename = sanitizeFilename(coverImageFile.name);
      const coverImagePath = `BLOGS/${folderName}/cover/${coverFilename}`;
      
      const coverBuffer = await coverImageFile.arrayBuffer();
      const { error: coverUploadError } = await supabase.storage
        .from(bucket)
        .upload(coverImagePath, coverBuffer, {
          contentType: coverImageFile.type,
          upsert: true,
        });

      if (coverUploadError) {
        console.error(`Error uploading cover image:`, coverUploadError);
      } else {
        uploadedCoverImageUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${coverImagePath}`;
      }
    }

    // Step 2: Upload other images
    const uploadedImages: string[] = [];
    
    for (const imageFile of images) {
      const filename = sanitizeFilename(imageFile.name);
      const imagePath = `BLOGS/${folderName}/images/${filename}`;
      
      const imageBuffer = await imageFile.arrayBuffer();
      const { error: imageUploadError } = await supabase.storage
        .from(bucket)
        .upload(imagePath, imageBuffer, {
          contentType: imageFile.type,
          upsert: true,
        });

      if (imageUploadError) {
        console.error(`Error uploading image ${filename}:`, imageUploadError);
        // Continue with other images even if one fails
      } else {
        uploadedImages.push(filename);
      }
    }

    // Step 2: Replace image references in markdown content
    const processedContent = replaceImagePathsWithUrls(
      fileContent, // Use original content with frontmatter
      bucket,
      folderName,
      supabaseUrl
    );

    // Step 3: Upload processed markdown file
    const mdFilePath = `BLOGS/${folderName}/index.mdx`;
    const mdBuffer = Buffer.from(processedContent, 'utf8');

    const { error: mdUploadError } = await supabase.storage
      .from(bucket)
      .upload(mdFilePath, mdBuffer, {
        contentType: 'text/markdown',
        upsert: true,
      });

    if (mdUploadError) {
      console.error('Error uploading markdown file:', mdUploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload markdown file',
          details: mdUploadError.message,
        },
        { status: 500 }
      );
    }

    // Step 4: Get featured image URL
    // Priority: 1. Uploaded cover image file, 2. Frontmatter, 3. First uploaded image
    let featuredImage = uploadedCoverImageUrl || frontmatter.image || '';
    if (!featuredImage && uploadedImages.length > 0) {
      featuredImage = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/BLOGS/${folderName}/images/${uploadedImages[0]}`;
    }

    // Step 5: Insert metadata into database
    const { data: dbData, error: dbError } = await supabase
      .from('blogs')
      .insert({
        title,
        slug,
        file_path: mdFilePath,
        excerpt,
        author,
        published_at: publishedAt,
        image: featuredImage,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error inserting into database:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to save blog metadata',
          details: dbError.message,
          hint: 'Make sure the blogs table exists in your Supabase database.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post uploaded successfully',
      data: {
        id: dbData.id,
        slug,
        title,
        file_path: mdFilePath,
        images_uploaded: uploadedImages.length,
      }
    });

  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

