'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import BlogCardImage from '@/components/BlogCardImage';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  formattedDate: string;
  author: string;
  description: string;
  category?: string;
  image?: string;
}

interface BlogPageClientProps {
  posts: BlogPost[];
  categories: string[];
  featuredPost?: BlogPost;
}

export default function BlogPageClient({ posts, categories, featuredPost }: BlogPageClientProps) {
  const [activeCategory, setActiveCategory] = useState('All');

  // Filter posts by category
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') {
      return posts;
    }
    return posts.filter(post => (post.category || 'General') === activeCategory);
  }, [posts, activeCategory]);

  // Separate featured post from other posts
  const otherPosts = useMemo(() => {
    if (!featuredPost) return filteredPosts;
    return filteredPosts.filter(post => post.slug !== featuredPost.slug);
  }, [filteredPosts, featuredPost]);

  return (
    <div className="blog-page-modern">
      <div className="blog-container-modern">
        {/* Featured Post */}
        {featuredPost && filteredPosts.some(p => p.slug === featuredPost.slug) && (
          <section className="blog-featured-modern">
            <div className="blog-featured-header">
              <h2 className="blog-section-title">State of Codity</h2>
              <p className="blog-featured-subtitle">Our latest and most popular content</p>
            </div>
            <Link href={`/blog/${featuredPost.slug}`} className="blog-featured-card-modern">
              <div className="blog-featured-image-wrapper">
                <BlogCardImage image={featuredPost.image} title={featuredPost.title} index={0} />
              </div>
              <div className="blog-featured-content">
                <div className="blog-featured-meta">
                  {featuredPost.category && featuredPost.category.toLowerCase() !== 'news' && (
                    <>
                      <span className="blog-featured-category">{featuredPost.category}</span>
                      <span className="blog-featured-separator">·</span>
                    </>
                  )}
                  <span className="blog-featured-date">{featuredPost.formattedDate}</span>
                </div>
                <h2 className="blog-featured-title">{featuredPost.title}</h2>
                <p className="blog-featured-description">{featuredPost.description}</p>
                <div className="blog-featured-author">
                  <span>By {featuredPost.author}</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* All Posts Grid */}
        {otherPosts.length > 0 && (
          <section className="blog-posts-modern">
            <div className="blog-section-header">
              <h2 className="blog-section-title">All Articles</h2>
              <p className="blog-section-subtitle">Explore our complete collection of insights and tutorials</p>
            </div>
            <div className="blog-posts-grid-modern">
              {otherPosts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="blog-post-card-modern"
                >
                  <div className="blog-post-image-wrapper">
                    <BlogCardImage image={post.image} title={post.title} index={index + 1} />
                  </div>
                  <div className="blog-post-card-content">
                    <div className="blog-post-card-meta">
                      {post.category && post.category.toLowerCase() !== 'news' && (
                        <>
                          <span className="blog-post-card-category">{post.category}</span>
                          <span className="blog-post-card-separator">·</span>
                        </>
                      )}
                      <span className="blog-post-card-date">{post.formattedDate}</span>
                    </div>
                    <h3 className="blog-post-card-title">{post.title}</h3>
                    {post.description && (
                      <p className="blog-post-card-description">{post.description}</p>
                    )}
                    <div className="blog-post-card-author">
                      <span>By {post.author}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredPosts.length === 0 && (
          <div className="blog-empty-modern">
            <p>No articles found in this category.</p>
            <button
              className="blog-clear-search"
              onClick={() => setActiveCategory('All')}
            >
              Show all articles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

