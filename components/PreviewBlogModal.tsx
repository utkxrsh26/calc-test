'use client';

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string;
  description?: string;
  category?: string;
  published_at: string;
}

interface PreviewBlogModalProps {
  blog: Blog;
  onClose: () => void;
}

export default function PreviewBlogModal({ blog, onClose }: PreviewBlogModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
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
          background: '#000000',
          borderRadius: '1rem',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#0f172a',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
            Preview: {blog.title}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a
              href={`/blog/${blog.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                border: '1px solid #3b82f6',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            >
              Open in New Tab →
            </a>
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
        </div>

        {/* Preview Content (Iframe) */}
        <div style={{ flex: 1, position: 'relative' }}>
          <iframe
            src={`/blog/${blog.slug}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#000000',
            }}
            title={`Preview of ${blog.title}`}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #334155',
            background: '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {blog.category && (
              <>
                <span>Category: {blog.category}</span>
                <span style={{ margin: '0 0.5rem' }}>•</span>
              </>
            )}
            <span>By {blog.author}</span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>{new Date(blog.published_at).toLocaleDateString()}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
