import Image from 'next/image';

/**
 * Tile image that slowly cycles through a product's gallery when more than one
 * photo exists. Pure CSS keyframes (like the marquee): each stacked image gets
 * the n-slot cycle animation phase-shifted by a negative delay, so rotation
 * runs on the compositor with no JS timers and no hydration dependency.
 * Hovering the tile pauses the cycle (globals.css). Single-image products
 * render exactly as before. Rotation shows at most the first four photos; the
 * PDP gallery carries the full set.
 */
const SLOT_SECONDS = 4.2;
const MAX_ROTATED = 4;

export function RotatingImage({
  images,
  alt,
  sizes,
  priority = false,
}: {
  images: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (images.length === 1) {
    return (
      <Image
        src={images[0]}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-[1.04]"
        priority={priority}
      />
    );
  }

  const shown = images.slice(0, MAX_ROTATED);
  const n = shown.length;

  return (
    <>
      {shown.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : ''}
          fill
          sizes={sizes}
          className="tile-rotate object-cover group-hover:scale-[1.04]"
          priority={priority && i === 0}
          // Runtime-dynamic animation phase, the sanctioned use of inline style.
          style={{
            animationName: `tile-cycle-${n}`,
            animationDuration: `${n * SLOT_SECONDS}s`,
            animationDelay: `${(i - n) * SLOT_SECONDS}s`,
          }}
        />
      ))}
    </>
  );
}
