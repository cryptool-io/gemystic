'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * PDP image gallery: main image plus a thumbnail rail when a product has more
 * than one photo. Single-image products render exactly the old single frame.
 * The SOLD overlay stays with the parent (server) so stock logic lives once.
 */
export function ProductGallery({
  images,
  alt,
  children,
}: {
  images: string[];
  alt: string;
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  return (
    <div>
      <div className="card relative aspect-square overflow-hidden">
        <Image
          key={images[index]}
          src={images[index]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {children}
      </div>

      {images.length > 1 && (
        <div className="scroll-x mt-3 flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                i === index
                  ? 'border-brand ring-2 ring-brand-ring'
                  : 'border-line hover:border-brand-ring'
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
