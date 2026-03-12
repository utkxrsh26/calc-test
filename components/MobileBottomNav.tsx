'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaDollarSign, FaPhone, FaCog, FaBook, FaSignInAlt, FaEllipsisH, FaTimes } from 'react-icons/fa';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render mobile nav on contact page
  if (pathname === '/contact') {
    return null;
  }

  const primaryNavItems = [
    { href: '/', label: 'Home', icon: FaHome },
    { href: '/blog', label: 'Blog', icon: FaBook },
  ];

  // All items that should appear in the dropdown
  const dropdownNavItems = [
    { href: '/features', label: 'Features', icon: FaCog },
    { href: '/pricing', label: 'Pricing', icon: FaDollarSign },
    { href: '/contact', label: 'Contact', icon: FaPhone },
  ];

  const isActive = (href: string) => {
    return pathname === href || (href === '/blog' && pathname?.startsWith('/blog'));
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  return (
    <>
      {/* Dropdown overlay */}
      {isExpanded && (
        <div 
          className="mobile-nav-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-container">
          {/* Primary nav items - always visible */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${isActive(item.href) ? 'active' : ''}`}
                onClick={() => setIsExpanded(false)}
              >
                <Icon size={20} className="mobile-nav-icon" />
                <span className="mobile-nav-label">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={handleMoreClick}
            className={`mobile-nav-item mobile-nav-more ${isExpanded ? 'expanded' : ''}`}
            aria-label="More menu"
          >
            {isExpanded ? (
              <FaTimes size={18} className="mobile-nav-icon" />
            ) : (
              <FaEllipsisH size={18} className="mobile-nav-icon" />
            )}
            <span className="mobile-nav-label">{isExpanded ? 'Close' : 'More'}</span>
          </button>

          {/* Login button - always visible */}
          <a
            href="https://dashboard.codity.ai"
            className="mobile-nav-item mobile-nav-login"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsExpanded(false)}
          >
            <FaSignInAlt size={18} className="mobile-nav-icon" />
            <span className="mobile-nav-label">Login</span>
          </a>
        </div>

        {/* Expanded dropdown menu */}
        <div className={`mobile-nav-dropdown ${isExpanded ? 'expanded' : ''}`}>
          {dropdownNavItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-dropdown-item ${isActive(item.href) ? 'active' : ''}`}
                onClick={() => setIsExpanded(false)}
                style={{ '--delay': `${index * 0.08}s` } as React.CSSProperties}
              >
                <Icon size={20} className="mobile-nav-dropdown-icon" />
                <span className="mobile-nav-dropdown-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

