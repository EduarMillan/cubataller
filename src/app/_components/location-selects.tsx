"use client";

import { useState } from "react";
import { PROVINCIAS, getMunicipios } from "@/lib/cuba-locations";

export function LocationSelects({
  defaultProvincia,
  defaultMunicipio,
}: {
  defaultProvincia?: string;
  defaultMunicipio?: string;
}) {
  const [provinciaCode, setProvinciaCode] = useState(defaultProvincia ?? "");
  const municipios = provinciaCode ? getMunicipios(provinciaCode) : [];

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="provincia" className="block text-sm font-medium">
          Provincia
        </label>
        <select
          id="provincia"
          name="provincia"
          required
          value={provinciaCode}
          onChange={(e) => {
            setProvinciaCode(e.target.value);
          }}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        >
          <option value="">Selecciona una provincia</option>
          {PROVINCIAS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="municipio" className="block text-sm font-medium">
          Municipio
        </label>
        <select
          id="municipio"
          name="municipio"
          required
          disabled={!provinciaCode}
          defaultValue={defaultMunicipio}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {provinciaCode ? "Selecciona un municipio" : "Primero selecciona provincia"}
          </option>
          {municipios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
