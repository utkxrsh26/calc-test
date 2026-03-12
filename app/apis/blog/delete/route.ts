import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase configuration error' },
      { status: 500 }
    );
  }

  try {
    const { id, filePath } = await request.json();

    if (!id || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields: id and filePath' },
        { status: 400 }
      );
    }

    // Extract folder from file_path
    // filePath could be like: BLOGS/my-post-abc123/index.mdx
    const pathParts = filePath.split('/');
    const bucket = 'DOCUMENTATIONS and BLOGS';
    
    // Get the blog folder (e.g., BLOGS/my-post-abc123)
    let folder = pathParts.slice(0, -1).join('/');
    
    console.log('Deleting blog folder:', folder);

    // Helper function to recursively delete all files in a folder
    const deleteFolder = async (folderPath: string) => {
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucket)
        .list(folderPath, {
          limit: 100,
          offset: 0,
        });

      if (listError) {
        console.error(`Error listing ${folderPath}:`, listError);
        return;
      }

      if (!fileList || fileList.length === 0) {
        console.log(`No files in ${folderPath}`);
        return;
      }

      // Separate files and folders
      const files = fileList.filter(item => !item.id); // Files don't have id
      const folders = fileList.filter(item => item.id); // Folders have id

      // Delete all files in current folder
      if (files.length > 0) {
        const filesToDelete = files.map(file => `${folderPath}/${file.name}`);
        console.log('Deleting files:', filesToDelete);
        
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filesToDelete);

        if (deleteError) {
          console.error('Error deleting files:', deleteError);
        }
      }

      // Recursively delete subfolders
      for (const subfolder of folders) {
        await deleteFolder(`${folderPath}/${subfolder.name}`);
      }
    };

    // Delete the entire blog folder recursively
    await deleteFolder(folder);

    // Step 4: Delete from database
    const { error: dbError } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
