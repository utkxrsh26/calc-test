import { getAllBlogPosts } from '@/lib/blog';
import BlogPageClient from '@/components/BlogPageClient';

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  // Extract unique categories, excluding "News"
  const categories = Array.from(new Set(posts.map(post => post.category || 'General').filter(Boolean)))
    .filter(category => category.toLowerCase() !== 'news');
  
  // Featured post (first one, largest)
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <BlogPageClient 
      posts={posts}
      categories={categories}
      featuredPost={featuredPost}
    />
  );
}

