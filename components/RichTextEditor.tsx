'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  onImageUpload,
  placeholder = 'Start writing your blog content...' 
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Convert HTML to Markdown-like format
      const markdown = convertToMarkdown(editor.getHTML());
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== convertToMarkdown(editor.getHTML())) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const convertToMarkdown = (html: string): string => {
    let markdown = html;
    
    // Convert headings
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
    markdown = markdown.replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n');
    
    // Convert paragraphs
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');
    
    // Convert bold and italic
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
    
    // Convert links
    markdown = markdown.replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)');
    
    // Convert images
    markdown = markdown.replace(/<img src="(.*?)".*?alt="(.*?)".*?>/g, '![$2]($1)');
    
    // Convert code blocks
    markdown = markdown.replace(/<pre><code class="language-(.*?)">([\s\S]*?)<\/code><\/pre>/g, '```$1\n$2\n```\n\n');
    markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```\n\n');
    
    // Convert inline code
    markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');
    
    // Convert lists
    markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '- $1\n') + '\n';
    });
    markdown = markdown.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n';
    });
    
    // Convert blockquotes
    markdown = markdown.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, content) => {
      return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
    });
    
    // Convert horizontal rule
    markdown = markdown.replace(/<hr\s*\/?>/g, '---\n\n');
    
    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&quot;/g, '"');
    
    // Clean up extra newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImageUpload) {
        try {
          const url = await onImageUpload(file);
          editor?.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error('Failed to upload image:', error);
          alert('Failed to upload image');
        }
      }
    };
    input.click();
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div style={{ 
      background: '#1e293b', 
      border: '1px solid #475569', 
      borderRadius: '0.5rem',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        padding: '0.75rem',
        borderBottom: '1px solid #475569',
        background: '#0f172a',
      }}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          {'</>'}
        </ToolbarButton>
        
        <div style={{ width: '1px', background: '#475569', margin: '0 0.25rem' }} />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        
        <div style={{ width: '1px', background: '#475569', margin: '0 0.25rem' }} />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          ≡
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          1.
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          "
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {'{ }'}
        </ToolbarButton>
        
        <div style={{ width: '1px', background: '#475569', margin: '0 0.25rem' }} />
        
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          🔗
        </ToolbarButton>
        
        {onImageUpload && (
          <ToolbarButton
            onClick={handleImageUpload}
            isActive={false}
            title="Upload Image"
          >
            🖼️
          </ToolbarButton>
        )}
        
        <div style={{ width: '1px', background: '#475569', margin: '0 0.25rem' }} />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal Line"
        >
          ―
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          ↶
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          ↷
        </ToolbarButton>
      </div>
      
      {/* Editor Content */}
      <EditorContent editor={editor} />
      
      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
          padding: 1rem;
          color: #e2e8f0;
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #64748b;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
          color: #f1f5f9;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.875rem 0;
          color: #f1f5f9;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.75rem 0;
          color: #f1f5f9;
        }
        
        .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: bold;
          margin: 0.625rem 0;
          color: #f1f5f9;
        }
        
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        
        .ProseMirror code {
          background: #0f172a;
          color: #38bdf8;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        .ProseMirror pre {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: #94a3b8;
        }
        
        .ProseMirror blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #cbd5e1;
          font-style: italic;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .ProseMirror a:hover {
          color: #60a5fa;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #475569;
          margin: 2rem 0;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({ 
  onClick, 
  isActive, 
  disabled = false, 
  children, 
  title 
}: { 
  onClick: () => void; 
  isActive: boolean; 
  disabled?: boolean; 
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '0.5rem 0.75rem',
        background: isActive ? '#3b82f6' : disabled ? '#0f172a' : '#1e293b',
        color: disabled ? '#475569' : 'white',
        border: '1px solid #475569',
        borderRadius: '0.25rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '2rem',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = '#334155';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = '#1e293b';
        }
      }}
    >
      {children}
    </button>
  );
}
