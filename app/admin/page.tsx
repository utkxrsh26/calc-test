'use client'

import Link from 'next/link'
import { FileText, BookOpen, ArrowRight } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center pb-8 border-b border-border/30">
            <h1 className="text-6xl font-bold mb-4 relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Admin Dashboard
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            </h1>
            <p className="text-muted-foreground text-lg mt-6">Manage your content</p>
          </div>

          {/* Admin Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            {/* Blog Management */}
            <Link href="/admin/blogs">
              <div className="group relative p-8 rounded-2xl border-2 border-border/30 bg-gradient-to-br from-background/40 to-background/60 hover:from-background/60 hover:to-background/80 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 cursor-pointer">
                <div className="absolute top-6 right-6 text-primary/20 group-hover:text-primary/40 transition-colors">
                  <ArrowRight className="h-8 w-8" />
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                      Blog Management
                    </h2>
                  </div>
                </div>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Create, edit, and manage blog posts. Upload markdown files with images and publish content to your blog.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                  Manage Blogs
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Documentation Management */}
            <Link href="/admin/docs">
              <div className="group relative p-8 rounded-2xl border-2 border-border/30 bg-gradient-to-br from-background/40 to-background/60 hover:from-background/60 hover:to-background/80 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 cursor-pointer">
                <div className="absolute top-6 right-6 text-primary/20 group-hover:text-primary/40 transition-colors">
                  <ArrowRight className="h-8 w-8" />
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                      Documentation
                    </h2>
                  </div>
                </div>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Manage technical documentation. Upload MDX files with images and build comprehensive docs for your users.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                  Manage Documentation
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Stats or Info */}
          <div className="mt-12 p-6 rounded-xl border border-border/30 bg-secondary/20 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground text-center">
              Select a section above to manage your content. Each section has its own dedicated management interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
