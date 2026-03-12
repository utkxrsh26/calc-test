'use client'

import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || 'text'

  const code = useMemo(() => {
    if (typeof children === 'string') return children
    if (Array.isArray(children)) return children.join('')
    return String(children)
  }, [children])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-6">
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 z-10 p-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-opacity opacity-0 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <pre className="bg-black border border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-lg p-4 overflow-x-auto">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}
