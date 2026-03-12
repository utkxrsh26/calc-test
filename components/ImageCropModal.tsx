'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

type Point = {
  x: number;
  y: number;
};

type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface ImageCropModalProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
  title?: string;
}

export default function ImageCropModal({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 16 / 9,
  title = 'Crop Image',
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    setCropping(true);

    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image');
    } finally {
      setCropping(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '1rem',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0, marginBottom: '0.5rem' }}>
              {title}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
              📐 16:9 aspect ratio - This exact crop will be shown in thumbnails and cover image
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Info Banner */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '1.5rem' }}>ℹ️</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#60a5fa', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              16:9 Aspect Ratio (Same for Thumbnail & Cover)
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              The area you select will be displayed identically on blog cards and the full blog post - what you crop is exactly what you get!
            </div>
          </div>
        </div>

        {/* Cropper Area */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: '400px',
            background: '#0f172a',
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            style={{
              containerStyle: {
                background: '#0f172a',
              },
            }}
          />
        </div>

        {/* Controls */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: '1px solid #475569',
            background: '#334155',
          }}
        >
          {/* Zoom Slider */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#3b82f6',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={onCancel}
              disabled={cropping}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#475569',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: cropping ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                opacity: cropping ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={createCroppedImage}
              disabled={cropping}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: cropping ? '#475569' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: cropping ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {cropping ? 'Cropping...' : 'Apply Crop'}
            </button>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem', marginBottom: 0 }}>
            💡 <strong>Preview:</strong> The selected area (16:9) will be displayed identically in both blog thumbnails and cover images - no additional cropping will occur
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper function to create cropped image
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}
