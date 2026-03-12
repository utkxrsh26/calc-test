import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Cleanup orphaned storage files that don't have corresponding database entries
 * This is a utility endpoint to clean up the storage bucket
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase configuration error' },
      { status: 500 }
    );
  }

  try {
    const bucket = 'DOCUMENTATIONS and BLOGS';
    
    // Get all blogs from database
    const { data: blogs, error: dbError } = await supabase
      .from('blogs')
      .select('file_path');

    if (dbError) {
      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      );
    }

    // Get all blog slugs from database
    const dbFolders = new Set(
      (blogs || []).map(blog => {
        const parts = blog.file_path.split('/');
        return parts.slice(0, -1).join('/'); // Get folder path
      })
    );

    // List all folders in BLOGS directory
    const { data: storageList, error: listError } = await supabase.storage
      .from(bucket)
      .list('BLOGS', {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      return NextResponse.json(
        { error: listError.message },
        { status: 500 }
      );
    }

    const orphanedFolders: string[] = [];
    const foldersInStorage = storageList?.filter(item => item.id) || []; // Folders have id

    // Find orphaned folders
    for (const folder of foldersInStorage) {
      const folderPath = `BLOGS/${folder.name}`;
      if (!dbFolders.has(folderPath)) {
        orphanedFolders.push(folderPath);
      }
    }

    // Delete orphaned folders
    const deletedFolders = [];
    for (const folderPath of orphanedFolders) {
      await deleteFolder(supabase, bucket, folderPath);
      deletedFolders.push(folderPath);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedFolders.length} orphaned folders`,
      deletedFolders
    });

  } catch (error) {
    console.error('Error cleaning up storage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to recursively delete a folder
async function deleteFolder(supabase: any, bucket: string, folderPath: string) {
  const { data: fileList, error: listError } = await supabase.storage
    .from(bucket)
    .list(folderPath, {
      limit: 100,
      offset: 0,
    });

  if (listError || !fileList || fileList.length === 0) {
    return;
  }

  // Separate files and folders
  const files = fileList.filter((item: any) => !item.id);
  const folders = fileList.filter((item: any) => item.id);

  // Delete all files
  if (files.length > 0) {
    const filesToDelete = files.map((file: any) => `${folderPath}/${file.name}`);
    await supabase.storage.from(bucket).remove(filesToDelete);
  }

  // Recursively delete subfolders
  for (const subfolder of folders) {
    await deleteFolder(supabase, bucket, `${folderPath}/${subfolder.name}`);
  }
}
