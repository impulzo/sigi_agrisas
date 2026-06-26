"use client";

import { useState } from "react";

interface ProductImageProps {
  src: string | null;
  alt: string;
  size: 40 | 96;
}

export function ProductImage({ src, alt, size }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  const dim = `${size}px`;
  const iconSize = size >= 96 ? "text-4xl" : "text-xl";

  if (!src || failed) {
    return (
      <div
        aria-label={alt}
        style={{ width: dim, height: dim }}
        className="flex items-center justify-center rounded bg-surface-container text-on-surface-variant flex-shrink-0"
      >
        <span className={`material-symbols-outlined ${iconSize}`} aria-hidden="true">
          image_not_supported
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded object-cover flex-shrink-0"
      style={{ width: dim, height: dim }}
    />
  );
}
