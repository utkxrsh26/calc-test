'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MDXPreviewProps {
  markdown: string;
}

export default function MDXPreview({ markdown }: MDXPreviewProps) {
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #475569',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      minHeight: '400px',
      overflowY: 'auto',
      maxHeight: '600px',
    }}>
      <div className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                marginBottom: '1rem',
                marginTop: '1.5rem',
                color: '#f1f5f9',
                borderBottom: '2px solid #475569',
                paddingBottom: '0.5rem',
              }} {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.875rem',
                marginTop: '1.25rem',
                color: '#f1f5f9',
              }} {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '0.75rem',
                marginTop: '1rem',
                color: '#f1f5f9',
              }} {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 style={{ 
                fontSize: '1.125rem', 
                fontWeight: 'bold', 
                marginBottom: '0.625rem',
                marginTop: '0.875rem',
                color: '#f1f5f9',
              }} {...props} />
            ),
            p: ({ node, ...props }) => (
              <p style={{ 
                marginBottom: '1rem',
                lineHeight: '1.75',
                color: '#e2e8f0',
              }} {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul style={{ 
                marginBottom: '1rem',
                paddingLeft: '1.5rem',
                listStyleType: 'disc',
                color: '#e2e8f0',
              }} {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol style={{ 
                marginBottom: '1rem',
                paddingLeft: '1.5rem',
                listStyleType: 'decimal',
                color: '#e2e8f0',
              }} {...props} />
            ),
            li: ({ node, ...props }) => (
              <li style={{ 
                marginBottom: '0.5rem',
                lineHeight: '1.75',
              }} {...props} />
            ),
            code: ({ node, inline, ...props }: any) => 
              inline ? (
                <code style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.875em',
                }} {...props} />
              ) : (
                <code style={{
                  display: 'block',
                  background: '#0f172a',
                  color: '#94a3b8',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  overflowX: 'auto',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }} {...props} />
              ),
            pre: ({ node, ...props }) => (
              <pre style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                overflow: 'hidden',
              }} {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote style={{
                borderLeft: '3px solid #3b82f6',
                paddingLeft: '1rem',
                marginBottom: '1rem',
                color: '#cbd5e1',
                fontStyle: 'italic',
              }} {...props} />
            ),
            a: ({ node, ...props }) => (
              <a style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                cursor: 'pointer',
              }} 
              target="_blank"
              rel="noopener noreferrer"
              {...props} />
            ),
            img: ({ node, ...props }) => (
              <img style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                marginTop: '1rem',
                border: '1px solid #475569',
              }} {...props} />
            ),
            hr: ({ node, ...props }) => (
              <hr style={{
                border: 'none',
                borderTop: '2px solid #475569',
                marginTop: '2rem',
                marginBottom: '2rem',
              }} {...props} />
            ),
            table: ({ node, ...props }) => (
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  color: '#e2e8f0',
                }} {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead style={{
                background: '#0f172a',
                borderBottom: '2px solid #475569',
              }} {...props} />
            ),
            th: ({ node, ...props }) => (
              <th style={{
                padding: '0.75rem',
                textAlign: 'left',
                fontWeight: 'bold',
                border: '1px solid #475569',
              }} {...props} />
            ),
            td: ({ node, ...props }) => (
              <td style={{
                padding: '0.75rem',
                border: '1px solid #475569',
              }} {...props} />
            ),
          }}
        >
          {markdown || '*No content yet. Start writing in the editor...*'}
        </ReactMarkdown>
      </div>
    </div>
  );
}
