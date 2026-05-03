import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { updatePart, uploadPartImage, deletePartImage } from "../../_actions";
import { InputField } from "@/app/_components/input-field";
import { InfoTip } from "@/app/_components/tooltip";
import { ImageUpload } from "@/app/_components/image-upload";
import { VehicleSelector } from "@/app/_components/vehicle-selector";
import { PART_BRANDS } from "@/lib/parts-catalog";

export default async function EditarPiezaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: part } = await supabase
    .from("parts")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.storeId)
    .single();

  if (!part) notFound();

  const updatePartWithId = updatePart.bind(null, part.id);

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard/inventario"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar pieza</h1>
          <p className="text-sm text-muted">{part.name}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form action={updatePartWithId} className="space-y-6">
        <fieldset className="space-y-4 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-orange-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-orange-300 ring-1 ring-orange-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Información de la pieza
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="sku"
              label="SKU"
              required
              defaultValue={part.sku}
              tip="Código único de la pieza en tu inventario. Cambiar el SKU no afecta el historial de movimientos."
            />
            <InputField
              id="name"
              label="Nombre"
              required
              defaultValue={part.name}
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
              defaultValue={part.description ?? ""}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <InputField
            id="brand"
            label="Marca de la pieza"
            required
            defaultValue={part.brand}
            tip="Fabricante de la pieza (no del vehículo). Elige una de la lista o escribe una nueva."
            datalistOptions={PART_BRANDS}
          />
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-amber-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Compatibilidad de vehículo
          </legend>

          <VehicleSelector defaultMake={part.vehicle_make} defaultModel={part.vehicle_model} />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="year_from"
              label="Año desde (opcional)"
              type="number"
              min={1950}
              max={2100}
              defaultValue={part.vehicle_year_from?.toString() ?? ""}
              tip="Primer año del vehículo compatible. Déjalo vacío si aplica para todos los años."
            />
            <InputField
              id="year_to"
              label="Año hasta (opcional)"
              type="number"
              min={1950}
              max={2100}
              defaultValue={part.vehicle_year_to?.toString() ?? ""}
              tip="Último año del vehículo compatible. Si es un solo año, pon el mismo valor en ambos campos."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-emerald-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Precio, inventario y visibilidad
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="price"
              label={`Precio (${store.currencyCode})`}
              type="number"
              min={0}
              step="0.01"
              defaultValue={part.price != null ? String(part.price) : ""}
              placeholder="Dejar vacío = consultar"
              tip={`Precio de venta en ${store.currencyCode === "USD" ? "dólares estadounidenses" : "pesos cubanos (CUP)"}. Si lo dejas vacío, los clientes verán un botón 'Consultar precio' que los contacta por WhatsApp.`}
            />
            <InputField
              id="quantity"
              label="Cantidad disponible"
              type="number"
              required
              min={0}
              defaultValue={String(part.quantity_on_hand)}
              tip="Unidades en stock actualmente. Se mostrará alerta si baja de 3 unidades."
            />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="is_public"
                defaultChecked={part.is_public}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500/30"
              />
              Visible al público
              <InfoTip content="Si está activo, la pieza aparecerá en el buscador público para que los compradores la encuentren." />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={part.is_active}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500/30"
              />
              Activa
              <InfoTip content="Las piezas inactivas no aparecen en el inventario ni en el buscador. Útil para piezas descontinuadas." />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-zinc-900 p-6 shadow-md">
          <legend className="rounded-md bg-violet-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Imágenes de la pieza
          </legend>
          <ImageUpload
            storeId={store.storeId}
            partId={part.id}
            initialUrls={(part.image_urls as string[]) ?? []}
            uploadAction={uploadPartImage}
            deleteAction={deletePartImage}
          />
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
            Guardar cambios
          </button>
        </div>
      </form>
    </section>
  );
}
