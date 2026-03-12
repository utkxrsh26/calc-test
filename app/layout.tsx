'use client';

import type { Metadata } from "next";
import Script from "next/script";
import { useEffect } from "react";
import "./globals.css";
import "./styles.css";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/lib/theme-provider";
import { ClientScripts } from "@/components/ClientScripts";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    // Add favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = '/favicon.png';
    
    // Remove existing favicon links to avoid duplicates
    const existingLinks = document.querySelectorAll('link[rel="icon"]');
    existingLinks.forEach(existingLink => existingLink.remove());
    
    document.head.appendChild(link);
    
    return () => {
      // Cleanup on unmount
      const linkToRemove = document.querySelector('link[rel="icon"][href="/favicon.png"]');
      if (linkToRemove) {
        document.head.removeChild(linkToRemove);
      }
    };
  }, []);

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ThemeProvider>
          {!isAdminRoute && <Navbar />}
          {!isAdminRoute && <MobileNavbar />}
          {children}
          {!isAdminRoute && <Footer />}
          {!isAdminRoute && <MobileBottomNav />}
          <ClientScripts />
        </ThemeProvider>
        {/* REMOVED: Suspicious external script that may have been used for crypto mining */}
        {/* If you need a chat widget, use a trusted provider like Intercom, Crisp, or Zendesk */}
      </body>
    </html>
  );
}