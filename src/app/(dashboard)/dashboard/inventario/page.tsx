import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { deletePart } from "./_actions";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { q } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("parts")
    .select(
      "id, sku, name, brand, vehicle_make, vehicle_model, price, quantity_on_hand, is_public, is_active, image_urls",
    )
    .eq("store_id", store.storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`name.ilike.${term},sku.ilike.${term},brand.ilike.${term},vehicle_make.ilike.${term},vehicle_model.ilike.${term}`);
  }

  const { data: parts } = await query;

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inventario</h1>
          <p className="mt-1 text-sm text-muted">
            {parts?.length ?? 0} pieza{parts?.length !== 1 ? "s" : ""} activa
            {parts?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/inventario/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark active:bg-accent-dark sm:py-2.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar pieza
        </Link>
      </header>

      {/* Search */}
      <form className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Buscar por nombre, SKU, marca o vehículo..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 sm:flex-none [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Buscar
          </button>
          {q && (
            <a
              href="/dashboard/inventario"
              className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-400 hover:border-orange-500/50 hover:text-orange-400"
            >
              Limpiar
            </a>
          )}
        </div>
      </form>

      {!parts || parts.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center sm:p-12">
          {q ? (
            <>
              <div className="rounded-md bg-zinc-800 p-4 text-zinc-500">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Sin resultados</h3>
              <p className="mt-1 text-sm text-muted">
                No se encontraron piezas para &quot;{q}&quot;. Intenta con otro término.
              </p>
              <a
                href="/dashboard/inventario"
                className="mt-4 text-sm font-medium text-accent hover:text-accent-dark"
              >
                Ver todo el inventario
              </a>
            </>
          ) : (
            <>
              <div className="rounded-md bg-orange-500/10 p-4 text-orange-400 ring-1 ring-orange-500/30">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Sin piezas aún</h3>
              <p className="mt-1 text-sm text-muted">
                Agrega tu primera pieza para comenzar a gestionar tu inventario.
              </p>
              <Link
                href="/dashboard/inventario/nuevo"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark"
              >
                Agregar pieza
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="grid gap-3 lg:hidden">
            {parts.map((part) => {
              const imgs = (part.image_urls as string[]) ?? [];
              return (
                <article
                  key={part.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md"
                >
                  <div className="flex gap-3">
                    {imgs.length > 0 ? (
                      <img
                        src={`${storageBase}${imgs[0]}`}
                        alt={part.name}
                        className="h-16 w-16 shrink-0 rounded-md border border-zinc-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 break-words font-semibold leading-snug text-zinc-100">{part.name}</h3>
                        {part.is_public ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Público
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            Oculto
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-xs text-orange-400">{part.sku}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {part.vehicle_make} {part.vehicle_model}
                      </p>
                    </div>
                  </div>

                  {/* Precio + stock */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
                    {part.price != null ? (
                      <span className="text-sm font-bold tabular-nums text-orange-400">
                        ${Number(part.price).toLocaleString("es-CU")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30">
                        Consultar
                      </span>
                    )}
                    {part.quantity_on_hand <= 3 ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
                        Stock: {part.quantity_on_hand}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                        Stock: {part.quantity_on_hand}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/dashboard/inventario/${part.id}/editar`}
                      className="flex-1 rounded-md border border-orange-500/30 bg-orange-500/10 py-2 text-center text-xs font-bold uppercase tracking-wider text-orange-300 hover:border-orange-500/50 hover:bg-orange-500/20 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                    >
                      Editar
                    </Link>
                    <form action={deletePart} className="flex-1">
                      <input type="hidden" name="partId" value={part.id} />
                      <button
                        type="submit"
                        className="w-full rounded-md border border-red-500/30 bg-red-500/10 py-2 text-center text-xs font-bold uppercase tracking-wider text-red-300 hover:border-red-500/50 hover:bg-red-500/20 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-md lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-orange-500/30 bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-orange-500/15">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Imagen
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    SKU
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Nombre
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Vehículo
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Precio
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Stock
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                    Estado
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]" />
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => {
                  const imgs = (part.image_urls as string[]) ?? [];
                  return (
                    <tr
                      key={part.id}
                      className="border-b border-zinc-800 transition-colors odd:bg-zinc-950 even:bg-zinc-900/50 hover:!bg-orange-500/10"
                    >
                      <td className="px-5 py-3">
                        {imgs.length > 0 ? (
                          <img
                            src={`${storageBase}${imgs[0]}`}
                            alt={part.name}
                            className="h-10 w-10 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-800 text-zinc-500">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-accent">
                        {part.sku}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{part.name}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {part.vehicle_make} {part.vehicle_model}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums">
                        {part.price != null ? (
                          <>
                            ${Number(part.price).toLocaleString("es-CU")}
                          </>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30">
                            Consultar
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {part.quantity_on_hand <= 3 ? (
                          <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
                            {part.quantity_on_hand}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                            {part.quantity_on_hand}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {part.is_public ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Público
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            Oculto
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/inventario/${part.id}/editar`}
                            className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:border-orange-500/50 hover:bg-orange-500/20 hover:text-orange-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                            Editar
                          </Link>
                          <form action={deletePart}>
                            <input type="hidden" name="partId" value={part.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-200"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
