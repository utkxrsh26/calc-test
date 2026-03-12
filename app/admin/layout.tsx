'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // If on login page, skip auth and just render children
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Skip auth check if on login page
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        console.log('Checking user authentication...');
        const response = await fetch('/api/auth/user', {
          credentials: 'include', // Include cookies
        });
        
        console.log('Auth check response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('User authenticated:', data.user?.email);
          if (data.user) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }
        
        console.log('Auth check failed, redirecting to login');
        router.push('/admin/login');
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
    };

    checkUser();
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  // If on login page, render children without admin layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            height: '64px' 
          }}>
            {/* Left side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link href="/admin/blogs" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                textDecoration: 'none' 
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                  Admin Dashboard
                </span>
              </Link>
              
              <nav style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  href="/admin/blogs"
                  style={{
                    color: '#9ca3af',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  📝 Blogs
                </Link>
                <Link
                  href="/admin/docs"
                  style={{
                    color: '#9ca3af',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  📚 Docs
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  style={{
                    color: '#9ca3af',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>🌐 View Site</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </Link>
              </nav>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(55, 65, 81, 0.3)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#10b981',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></div>
                <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b91c1c';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(220, 38, 38, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </div>
  );
}
