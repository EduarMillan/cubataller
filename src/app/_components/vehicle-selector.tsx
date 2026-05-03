"use client";

import { useState } from "react";
import { InputField } from "./input-field";
import { ALL_VEHICLE_MODELS, VEHICLE_MAKES, VEHICLE_MODELS } from "@/lib/parts-catalog";

export function VehicleSelector({
  defaultMake = "",
  defaultModel = "",
}: {
  defaultMake?: string;
  defaultModel?: string;
}) {
  const [make, setMake] = useState(defaultMake);

  const matchedKey = Object.keys(VEHICLE_MODELS).find(
    (k) => k.toLowerCase() === make.trim().toLowerCase(),
  );
  const models = matchedKey ? VEHICLE_MODELS[matchedKey] : ALL_VEHICLE_MODELS;
  const modelTip = matchedKey
    ? `Modelos populares de ${matchedKey}. Puedes escribir uno distinto si no aparece.`
    : "Modelo específico del vehículo. Ej: Corolla, Civic, Tucson, Sportage.";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField
        id="vehicle_make"
        label="Marca del vehículo"
        required
        defaultValue={defaultMake}
        placeholder="Ej: Toyota"
        tip="Marca del vehículo donde se instala esta pieza. Elige una de la lista o escribe una nueva."
        datalistOptions={VEHICLE_MAKES}
        onValueChange={setMake}
      />
      <InputField
        id="vehicle_model"
        label="Modelo del vehículo"
        required
        defaultValue={defaultModel}
        placeholder="Ej: Corolla"
        tip={modelTip}
        datalistOptions={models}
      />
    </div>
  );
}
