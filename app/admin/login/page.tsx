'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    console.log('Login page mounted');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Sending login request...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies in request
      });

      const data = await response.json();
      console.log('Login response:', response.status, data);

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Success - redirect to admin
      console.log('Login successful, redirecting...');
      
      // Cookies are already set by the server, just redirect
      console.log('Executing redirect now...');
      window.location.href = '/admin/blogs';
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'rgba(31, 41, 55, 0.5)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '2rem',
          border: '1px solid rgba(75, 85, 99, 0.5)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              Admin Login
            </h1>
            <p style={{ color: '#9ca3af' }}>Sign in to manage your blog content</p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '0.5rem'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d1d5db', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '1rem'
                }}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d1d5db', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '1rem'
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: loading ? '#4b5563' : '#2563eb',
                color: 'white',
                fontWeight: '500',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                fontSize: '1rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#2563eb';
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Secured with Supabase Auth 🔒
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
