'use client';

import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconFileText,
  IconMail,
  IconBrandGithub,
  IconBrandX,
} from "@tabler/icons-react";
import { usePathname } from 'next/navigation';

export function FloatingDockNav() {
  const pathname = usePathname();

  // Hide the floating dock on the Features page to avoid overlapping UI
  if (pathname && pathname.startsWith('/features')) {
    return null;
  }

  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Features",
      icon: (
        <svg className="h-5 w-5 text-neutral-500 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
          <path d="M2 17L12 22L22 17"/>
          <path d="M2 12L12 17L22 12"/>
        </svg>
      ),
      href: "/features",
    },
    {
      title: "Pricing",
      icon: (
        <svg className="h-5 w-5 text-neutral-500 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M3 21h18"/>
          <path d="M8 21V11"/>
          <path d="M16 21V11"/>
        </svg>
      ),
      href: "/pricing",
    },
    {
      title: "Contact",
      icon: (
        <IconMail className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/contact",
    },
  ];

  return (
    <FloatingDock
      mobileClassName="translate-y-20"
      items={links}
    />
  );
}

