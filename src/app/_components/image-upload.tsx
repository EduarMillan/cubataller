"use client";

import { useState, useRef } from "react";

const MAX_IMAGES = 3;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;

interface ImageUploadProps {
  storeId: string;
  partId?: string;
  initialUrls?: string[];
  uploadAction: (formData: FormData) => Promise<{ path?: string; error?: string }>;
  deleteAction: (path: string) => Promise<{ error?: string }>;
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function ImageUpload({ storeId, partId, initialUrls = [], uploadAction, deleteAction }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;

  async function handleFiles(fileList: FileList) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;

    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of files) {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append("file", new File([compressed], "image.webp", { type: "image/webp" }));
        fd.append("folder", partId || "temp");

        const result = await uploadAction(fd);

        if (result.error) {
          console.error("Upload error:", result.error);
          continue;
        }

        if (result.path) {
          newUrls.push(result.path);
        }
      }

      setImages((prev) => [...prev, ...newUrls]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeImage(index: number) {
    const path = images[index];
    await deleteAction(path);
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs to send paths with the form */}
      {images.map((url, i) => (
        <input key={url} type="hidden" name={`image_${i}`} value={url} />
      ))}
      <input type="hidden" name="image_count" value={images.length} />

      {/* Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((path, i) => (
            <div key={path} className="group relative">
              <img
                src={`${storageBase}${path}`}
                alt={`Imagen ${i + 1}`}
                className="h-24 w-24 rounded-md border border-zinc-700 object-cover shadow-md"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm transition-opacity sm:h-5 sm:w-5 sm:text-[10px] sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Eliminar imagen"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < MAX_IMAGES && (
        <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-orange-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          {uploading ? (
            <span>Subiendo...</span>
          ) : (
            <span>
              Subir imagen ({images.length}/{MAX_IMAGES})
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      )}

      <p className="text-xs text-muted">
        Máximo 3 imágenes. Se redimensionan automáticamente para optimizar carga.
      </p>
    </div>
  );
}
