'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Fetch currency preference
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/apis/admin/currency');
        const result = await response.json();
        if (result.success) {
          setCurrency(result.currency);
        }
      } catch (error) {
        console.error('Error fetching currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Phone numbers based on currency
  const phoneNumber = currency === 'INR' ? '+91 98409 98355' : '+1 (833) 317-2175';
  const phoneHref = currency === 'INR' ? 'tel:+919840998355' : 'tel:+18333172175';

  // Don't render navbar on contact page or docs pages
  if (pathname === '/contact' || pathname?.startsWith('/docs')) {
    return null;
  }

  return (
    <nav className="navbar desktop-navbar">
      <div className="nav-container">
        <div className="nav-left">
          <Link href="/" className="logo">
            <Image
              src="/logo-navbar.svg"
              alt="Codity Logo"
              width={24}
              height={24}
              style={{ width: '24px', height: 'auto' }}
            />
            <span className="logo-text">
              <span className="logo-codity">codity</span>
              <span className="logo-ai">.ai</span>
            </span>
          </Link>
        </div>
        <div className="nav-center">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link href="/features" className={`nav-link ${pathname === '/features' ? 'active' : ''}`}>Features</Link>
          <Link href="/docs" className={`nav-link ${pathname === '/docs' || pathname?.startsWith('/docs/') ? 'active' : ''}`}>Documentation</Link>
          <Link href="/pricing" className={`nav-link ${pathname === '/pricing' ? 'active' : ''}`}>Pricing</Link>
          <Link href="/blog" className={`nav-link ${pathname === '/blog' || pathname?.startsWith('/blog/') ? 'active' : ''}`}>Blog</Link>
        </div>
        <div className="nav-right">
          <a href={phoneHref} className="nav-contact-link nav-phone-number">
            <svg className="phone-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {phoneNumber}
          </a>
          <a href="https://dashboard.codity.ai" className="btn-primary">Login</a>
        </div>
      </div>
    </nav>
  );
}
