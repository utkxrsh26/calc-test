"use client";

import { cn } from "@/lib/utils";
import { IconHome, IconBrandGithub, IconBrandX, IconFileText, IconMail } from "@tabler/icons-react";
import Link from 'next/link';

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

export function FloatingDock({
  items,
  className,
  mobileClassName,
}: {
  items: DockItem[];
  className?: string;
  mobileClassName?: string;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-8 left-1/2 z-50 flex h-16 translate-x-[-50%] items-end gap-4",
        mobileClassName
      )}
    >
      <div
        className={cn(
          "flex h-full items-end gap-4 rounded-2xl bg-black/80 px-4 pb-3 backdrop-blur-xl border border-white/10",
          className
        )}
      >
        {items.map((item, idx) => (
          <Link
            key={item.title}
            href={item.href}
            className="relative flex h-full cursor-pointer items-center justify-center rounded-xl p-2 transition-all duration-300 hover:bg-white/10 group"
            style={{
              width: '3rem',
              height: '3rem',
            }}
          >
            <div className="relative transition-transform duration-300 group-hover:scale-110">
              {item.icon}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

