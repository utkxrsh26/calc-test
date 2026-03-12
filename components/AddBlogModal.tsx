'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCropModal from './ImageCropModal';
import MDXEditorWithPreview from './MDXEditorWithPreview';

interface AddBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBlogModal({ isOpen, onClose, onSuccess }: AddBlogModalProps) {
  const [markdownContent, setMarkdownContent] = useState('# New Blog Post\n\nStart writing your content here...');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [slug, setSlug] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug if not manually edited
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (imageFiles.length !== files.length) {
        setError('Some files were not images and were ignored');
      } else {
        setError('');
      }
      
      setSelectedImages(prev => [...prev, ...imageFiles]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // For new blogs, we'll use a temporary slug or title-based path
    const tempSlug = slug || 'temp-blog';
    const formData = new FormData();
    formData.append('image', file);
    formData.append('blogSlug', tempSlug);

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
    
    if (!markdownContent.trim()) {
      setError('Please write some content for the blog post');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the blog post');
      return;
    }

    if (!slug.trim()) {
      setError('Please enter a slug for the blog post');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      // Create markdown file from content
      const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
      const mdFile = new File([markdownBlob], `${slug}.md`, { type: 'text/markdown' });

      const formData = new FormData();
      formData.append('file', mdFile);
      
      // Append metadata
      formData.append('title', title.trim());
      formData.append('author', author.trim());

      // Append cover image file if uploaded
      if (coverImageFile) {
        formData.append('coverImageFile', coverImageFile);
      }

      // Append all images
      selectedImages.forEach(image => {
        formData.append('images', image);
      });

      const response = await fetch('/apis/blog/create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload blog post');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset all fields
        setMarkdownContent('# New Blog Post\n\nStart writing your content here...');
        setSelectedImages([]);
        setTitle('');
        setAuthor('');
        setSlug('');
        setCoverImageFile(null);
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
        if (coverImageInputRef.current) {
          coverImageInputRef.current.value = '';
        }
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag-and-drop handlers removed - now using MDX editor

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={onClose}
          >
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{
              background: '#334155',
              borderRadius: '16px',
              padding: '0',
              width: '100%',
              maxWidth: '1400px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9999,
              border: '1px solid rgba(71, 85, 105, 0.5)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid rgba(71, 85, 105, 0.5)'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: 'white',
                margin: 0
              }}>
                Upload Blog Post
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem'
            }}>
              <form onSubmit={handleSubmit} id="blog-upload-form">
                {/* Title Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="blog-title"
                    style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                  id="blog-title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter blog post title"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.5)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                  }}
                  />
                </div>

                {/* Author Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="blog-author"
                    style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Author
                  </label>
                  <input
                id="blog-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.5)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                  }}
                  />
                </div>

                {/* Slug Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="blog-slug"
                    style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Slug <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                id="blog-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="blog-post-url"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.5)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                  }}
                  />
                  <p style={{ 
                    color: '#9ca3af', 
                    fontSize: '0.75rem', 
                    marginTop: '0.25rem' 
                  }}>
                    Auto-generated from title, but you can edit it
                  </p>
                </div>

                {/* Cover Image File Upload with Crop */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="cover-image-label"
                    style={{ 
                      display: 'block', 
                      color: 'white', 
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Cover Image
                  </label>
                  
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    id="cover-image-upload"
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="cover-image-upload"
                    style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: coverImageFile ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                  border: coverImageFile ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  color: coverImageFile ? '#10b981' : '#6366f1',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  justifyContent: 'center',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={(e) => {
                  if (coverImageFile) {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.borderColor = '#10b981';
                  } else {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (coverImageFile) {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  } else {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                  }
                }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {coverImageFile ? (
                        <>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </>
                      ) : (
                        <>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </>
                      )}
                    </svg>
                    {coverImageFile ? `✓ Cover Image Cropped` : 'Upload & Crop Cover Image'}
                  </label>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    ✂️ Image will open in crop editor (16:9 aspect ratio)
                  </p>
                  {coverImageFile && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => coverImageInputRef.current?.click()}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                        }}
                      >
                        Re-crop
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageFile(null);
                          if (coverImageInputRef.current) {
                            coverImageInputRef.current.value = '';
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* MDX Editor with Live Preview */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'white', 
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem'
                  }}>
                    Blog Content <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                      <MDXEditorWithPreview
                    initialContent={markdownContent}
                    onChange={setMarkdownContent}
                    onImageUpload={handleImageUpload}
                    placeholder="Start writing your blog content..."
                  />
                </div>

                {/* Info Message */}
                <div
                  style={{
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}
                >
                  <p style={{ 
                    color: '#9ca3af', 
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    <strong style={{ color: '#3b82f6' }}>💡 Tip:</strong> Use the rich text editor to write and format your content. 
                    Upload images directly from the editor toolbar, and use split view for live preview.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#10b981',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Blog post created successfully! Redirecting...
                </div>
              )}

              {/* Info Footer */}
              <div style={{
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#9ca3af'
              }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong style={{ color: '#3b82f6' }}>📝 Note:</strong> Your markdown file and images will be uploaded to Supabase Storage.
                </p>
                <p style={{ margin: 0 }}>
                  Make sure your markdown file has proper frontmatter (title, date, author, description) at the top.
                </p>
                </div>
              </form>
            </div>

            {/* Footer with Action Buttons */}
            <div style={{ 
              padding: '1.5rem 2rem',
              borderTop: '1px solid rgba(71, 85, 105, 0.5)',
              background: 'rgba(30, 41, 59, 0.5)'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(55, 65, 81, 0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) e.currentTarget.style.background = 'rgba(75, 85, 99, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="blog-upload-form"
                  disabled={isSubmitting || success || !title.trim() || !markdownContent.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: (!title.trim() || !markdownContent.trim() || isSubmitting || success) 
                      ? 'rgba(59, 130, 246, 0.5)' 
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (!title.trim() || !markdownContent.trim() || isSubmitting || success) ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && !success && title.trim() && markdownContent.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      Uploading...
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </>
                  ) : success ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Success!
                    </>
                  ) : (
                    'Upload Blog Post'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
      
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
    </AnimatePresence>
  );
}

