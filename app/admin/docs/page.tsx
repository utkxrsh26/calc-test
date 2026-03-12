'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, FileText, Search, X, Upload, Image as ImageIcon, Edit } from 'lucide-react'
import { MDXPreview } from '@/components/mdx-preview'

interface DocFile {
  id: string
  slug: string
  title: string
  content: string
  lastModified: string
  section_id?: string
  section_name?: string
}

interface Section {
  id: string
  name: string
  slug: string
  order_index: number
}

export default function AdminDocsPage() {
  const [files, setFiles] = useState<DocFile[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    section_id: '',
  })
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
  })
  const [mdFile, setMdFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])

  useEffect(() => {
    loadSections()
    loadFiles()
  }, [])

  const loadSections = async () => {
    try {
      const response = await fetch('/apis/admin/sections')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        setSections(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to load sections:', response.status)
        setSections([])
      }
    } catch (error) {
      console.error('Failed to load sections:', error)
      setSections([])
    }
  }

  const loadFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/apis/admin/files')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        setFiles(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to load files:', response.status)
        setFiles([])
      }
    } catch (error) {
      console.error('Failed to load documentation files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.title || (!formData.content && !mdFile)) {
      alert('Please provide a title and content (or upload a file)')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      if (formData.section_id) {
        formDataToSend.append('section_id', formData.section_id)
      }
      
      // Add MD file if uploaded
      if (mdFile) {
        formDataToSend.append('mdFile', mdFile)
      }
      
      // Add image files
      imageFiles.forEach((image, index) => {
        formDataToSend.append(`image_${index}`, image)
      })

      const response = await fetch('/apis/admin/files', {
        method: 'POST',
        body: formDataToSend,
      })

      if (response.ok) {
        await loadFiles()
        setIsAddModalOpen(false)
        setFormData({ title: '', content: '', section_id: '' })
        setMdFile(null)
        setImageFiles([])
        alert('Documentation added successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add documentation')
      }
    } catch (error) {
      console.error('Failed to add documentation:', error)
      alert('Failed to add documentation. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this documentation? This cannot be undone.')) return

    try {
      const response = await fetch(`/apis/admin/files/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadFiles()
        alert('Documentation deleted successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete documentation')
      }
    } catch (error) {
      console.error('Failed to delete documentation:', error)
      alert('Failed to delete documentation. Please try again.')
    }
  }

  const handlePreview = (file: DocFile) => {
    setPreviewContent(file.content)
    setPreviewTitle(file.title)
    setIsPreviewModalOpen(true)
  }

  const handleDownloadMD = (file: DocFile) => {
    try {
      // Create a blob with the content
      const blob = new Blob([file.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.slug}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading MD file:', error);
      alert('Failed to download MD file');
    }
  }

  const handleAddSection = async () => {
    if (!sectionFormData.name) {
      alert('Please provide a section name')
      return
    }

    try {
      const response = await fetch('/apis/admin/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: sectionFormData.name }),
      })

      if (response.ok) {
        await loadSections()
        setIsAddSectionModalOpen(false)
        setSectionFormData({ name: '' })
        alert('Section created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create section')
      }
    } catch (error) {
      console.error('Failed to create section:', error)
      alert('Failed to create section. Please try again.')
    }
  }

  const handleDeleteSection = async (sectionId: string, sectionName: string, docCount: number) => {
    const confirmMessage = docCount > 0
      ? `Are you sure you want to delete the section "${sectionName}"? This section contains ${docCount} document(s). The documents will not be deleted but will become unsectioned.`
      : `Are you sure you want to delete the section "${sectionName}"?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/apis/admin/sections?id=${sectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadSections()
        await loadFiles() // Reload files to update their section info
        alert('Section deleted successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete section')
      }
    } catch (error) {
      console.error('Failed to delete section:', error)
      alert('Failed to delete section. Please try again.')
    }
  }

  const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.name.endsWith('.md') || file.name.endsWith('.mdx'))) {
      setMdFile(file)
      // Read the file content
      const content = await file.text()
      setFormData({ ...formData, content })
      
      // Auto-generate title from filename if not set
      if (!formData.title) {
        const title = file.name.replace(/\.mdx?$/, '').replace(/-/g, ' ').replace(/_/g, ' ')
        setFormData({ ...formData, title, content })
      }
    } else {
      alert('Please select a .md or .mdx file')
    }
  }

  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    setImageFiles(prev => [...prev, ...imageFiles])
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const filteredFiles = files.filter((file) => {
    const title = file.title?.toLowerCase() || ''
    const slug = file.slug?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return title.includes(query) || slug.includes(query)
  })

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* User Info Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#9ca3af'
      }}>
        <div>
          Logged in as: <span style={{ color: 'white', fontWeight: '500' }}>sreevarshmaheshgandhi@gmail.com</span>
        </div>
        <button style={{ color: 'white', cursor: 'pointer', background: 'none', border: 'none', fontWeight: '500' }}>
          Logout
        </button>
      </div>

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
            Admin Dashboard
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Manage your documentation files
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsAddSectionModalOpen(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Create Section</span>
          </button>
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
            <Plus className="h-4 w-4" />
            <span>Add New File</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: '#9ca3af' 
          }} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem 0.875rem 3rem',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.5)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
            }}
          />
        </div>
      </div>

      {/* Sections Management */}
      {sections.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Documentation Sections
          </h2>
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
                      padding: '1rem',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Section Name</th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Slug</th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Documents</th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'right',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section, index) => {
                    const docCount = files.filter(f => f.section_id === section.id).length
                    return (
                      <tr
                        key={section.id}
                        style={{
                          borderTop: index > 0 ? '1px solid rgba(51, 65, 85, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(51, 65, 85, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <span style={{ color: 'white', fontWeight: '500', fontSize: '0.875rem' }}>
                            {section.name}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <code style={{
                            color: '#9ca3af',
                            fontSize: '0.75rem',
                            background: 'rgba(17, 24, 39, 0.5)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {section.slug}
                          </code>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            color: docCount > 0 ? '#10b981' : '#6b7280',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}>
                            {docCount}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDeleteSection(section.id, section.name, docCount)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              }}
                            >
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* File List Table */}
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
          <p style={{ color: '#9ca3af' }}>Loading files...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <FileText style={{ width: '48px', height: '48px', color: '#4b5563', margin: '0 auto 1rem' }} />
          <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '1.125rem' }}>
            No documentation found
          </p>
          {searchQuery && (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Try a different search term</p>
          )}
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
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Title</th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Section</th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Slug</th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Last Modified</th>
                  <th style={{ 
                    padding: '1rem',
                    textAlign: 'right',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file, index) => (
                  <tr 
                    key={file.id}
                    style={{
                      borderTop: index > 0 ? '1px solid rgba(51, 65, 85, 0.3)' : 'none',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(51, 65, 85, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          padding: '0.5rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '6px'
                        }}>
                          <FileText style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                        </div>
                        <span style={{ color: 'white', fontWeight: '500', fontSize: '0.875rem' }}>
                          {file.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {file.section_name ? (
                        <span style={{
                          color: '#10b981',
                          fontSize: '0.75rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          fontWeight: '500'
                        }}>
                          {file.section_name}
                        </span>
                      ) : (
                        <span style={{
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          fontStyle: 'italic'
                        }}>
                          No section
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <code style={{
                        color: '#9ca3af',
                        fontSize: '0.75rem',
                        background: 'rgba(17, 24, 39, 0.5)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(51, 65, 85, 0.3)'
                      }}>
                        /docs/{file.slug}
                      </code>
                    </td>
                    <td style={{ padding: '1rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      {new Date(file.lastModified).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handlePreview(file)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                          }}
                        >
                          <Eye style={{ width: '16px', height: '16px' }} />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownloadMD(file)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
                            color: '#10b981',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                          }}
                          title="Download Markdown file"
                        >
                          <FileText style={{ width: '16px', height: '16px' }} />
                          Download MD
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                          Delete
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

      {/* Add Modal */}
      {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0">
              <div className="w-full max-w-4xl bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-background to-background/50">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-1">Add New Documentation</h2>
                    <p className="text-sm text-muted-foreground">Create a new documentation page</p>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">
                      Upload Markdown File (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".md,.mdx"
                        onChange={handleMdFileChange}
                        className="hidden"
                        id="md-file-input"
                      />
                      <label
                        htmlFor="md-file-input"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-dashed border-border/50 bg-background/20 hover:bg-background/40 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-sm">
                          {mdFile ? mdFile.name : 'Click to upload .md or .mdx file'}
                        </span>
                      </label>
                    </div>
                    {mdFile && (
                      <button
                        onClick={() => {
                          setMdFile(null)
                          setFormData({ ...formData, content: '' })
                        }}
                        className="mt-2 text-xs text-destructive hover:underline"
                      >
                        Remove file
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Getting Started"
                      className="w-full px-4 py-3 rounded-lg border border-border/30 bg-background/40 hover:bg-background/60 text-foreground placeholder:text-muted-foreground transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">Section (Optional)</label>
                    <select
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-border/30 bg-background/40 hover:bg-background/60 text-foreground transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    >
                      <option value="">No Section (Root)</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">
                      Upload Images (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFilesChange}
                        className="hidden"
                        id="image-files-input"
                      />
                      <label
                        htmlFor="image-files-input"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-dashed border-border/50 bg-background/20 hover:bg-background/40 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                      >
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-sm">Click to upload images</span>
                      </label>
                    </div>
                    {imageFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">{imageFiles.length} image(s) selected:</p>
                        <div className="flex flex-wrap gap-2">
                          {imageFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/20"
                            >
                              <span className="text-xs text-foreground">{file.name}</span>
                              <button
                                onClick={() => removeImage(index)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">
                      Content (MDX) {mdFile && <span className="text-xs text-muted-foreground">(loaded from file)</span>}
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="# Your Title&#10;&#10;Your content here..."
                      rows={15}
                      className="w-full px-4 py-3 rounded-lg border border-border/30 bg-background/40 hover:bg-background/60 text-foreground placeholder:text-muted-foreground font-mono text-sm transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-gradient-to-r from-background/50 to-background">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all bg-transparent hover:bg-secondary/50 text-foreground border border-border/40 hover:border-border/60 backdrop-blur-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all bg-primary/80 hover:bg-primary text-white border border-primary/40 hover:border-primary/60 shadow-sm hover:shadow-lg hover:shadow-primary/25 backdrop-blur-sm active:scale-95"
                  >
                    Add Documentation
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* Create Section Modal */}
      {isAddSectionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0">
              <div className="w-full max-w-md bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-background to-background/50">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-1">Create New Section</h2>
                    <p className="text-sm text-muted-foreground">Organize your documentation into sections</p>
                  </div>
                  <button
                    onClick={() => setIsAddSectionModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium mb-2.5 text-foreground">Section Name</label>
                    <input
                      type="text"
                      value={sectionFormData.name}
                      onChange={(e) => setSectionFormData({ name: e.target.value })}
                      placeholder="e.g., Getting Started"
                      className="w-full px-4 py-3 rounded-lg border border-border/30 bg-background/40 hover:bg-background/60 text-foreground placeholder:text-muted-foreground transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSection()
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-gradient-to-r from-background/50 to-background">
                  <button
                    onClick={() => setIsAddSectionModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all bg-transparent hover:bg-secondary/50 text-foreground border border-border/40 hover:border-border/60 backdrop-blur-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSection}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all bg-primary/80 hover:bg-primary text-white border border-primary/40 hover:border-primary/60 shadow-sm hover:shadow-lg hover:shadow-primary/25 backdrop-blur-sm active:scale-95"
                  >
                    Create Section
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Modal */}
          {isPreviewModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0">
              <div className="w-full max-w-4xl bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-background to-background/50">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-1">{previewTitle}</h2>
                    <p className="text-sm text-muted-foreground">Preview</p>
                  </div>
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <MDXPreview source={previewContent} />
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
