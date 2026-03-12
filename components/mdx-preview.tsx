'use client'

import { useEffect, useState } from 'react'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkGfm from 'remark-gfm'
import yaml from 'highlight.js/lib/languages/yaml'

// Configure rehype-highlight with YAML language support
const rehypeHighlightOptions = {
    languages: {
        yaml: yaml,
        yml: yaml,
    },
    ignoreMissing: true,
    subset: false,
} as any; // Type cast to avoid TypeScript errors with rehype-highlight

interface MDXPreviewProps {
    source: string
}
export function MDXPreview({ source }: MDXPreviewProps) {
    const [mdxSource, setMdxSource] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const processMDX = async () => {
            try {
                const mdxSource = await serialize(source, {
                    mdxOptions: {
                        remarkPlugins: [remarkGfm],
                        rehypePlugins: [
                            [rehypeHighlight, rehypeHighlightOptions],
                            rehypeSlug,
                            [
                                rehypeAutolinkHeadings,
                                {
                                    behavior: 'wrap',
                                    properties: {
                                        className: ['anchor'],
                                    },
                                },
                            ],
                        ],
                    },
                })
                setMdxSource(mdxSource)
                setError(null)
            } catch (err) {
                console.error('MDX serialization error:', err)
                setError('Failed to render preview')
            }
        }

        processMDX()
    }, [source])

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded">{error}</div>
    }

    if (!mdxSource) {
        return <div className="animate-pulse p-4">Loading preview...</div>
    }

    return (
        <div className="prose prose-invert max-w-none">
            <MDXRemote {...mdxSource} />
        </div>
    )
}
