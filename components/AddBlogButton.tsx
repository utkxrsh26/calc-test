'use client';

import { useState } from 'react';
import AddBlogModal from '@/components/AddBlogModal';

interface AddBlogButtonProps {
  variant?: 'default' | 'empty';
}

export default function AddBlogButton({ variant = 'default' }: AddBlogButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <button 
        className={variant === 'empty' ? 'blog-add-button blog-add-button-empty' : 'blog-add-button'}
        onClick={() => setIsModalOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.5 1.5a.5.5 0 0 0-1 0v6h-6a.5.5 0 0 0 0 1h6v6a.5.5 0 0 0 1 0v-6h6a.5.5 0 0 0 0-1h-6v-6z"/>
        </svg>
        {variant === 'empty' ? 'Upload Your First Blog Post' : 'Upload Blog'}
      </button>
      <AddBlogModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </>
  );
}

