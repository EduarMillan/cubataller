"use client";

import { useDistances } from "./distances-provider";

export function EnableLocationButton() {
  const { status, request, clear } = useDistances();

  if (status === "ok") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Distancias activadas
        <button
          type="button"
          onClick={clear}
          className="ml-1 text-emerald-300/80 underline-offset-2 hover:underline"
        >
          Desactivar
        </button>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300">
        No pudimos obtener tu ubicación.
        <button
          type="button"
          onClick={request}
          className="underline-offset-2 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={request}
      disabled={status === "loading"}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 shadow-sm hover:border-orange-500/50 hover:text-orange-400 disabled:opacity-60"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      {status === "loading" ? "Obteniendo ubicación…" : "Mostrar distancia aproximada"}
    </button>
  );
}
