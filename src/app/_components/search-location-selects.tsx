"use client";

import { useState } from "react";
import { PROVINCIAS, getMunicipios } from "@/lib/cuba-locations";

export function SearchLocationSelects({
  defaultProvincia,
  defaultMunicipio,
  selectClassName,
}: {
  defaultProvincia?: string;
  defaultMunicipio?: string;
  selectClassName?: string;
}) {
  const [provinciaCode, setProvinciaCode] = useState(defaultProvincia ?? "");
  const municipios = provinciaCode ? getMunicipios(provinciaCode) : [];

  const baseClass =
    selectClassName ??
    "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <>
      <select
        name="provincia"
        value={provinciaCode}
        onChange={(e) => {
          setProvinciaCode(e.target.value);
        }}
        className={baseClass}
      >
        <option value="">Todas las provincias</option>
        {PROVINCIAS.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        name="municipio"
        disabled={!provinciaCode}
        defaultValue={defaultMunicipio}
        className={`${baseClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <option value="">
          {provinciaCode ? "Todos los municipios" : "Primero elige provincia"}
        </option>
        {municipios.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </>
  );
}
