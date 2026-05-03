"use client";

import { useState } from "react";

interface PartGalleryProps {
  images: string[];
  alt: string;
  storageBase: string;
}

export function PartGallery({ images, alt, storageBase }: PartGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
        <img
          src={`${storageBase}${current}`}
          alt={alt}
          className="h-64 w-full object-contain sm:h-80 lg:h-96"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => {
            const isActive = i === active;
            return (
              <button
                key={img}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-pressed={isActive}
                className={`overflow-hidden rounded-md border bg-zinc-900 transition-all ${
                  isActive
                    ? "border-orange-500 ring-2 ring-orange-500/40"
                    : "border-zinc-800 hover:border-orange-500/50"
                }`}
              >
                <img
                  src={`${storageBase}${img}`}
                  alt={`${alt} - foto ${i + 1}`}
                  className="h-24 w-full object-cover sm:h-28"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
