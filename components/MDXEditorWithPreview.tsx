'use client';

import { useState } from 'react';
import RichTextEditor from './RichTextEditor';
import MDXPreview from './MDXPreview';

interface MDXEditorWithPreviewProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

export default function MDXEditorWithPreview({
  initialContent,
  onChange,
  onImageUpload,
  placeholder,
}: MDXEditorWithPreviewProps) {
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split');

  const handleContentChange = (markdown: string) => {
    setContent(markdown);
    onChange(markdown);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Tab Controls */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '2px solid #475569',
        paddingBottom: '0.5rem',
      }}>
        <TabButton
          active={activeTab === 'edit'}
          onClick={() => setActiveTab('edit')}
        >
          ✏️ Edit
        </TabButton>
        <TabButton
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </TabButton>
        <TabButton
          active={activeTab === 'split'}
          onClick={() => setActiveTab('split')}
        >
          ⚡ Split View
        </TabButton>
      </div>

      {/* Content Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: activeTab === 'split' ? '1fr 1fr' : '1fr',
        gap: '1rem',
      }}>
        {/* Editor */}
        {(activeTab === 'edit' || activeTab === 'split') && (
          <div>
            {activeTab === 'split' && (
              <h3 style={{
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Editor
              </h3>
            )}
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              onImageUpload={onImageUpload}
              placeholder={placeholder}
            />
          </div>
        )}

        {/* Preview */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div>
            {activeTab === 'split' && (
              <h3 style={{
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Preview
              </h3>
            )}
            <MDXPreview markdown={content} />
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '0.5rem',
        color: '#94a3b8',
        fontSize: '0.875rem',
      }}>
        <strong style={{ color: '#3b82f6' }}>💡 Tip:</strong> Use the toolbar for rich formatting, 
        or write in Markdown directly. The preview shows exactly how your content will appear to readers.
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: active ? '#3b82f6' : 'transparent',
        color: active ? 'white' : '#94a3b8',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
          e.currentTarget.style.color = '#60a5fa';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#94a3b8';
        }
      }}
    >
      {children}
    </button>
  );
}
