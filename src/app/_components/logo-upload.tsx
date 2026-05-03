"use client";

import { useState, useRef } from "react";

const MAX_SIZE = 256;
const QUALITY = 0.85;

interface LogoUploadProps {
  initialUrl?: string | null;
  uploadAction: (formData: FormData) => Promise<{ path?: string; error?: string }>;
  deleteAction: (path: string) => Promise<{ error?: string }>;
}

function compressLogo(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
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

export function LogoUpload({ initialUrl, uploadAction, deleteAction }: LogoUploadProps) {
  const [logo, setLogo] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-logos/`;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      if (logo) {
        await deleteAction(logo);
      }
      const compressed = await compressLogo(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], "logo.webp", { type: "image/webp" }));
      const result = await uploadAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.path) setLogo(result.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir el logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!logo) return;
    setError(null);
    const result = await deleteAction(logo);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLogo(null);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="logo_url" value={logo ?? ""} />

      <div className="flex items-center gap-4">
        {logo ? (
          <div className="relative">
            <img
              src={`${storageBase}${logo}`}
              alt="Logo de la tienda"
              className="h-20 w-20 rounded-md border border-zinc-700 object-cover shadow-md"
            />
            <button
              type="button"
              onClick={removeLogo}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm"
              aria-label="Eliminar logo"
            >
              &times;
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900/40 text-zinc-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}

        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-orange-500/50 hover:text-orange-400">
            {uploading ? "Subiendo..." : logo ? "Cambiar logo" : "Subir logo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <p className="mt-1 text-xs text-muted">PNG, JPG o WebP. Se redimensiona a 256×256 px.</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
