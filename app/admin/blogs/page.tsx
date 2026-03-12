'use client';

import { useState, useEffect } from 'react';
import AddBlogModal from '@/components/AddBlogModal';
import EditBlogModal from '@/components/EditBlogModal';
import PreviewBlogModal from '@/components/PreviewBlogModal';
import { useRouter } from 'next/navigation';

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  published_at: string;
  category?: string;
  image: string;
  file_path: string;
  created_at: string;
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [previewBlog, setPreviewBlog] = useState<Blog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const router = useRouter();

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/apis/blog/list');
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching blogs:', {
          error: result.error,
          details: result.details,
          hint: result.hint,
          status: response.status,
        });
        // Show error to user
        alert(`Failed to load blogs: ${result.error || 'Unknown error'}\n\n${result.details ? `Details: ${result.details}` : ''}${result.hint ? `\nHint: ${result.hint}` : ''}`);
        setBlogs([]);
      } else {
        console.log('Blogs fetched successfully:', result.blogs?.length || 0, 'blogs');
        setBlogs(result.blogs || []);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      alert(`Failed to fetch blogs: ${error instanceof Error ? error.message : 'Network error'}`);
      setBlogs([]);
    }
    setLoading(false);
  };

  const fetchCurrency = async () => {
    try {
      const response = await fetch('/apis/admin/currency');
      const result = await response.json();
      if (result.success) {
        setCurrency(result.currency);
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    }
  };

  const handleCurrencyToggle = async () => {
    const newCurrency = currency === 'USD' ? 'INR' : 'USD';
    setUpdatingCurrency(true);
    
    try {
      const response = await fetch('/apis/admin/currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: newCurrency }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrency(newCurrency);
        alert(`Currency changed to ${newCurrency}. The pricing page will now display ${newCurrency}.`);
      } else {
        alert('Failed to update currency');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      alert('Failed to update currency');
    } finally {
      setUpdatingCurrency(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    fetchCurrency();
  }, []);

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this blog? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch('/apis/blog/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, filePath }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete blog');
      }

      // Refresh list
      fetchBlogs();
      alert('Blog deleted successfully!');
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert(`Failed to delete blog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownloadMD = async (blog: Blog) => {
    try {
      // Fetch the file directly from Supabase storage using admin client
      const urlResponse = await fetch('/api/storage/public-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: 'DOCUMENTATIONS and BLOGS',
          path: blog.file_path,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get file URL');
      }
      
      const { publicUrl } = await urlResponse.json();

      // Fetch the file content
      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Create a blob and download
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blog.slug}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading MD file:', error);
      alert(`Failed to download MD file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            Blog Management
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Manage all your blog posts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Currency Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#1f2937',
            borderRadius: '8px',
            border: '1px solid #374151'
          }}>
            <span style={{ color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
              Toggle Currency Displayed (in Pricing section):
            </span>
            <button
              onClick={handleCurrencyToggle}
              disabled={updatingCurrency}
              style={{
                padding: '0.5rem 1rem',
                background: currency === 'USD' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: updatingCurrency ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
                minWidth: '60px',
                opacity: updatingCurrency ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!updatingCurrency) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {updatingCurrency ? '...' : currency}
            </button>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              fontSize: '0.875rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Add New Blog</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Total Blogs
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
            {blogs.length}
          </p>
        </div>
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Published
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            {blogs.filter(b => b.published_at).length}
          </p>
        </div>
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Drafts
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {blogs.filter(b => !b.published_at).length}
          </p>
        </div>
      </div>

      {/* Blog List */}
      {loading ? (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '4px solid rgba(59, 130, 246, 0.3)',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ color: '#9ca3af' }}>Loading blogs...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : blogs.length === 0 ? (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '1.125rem' }}>
            No blogs yet. Create your first one!
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Add New Blog
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(51, 65, 85, 0.3)' }}>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    color: '#d1d5db',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Title
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    color: '#d1d5db',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Author
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    color: '#d1d5db',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    color: '#d1d5db',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Created
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'right', 
                    color: '#d1d5db',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog, index) => (
                  <tr 
                    key={blog.id}
                    style={{ 
                      borderTop: index > 0 ? '1px solid rgba(51, 65, 85, 0.5)' : 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ color: 'white', fontWeight: '500' }}>
                        {blog.title}
                      </div>
                      {blog.excerpt && (
                        <div style={{ 
                          color: '#9ca3af', 
                          fontSize: '0.875rem', 
                          marginTop: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '300px'
                        }}>
                          {blog.excerpt}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#d1d5db', fontSize: '0.875rem' }}>
                      {blog.author || 'Anonymous'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {blog.published_at ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '9999px',
                          color: '#10b981',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            background: '#10b981',
                            borderRadius: '50%'
                          }}></div>
                          Published
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '9999px',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            background: '#f59e0b',
                            borderRadius: '50%'
                          }}></div>
                          Draft
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      {formatDate(blog.created_at)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <a
                          href={`/blog/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(55, 65, 81, 0.5)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            display: 'inline-block'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(75, 85, 99, 0.5)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)'}
                        >
                          View
                        </a>
                        <button
                          onClick={() => setPreviewBlog(blog)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid #10b981',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownloadMD(blog)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                          title="Download Markdown file"
                        >
                          ⬇ MD
                        </button>
                        <button
                          onClick={() => setEditingBlog(blog)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#f59e0b',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(blog.id, blog.file_path)}
                          disabled={deletingId === blog.id}
                          style={{
                            padding: '0.5rem 1rem',
                            background: deletingId === blog.id ? '#4b5563' : '#dc2626',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: deletingId === blog.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (deletingId !== blog.id) e.currentTarget.style.background = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            if (deletingId !== blog.id) e.currentTarget.style.background = '#dc2626';
                          }}
                        >
                          {deletingId === blog.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddBlogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBlogs();
        }}
      />

      {editingBlog && (
        <EditBlogModal
          blog={editingBlog}
          onClose={() => setEditingBlog(null)}
          onSuccess={() => {
            setEditingBlog(null);
            fetchBlogs();
          }}
        />
      )}

      {previewBlog && (
        <PreviewBlogModal
          blog={previewBlog}
          onClose={() => setPreviewBlog(null)}
        />
      )}
    </div>
  );
}
