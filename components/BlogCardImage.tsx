'use client';

import Image from 'next/image';

interface BlogCardImageProps {
  image?: string;
  title: string;
  index?: number;
}

export default function BlogCardImage({ image, title, index = 0 }: BlogCardImageProps) {
  // Use provided image or default to 1.png from public folder
  const imageSrc = image || '/1.png';

  return (
    <div className="blog-card-image">
      <Image 
        src={imageSrc} 
        alt={title} 
        fill
        className="blog-image"
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={index === 0}
      />
    </div>
  );
}


