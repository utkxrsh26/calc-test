import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogCardImage from '@/components/BlogCardImage';

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="blog-post-page">
      <div className="blog-post-container">
        <Link href="/blog" className="blog-back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
          Back to blog
        </Link>

        <article className="blog-post">
          <header className="blog-post-header">
            {post.category && post.category.toLowerCase() !== 'news' && (
              <div className="blog-post-category">
                {post.category}
              </div>
            )}
            
            <h1 className="blog-post-title">{post.title}</h1>
            
            <div className="blog-post-meta">
              <div className="blog-post-author-info">
                <span className="blog-post-author">{post.author}</span>
                <span className="blog-post-separator">·</span>
                <span className="blog-post-date">
                  {post.formattedDateLong}
                </span>
              </div>
            </div>
            
            {post.description && (
              <p className="blog-post-description">{post.description}</p>
            )}
          </header>

          <div className="blog-post-featured-image">
            <BlogCardImage image={post.image} title={post.title} index={0} />
          </div>

          <div 
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml || '' }}
          />

          <footer className="blog-post-footer">
            <Link href="/blog" className="blog-post-footer-link">
              ← View all posts
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}

