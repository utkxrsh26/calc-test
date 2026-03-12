'use client';

import { useState, useRef, useEffect } from 'react';
import ImageCropModal from './ImageCropModal';
import MDXEditorWithPreview from './MDXEditorWithPreview';

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  category?: string;
  image: string;
  file_path: string;
}

interface EditBlogModalProps {
  blog: Blog;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBlogModal({ blog, onClose, onSuccess }: EditBlogModalProps) {
  const [title, setTitle] = useState(blog.title);
  const [author, setAuthor] = useState(blog.author);
  const [category, setCategory] = useState(blog.category || '');
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(true);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  // Crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Load existing markdown content
  useEffect(() => {
    const loadMarkdownContent = async () => {
      try {
        const urlResponse = await fetch('/api/storage/public-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'DOCUMENTATIONS and BLOGS',
            path: blog.file_path,
          }),
        });

        if (urlResponse.ok) {
          const { publicUrl } = await urlResponse.json();
          const contentResponse = await fetch(publicUrl);
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            setMarkdownContent(content);
          }
        }
      } catch (error) {
        console.error('Failed to load markdown content:', error);
        setMarkdownContent('# Failed to load content\n\nPlease try again or upload a new markdown file.');
      } finally {
        setLoadingContent(false);
      }
    };

    loadMarkdownContent();
  }, [blog.file_path]);

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'cover-image.jpg', { type: 'image/jpeg' });
    setCoverImageFile(croppedFile);
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('blogSlug', blog.slug);

    const response = await fetch('/api/upload-editor-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUpdating(true);
    setMessage('');

    try {
      // Convert markdown content to a File object
      const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
      const mdFile = new File([markdownBlob], `${blog.slug}.md`, { type: 'text/markdown' });

      const formData = new FormData();
      formData.append('id', blog.id);
      formData.append('title', title);
      formData.append('author', author);
      formData.append('category', category);
      formData.append('mdFile', mdFile);

      if (coverImageFile) {
        formData.append('coverImageFile', coverImageFile);
      }

      const response = await fetch('/apis/blog/update', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('Blog updated successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        const error = await response.json();
        console.error('Update error details:', error);
        const errorMessage = error.details 
          ? `${error.error}\n\nDetails: ${JSON.stringify(error.details, null, 2)}`
          : error.error;
        setMessage(`Error: ${errorMessage}`);
        setUpdating(false);
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      setMessage('Failed to update blog');
      setUpdating(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            background: '#334155',
            borderRadius: '1rem',
            maxWidth: '1400px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid #475569',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
              Edit Blog Post
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <form id="blog-edit-form" onSubmit={handleSubmit}>
              {/* Title Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Author Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Category Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* MDX Editor with Live Preview */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Blog Content <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {loadingContent ? (
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '0.5rem',
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}>
                    <div style={{
                      display: 'inline-block',
                      width: '32px',
                      height: '32px',
                      border: '3px solid rgba(59, 130, 246, 0.3)',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    <p style={{ marginTop: '1rem' }}>Loading content...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : (
                  <MDXEditorWithPreview
                    initialContent={markdownContent}
                    onChange={setMarkdownContent}
                    onImageUpload={handleImageUpload}
                    placeholder="Start writing your blog content..."
                  />
                )}
              </div>

              {/* Replace Cover Image with Crop */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Replace Cover Image (optional)
                </label>
                {blog.image && !coverImageFile && (
                  <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
                    <img
                      src={blog.image}
                      alt="Current cover"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        borderRadius: '0.5rem',
                        border: '1px solid #475569',
                      }}
                    />
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Current cover image
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: coverImageFile ? '#16a34a' : '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{coverImageFile ? '✓' : '🖼️'}</span>
                  {coverImageFile ? 'Cover Image Updated (Click to re-crop)' : 'Upload & Crop New Cover'}
                </button>
                {coverImageFile && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Re-crop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImageFile(null);
                        if (coverImageInputRef.current) coverImageInputRef.current.value = '';
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageSelect}
                  style={{ display: 'none' }}
                />
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  ✂️ Image will open in crop editor (16:9 aspect ratio)
                </p>
              </div>

              {/* Message */}
              {message && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    background: message.includes('Error') ? '#7f1d1d' : '#065f46',
                    color: 'white',
                  }}
                >
                  {message}
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1.5rem',
              borderTop: '1px solid #475569',
              display: 'flex',
              gap: '1rem',
              background: '#1e293b',
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#475569',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                opacity: updating ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="blog-edit-form"
              disabled={updating}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: updating ? '#475569' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
              }}
            >
              {updating ? 'Updating...' : 'Update Blog'}
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && imageToCrop && (
        <ImageCropModal
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setImageToCrop(null);
            if (coverImageInputRef.current) coverImageInputRef.current.value = '';
          }}
          aspectRatio={16 / 9}
          title="Crop Cover Image"
        />
      )}
    </>
  );
}
