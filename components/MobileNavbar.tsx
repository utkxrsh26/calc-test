'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';

export default function MobileNavbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Don't render mobile nav on contact page or docs pages
  if (pathname === '/contact' || pathname?.startsWith('/docs')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/docs', label: 'Documentation' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/blog', label: 'Blog' },
  ];

  const isActive = (href: string) => {
    return pathname === href || (href === '/blog' && pathname?.startsWith('/blog')) || (href === '/docs' && pathname?.startsWith('/docs'));
  };

  const handleMenuToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsMenuOpen(prev => {
      const newState = !prev;
      return newState;
    });
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Overlay when menu is open */}
      {isMenuOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={handleMenuToggle}
        />
      )}

      <nav className="mobile-navbar">
        <div className="mobile-nav-container">
          {/* Logo */}
          <div className="mobile-nav-left">
            <Link href="/" className="logo" onClick={handleLinkClick}>
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

          {/* Right side: Hamburger only */}
          <div className="mobile-nav-right">
            <button
              className="mobile-nav-hamburger"
              onClick={(e) => handleMenuToggle(e)}
              aria-label="Toggle menu"
              type="button"
            >
              {isMenuOpen ? (
                <FaTimes size={16} />
              ) : (
                <FaBars size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Dropdown menu */}
        <div className={`mobile-nav-menu ${isMenuOpen ? 'open' : ''}`}>
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-menu-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={handleLinkClick}
              style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://dashboard.codity.ai"
            className="mobile-nav-menu-item mobile-nav-menu-login"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            style={{ '--delay': `${navItems.length * 0.05}s` } as React.CSSProperties}
          >
            Login
          </a>
        </div>
      </nav>
    </>
  );
}

