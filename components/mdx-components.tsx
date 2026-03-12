import { CodeBlock } from './code-block'

// Helper function to get Supabase public URL for images
function getImageUrl(src: string): string {
  // If it's already a full URL, return as is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const bucketName = 'DOCUMENTATIONS and BLOGS'
  
  if (supabaseUrl) {
    // Handle different image path formats
    
    // If it's a direct filename (e.g., "fig1.png"), look in root images folder
    if (!src.includes('/')) {
      const imagePath = `images/${src}`
      return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${imagePath}`
    }
    
    // If it starts with /, remove it and check if it's just a filename
    if (src.startsWith('/')) {
      const cleanSrc = src.substring(1)
      if (!cleanSrc.includes('/')) {
        const imagePath = `images/${cleanSrc}`
        return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${imagePath}`
      }
      // If it starts with /images/, use it as is
      if (cleanSrc.startsWith('images/')) {
        return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${cleanSrc}`
      }
      return src.substring(1) // Remove leading slash for public folder
    }
    
    // If the path doesn't start with DOCUMENTATION, assume it's relative
    const imagePath = src.startsWith('DOCUMENTATION/') 
      ? src 
      : `images/${src}`
    
    return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${imagePath}`
  }
  
  // Fallback to original src
  return src
}

export const mdxComponents = {
  h1: (props: any) => (
    <h1
      className="text-4xl md:text-5xl font-bold mb-8 mt-0 leading-tight tracking-tight scroll-mt-20 text-white"
      {...props}
    >
      {props.children}
    </h1>
  ),
  h2: (props: any) => (
    <h2
      className="text-3xl md:text-4xl font-bold mb-6 mt-12 tracking-tight first:mt-8 scroll-mt-20 text-white"
      {...props}
    >
      {props.children}
    </h2>
  ),
  h3: (props: any) => (
    <h3
      className="text-2xl md:text-3xl font-bold mb-5 mt-10 tracking-tight scroll-mt-20 text-white"
      {...props}
    >
      {props.children}
    </h3>
  ),
  h4: (props: any) => (
    <h4 className="text-lg md:text-xl font-semibold mb-4 mt-8 tracking-tight scroll-mt-20 text-white" {...props} />
  ),
  p: (props: any) => {
    const text = typeof props.children === 'string' ? props.children : ''
    if (text.startsWith('Figure') || text.startsWith('**Figure')) {
      return (
        <p className="mt-4 mb-2 text-sm text-muted-foreground font-normal">
          <span className="text-primary">📷</span> {props.children}
        </p>
      )
    }
    return <p className="mb-5 leading-relaxed text-base text-gray-300" {...props} />
  },
  img: (props: any) => {
    if (props.src === 'placeholder' || props.alt?.includes('placeholder')) {
      return (
        <div className="my-10 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-secondary/50 via-secondary/30 to-transparent p-20 flex items-center justify-center backdrop-blur-sm shadow-inner">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-40">🖼️</div>
            <p className="text-sm font-semibold text-muted-foreground">Image Placeholder</p>
            <p className="text-xs text-muted-foreground/50 mt-1.5">Screenshot will be added here</p>
          </div>
        </div>
      )
    }
    
    // Convert image src to proper Supabase URL if needed
    const imgSrc = getImageUrl(props.src)
    
    return (
      <img
        {...props}
        src={imgSrc}
        className="my-8 rounded-xl border border-border/50 shadow-xl w-full transition-all hover:shadow-2xl hover:scale-[1.01]"
      />
    )
  },
  ul: (props: any) => (
    <ul className="mb-6 ml-6 list-disc space-y-2 text-gray-300 [&>li]:marker:text-gray-500" {...props} />
  ),
  ol: (props: any) => (
    <ol className="mb-6 ml-6 list-decimal space-y-2 text-gray-300 [&>li]:marker:text-gray-500 [&>li]:marker:font-semibold" {...props} />
  ),
  li: (props: any) => <li className="leading-relaxed text-base text-gray-300" {...props} />,
  a: (props: any) => (
    <a
      className="text-blue-400 underline underline-offset-4 decoration-blue-500/50 hover:decoration-blue-400 transition-all font-medium hover:text-blue-300"
      {...props}
    />
  ),
  code: (props: any) => {
    if (props.className) {
      return <CodeBlock {...props} />
    }
    return (
      <code className="bg-gray-900 text-gray-300 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-800">
        {props.children}
      </code>
    )
  },
  pre: (props: any) => <>{props.children}</>,
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-blue-500/60 pl-6 italic my-8 text-gray-300 bg-gradient-to-r from-blue-500/5 via-gray-900/20 to-transparent py-4 pr-6 rounded-r-lg"
      {...props}
    />
  ),
  table: (props: any) => (
    <div className="my-8 overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border border-gray-800 px-4 py-3 bg-gray-900 font-semibold text-left text-white" {...props} />
  ),
  td: (props: any) => (
    <td className="border border-gray-800 px-4 py-3 text-gray-300" {...props} />
  ),
  hr: (props: any) => (
    <hr className="my-8 border-gray-800" {...props} />
  ),
  strong: (props: any) => {
    const text = typeof props.children === 'string' ? props.children : ''
    if (text.startsWith('Figure')) {
      return (
        <strong className="block mt-4 mb-2 text-sm text-muted-foreground font-normal">
          <span className="text-primary">📷</span> {props.children}
        </strong>
      )
    }
    // Check if it's a label like "The issue:", "Result:", "Example:"
    if (text.endsWith(':') && text.split(' ').length <= 3) {
      return <strong className="font-bold text-white block mb-2 mt-4" {...props} />
    }
    return <strong className="font-semibold text-white" {...props} />
  },
  em: (props: any) => (
    <em className="italic text-gray-300" {...props} />
  ),
}
