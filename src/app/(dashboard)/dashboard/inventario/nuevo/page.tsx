import Link from "next/link";
import { redirect } from "next/navigation";
import { createPart, uploadPartImage, deletePartImage } from "../_actions";
import { InputField } from "@/app/_components/input-field";
import { InfoTip } from "@/app/_components/tooltip";
import { ImageUpload } from "@/app/_components/image-upload";
import { VehicleSelector } from "@/app/_components/vehicle-selector";
import { PART_BRANDS } from "@/lib/parts-catalog";
import { getUserStore } from "@/lib/queries/store";

export default async function NuevaPiezaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { error } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard/inventario"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-light hover:text-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Agregar pieza</h1>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form action={createPart} className="space-y-6">
        <fieldset className="space-y-4 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-orange-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-orange-300 ring-1 ring-orange-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Información de la pieza
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="sku"
              label="SKU"
              required
              placeholder="Ej: FRE-TOY-001"
              tip="Código único de la pieza en tu inventario. Usa un formato consistente como TIPO-MARCA-NÚMERO."
            />
            <InputField
              id="name"
              label="Nombre"
              required
              placeholder="Ej: Pastillas de freno delanteras"
              tip="Nombre descriptivo de la pieza. Será visible para los compradores en el buscador público."
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="flex items-center text-sm font-medium">
              Descripción (opcional)
              <InfoTip content="Detalles adicionales como material, especificaciones técnicas o notas internas sobre la pieza." />
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <InputField
            id="brand"
            label="Marca de la pieza"
            required
            placeholder="Ej: Brembo"
            tip="Fabricante de la pieza (no del vehículo). Elige una de la lista o escribe una nueva."
            datalistOptions={PART_BRANDS}
          />
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-amber-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Compatibilidad de vehículo
          </legend>

          <VehicleSelector />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="year_from"
              label="Año desde (opcional)"
              type="number"
              min={1950}
              max={2100}
              placeholder="2015"
              tip="Primer año del vehículo compatible. Déjalo vacío si aplica para todos los años."
            />
            <InputField
              id="year_to"
              label="Año hasta (opcional)"
              type="number"
              min={1950}
              max={2100}
              placeholder="2024"
              tip="Último año del vehículo compatible. Si es un solo año, pon el mismo valor en ambos campos."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-emerald-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Precio e inventario
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="price"
              label={`Precio (${store.currencyCode})`}
              type="number"
              min={0}
              step="0.01"
              placeholder="Dejar vacío = consultar"
              tip={`Precio de venta en ${store.currencyCode === "USD" ? "dólares estadounidenses" : "pesos cubanos (CUP)"}. Si lo dejas vacío, los clientes verán un botón 'Consultar precio' que los contacta por WhatsApp.`}
            />
            <InputField
              id="quantity"
              label="Cantidad disponible"
              type="number"
              required
              min={0}
              defaultValue="0"
              tip="Unidades en stock actualmente. Se mostrará alerta si baja de 3 unidades."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-violet-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Imágenes de la pieza
          </legend>
          <ImageUpload storeId={store.storeId} uploadAction={uploadPartImage} deleteAction={deletePartImage} />
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/inventario"
            className="rounded-md border border-zinc-700 px-5 py-3 text-center text-sm font-medium text-zinc-300 hover:border-orange-500/50 hover:text-orange-400 sm:py-2.5"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-md bg-orange-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 sm:py-2.5 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Guardar pieza
          </button>
        </div>
      </form>
    </section>
  );
}
