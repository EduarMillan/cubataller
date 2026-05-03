"use client";

import { useDistances } from "./distances-provider";
import {
  formatDistanceKm,
  getCoordsForMunicipio,
  haversineKm,
} from "@/lib/cuba-geolocation";

export function DistanceBadge({
  municipio,
  provincia,
  className = "",
}: {
  municipio: string | null | undefined;
  provincia?: string | null;
  className?: string;
}) {
  const { coords, status } = useDistances();
  if (status !== "ok" || !coords) return null;

  const target = getCoordsForMunicipio(municipio, provincia);
  if (!target) return null;

  const km = haversineKm(coords, target);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300 ring-1 ring-zinc-700 ${className}`.trim()}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      Distancia aproximada: {formatDistanceKm(km)}
    </span>
  );
}
