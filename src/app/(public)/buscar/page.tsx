import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Tooltip } from "@/app/_components/tooltip";
import { SearchLocationSelects } from "@/app/_components/search-location-selects";
import { SortSelect } from "@/app/_components/sort-select";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { PublicNavSession } from "@/app/_components/public-nav-session";
import { DistancesProvider } from "@/app/_components/distances-provider";
import { EnableLocationButton } from "@/app/_components/enable-location-button";
import { DistanceBadge } from "@/app/_components/distance-badge";

export const metadata: Metadata = {
  title: "Buscar repuestos",
  description:
    "Busca repuestos automotrices por marca, modelo, año y ubicación. Encuentra piezas disponibles en tiendas cerca de ti en Cuba.",
  openGraph: {
    title: "Buscar repuestos — Cuba Mecánica",
    description:
      "Busca repuestos automotrices por marca, modelo, año y ubicación en Cuba.",
  },
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    marca?: string;
    modelo?: string;
    anio?: string;
    q?: string;
    provincia?: string;
    municipio?: string;
    orden?: string;
  }>;
}) {
  const { marca, modelo, anio, q, provincia, municipio, orden } = await searchParams;
  const hasFilters = marca || modelo || anio || q || provincia || municipio;

  type Part = {
    id: string;
    sku: string;
    name: string;
    brand: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year_from: number | null;
    vehicle_year_to: number | null;
    price: number | null;
    quantity_on_hand: number;
    image_urls: string[] | null;
    store_id: string;
  };

  let parts: Part[] = [];
  let storePhones: Record<string, string | null> = {};
  let storeLocations: Record<string, { provincia: string | null; municipio: string | null; direccion: string | null; storeName: string | null; storeSlug: string | null; logoUrl: string | null }> = {};

  if (hasFilters) {
    const supabase = await createSupabaseServerClient();

    // Build parts query — we join store info for location filtering
    let query = supabase
      .from("parts")
      .select(
        "id, sku, name, brand, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, price, quantity_on_hand, image_urls, store_id, stores!inner(name, slug, provincia, municipio, direccion, whatsapp_number, logo_url, is_active)",
      )
      .eq("is_public", true)
      .eq("is_active", true)
      .eq("stores.is_active", true)
      .gte("quantity_on_hand", 0)
      .order("name")
      .limit(80);

    if (marca) query = query.ilike("vehicle_make", `%${marca}%`);
    if (modelo) query = query.ilike("vehicle_model", `%${modelo}%`);
    if (anio) {
      const year = parseInt(anio, 10);
      query = query.lte("vehicle_year_from", year).gte("vehicle_year_to", year);
    }
    if (q) query = query.ilike("name", `%${q}%`);

    // Location filters on the store join
    if (provincia) query = query.eq("stores.provincia", provincia);
    if (municipio) query = query.eq("stores.municipio", municipio);

    const { data } = await query;

    // Extract parts and store info from the joined result
    const raw = (data ?? []) as unknown as Array<
      Part & {
        stores: { name: string; slug: string; provincia: string | null; municipio: string | null; direccion: string | null; whatsapp_number: string | null; logo_url: string | null; is_active: boolean };
      }
    >;

    for (const row of raw) {
      const { stores: storeInfo, ...part } = row;
      parts.push(part);
      storeLocations[part.store_id] = {
        provincia: storeInfo.provincia,
        municipio: storeInfo.municipio,
        direccion: storeInfo.direccion,
        storeName: storeInfo.name,
        storeSlug: storeInfo.slug,
        logoUrl: storeInfo.logo_url,
      };
      storePhones[part.store_id] = storeInfo.whatsapp_number;
    }

    // Sort results based on selected criteria
    if (orden === "precio_asc") {
      parts.sort((a, b) => {
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;  // sin precio al final
        if (b.price == null) return -1;
        return Number(a.price) - Number(b.price);
      });
    } else if (orden === "precio_desc") {
      parts.sort((a, b) => {
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return Number(b.price) - Number(a.price);
      });
    } else if (orden === "stock") {
      parts.sort((a, b) => b.quantity_on_hand - a.quantity_on_hand);
    }
    // default: name order from DB query
  }

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;
  const logoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-logos/`;
  const provinciaName = provincia ? PROVINCIA_MAP.get(provincia)?.name : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center">
            <img
              src="/cubamecanica.png"
              alt="Cuba Mecánica"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>
          <div className="flex items-center gap-2">
            <PublicNavSession variant="dark" />
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
        <DistancesProvider>
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Buscar repuestos</h1>
          <p className="mt-2 text-muted">
            Encuentra piezas cerca de ti filtrando por ubicación, marca, modelo y año.
          </p>
        </header>

        {/* Filters */}
        <form className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          {/* Location filters */}
          <div className="grid gap-3 sm:grid-cols-2">
            <SearchLocationSelects
              defaultProvincia={provincia}
              defaultMunicipio={municipio}
              selectClassName="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Part filters */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <Tooltip content="Marca del vehículo. Ej: Lada, Moskvich, Toyota, Hyundai, Geely.">
              <input
                name="marca"
                type="text"
                placeholder="Marca (ej: Lada)"
                defaultValue={marca}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
            </Tooltip>
            <Tooltip content="Modelo del vehículo. Ej: Niva, 2107, Corolla, Accent.">
              <input
                name="modelo"
                type="text"
                placeholder="Modelo (ej: Niva)"
                defaultValue={modelo}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
            </Tooltip>
            <Tooltip content="Año de fabricación del vehículo. Filtra piezas compatibles con ese año.">
              <input
                name="anio"
                type="number"
                placeholder="Año"
                min={1950}
                max={2100}
                defaultValue={anio}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
            </Tooltip>
            <Tooltip content="Busca por nombre de la pieza. Ej: pastillas de freno, filtro de aceite, amortiguador.">
              <input
                name="q"
                type="text"
                placeholder="Nombre de la pieza"
                defaultValue={q}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
            </Tooltip>
            <button
              type="submit"
              className="col-span-2 sm:col-span-1 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Active location filter indicator */}
        {(provinciaName || municipio) && hasFilters && (
          <div className="flex items-center gap-2 rounded-md border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span>
              Mostrando resultados en{" "}
              <strong>{municipio ? `${municipio}, ` : ""}{provinciaName}</strong>
            </span>
          </div>
        )}

        {/* Results */}
        {hasFilters && parts.length === 0 && (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <div className="rounded-md bg-zinc-800 p-4 text-zinc-500">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold">Sin resultados</h3>
            <p className="mt-1 text-sm text-muted">
              No se encontraron repuestos con esos filtros.
              {(provincia || municipio) && " Intenta ampliar la búsqueda eliminando el filtro de ubicación."}
              {!provincia && !municipio && " Intenta con otros términos."}
            </p>
          </div>
        )}

        {parts.length > 0 && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {parts.length} resultado{parts.length !== 1 ? "s" : ""} encontrado{parts.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <EnableLocationButton />
                <SortSelect />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {parts.map((part) => {
                const imgs = (part.image_urls as string[]) ?? [];
                const phone = storePhones[part.store_id];
                const loc = storeLocations[part.store_id];
                const whatsappText = encodeURIComponent(
                  `Hola, me interesa la pieza:\n• ${part.name}\n• SKU: ${part.sku}\n• Vehículo: ${part.vehicle_make} ${part.vehicle_model}${part.vehicle_year_from ? ` (${part.vehicle_year_from}–${part.vehicle_year_to})` : ""}\n\n¿Cuál es el precio y disponibilidad?`,
                );

                return (
                  <article
                    key={part.id}
                    className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-md transition-all hover:border-orange-500/50 hover:shadow-orange-500/10"
                  >
                    {/* Image */}
                    <Link href={`/pieza/${part.id}`}>
                      {imgs.length > 0 ? (
                        <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-zinc-800 sm:h-48">
                          <img
                            src={`${storageBase}${imgs[0]}`}
                            alt={part.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          {imgs.length > 1 && (
                            <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                              +{imgs.length - 1} foto{imgs.length - 1 > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center rounded-t-lg bg-zinc-800 text-zinc-600 sm:h-48">
                          <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/pieza/${part.id}`} className="hover:text-accent">
                          <h2 className="text-sm font-semibold leading-snug sm:text-base">{part.name}</h2>
                        </Link>
                        <span className="shrink-0 rounded-lg bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent sm:text-xs">
                          {part.brand}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {part.vehicle_make} {part.vehicle_model}
                        {part.vehicle_year_from &&
                          ` (${part.vehicle_year_from}–${part.vehicle_year_to})`}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-500 sm:text-[11px]">
                        SKU: {part.sku}
                      </p>

                      {/* Store name with optional logo */}
                      {loc?.storeName && loc.storeSlug && (
                        <Link
                          href={`/tienda/${loc.storeSlug}`}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                        >
                          {loc.logoUrl && (
                            <img
                              src={`${logoBase}${loc.logoUrl}`}
                              alt=""
                              className="h-4 w-4 shrink-0 rounded object-cover"
                            />
                          )}
                          <span className="line-clamp-1">{loc.storeName}</span>
                        </Link>
                      )}

                      {/* Location badge + directions */}
                      {loc && loc.municipio && (() => {
                        const addressParts = [loc.direccion, loc.municipio, loc.provincia ? PROVINCIA_MAP.get(loc.provincia)?.name : null, "Cuba"].filter(Boolean);
                        const mapsQuery = encodeURIComponent(addressParts.join(", "));
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="flex items-center gap-1 text-[11px] text-muted sm:text-xs">
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                              </svg>
                              <span className="line-clamp-1">{loc.municipio}{loc.provincia ? `, ${PROVINCIA_MAP.get(loc.provincia)?.name ?? loc.provincia}` : ""}</span>
                            </p>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 sm:text-xs"
                            >
                              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                              </svg>
                              Cómo llegar
                            </a>
                            <DistanceBadge municipio={loc.municipio} provincia={loc.provincia} />
                          </div>
                        );
                      })()}

                      <div className="mt-auto border-t border-border pt-3 mt-3 sm:pt-4 sm:mt-4">
                        <div className="flex items-center justify-between">
                          {part.price != null ? (
                            <p className="text-xl font-bold text-accent sm:text-2xl">
                              ${Number(part.price).toLocaleString("es-CU")}
                            </p>
                          ) : (
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30">
                              Consultar precio
                            </span>
                          )}
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                            {part.quantity_on_hand} disp.
                          </span>
                        </div>
                        {phone && (
                          <a
                            href={`https://wa.me/${phone}?text=${whatsappText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {part.price != null ? "Consultar por WhatsApp" : "Consultar precio"}
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {!hasFilters && (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <div className="rounded-md bg-orange-500/10 p-4 text-orange-400 ring-1 ring-orange-500/20">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold">
              Busca tu repuesto
            </h3>
            <p className="mt-1 text-sm text-muted">
              Selecciona tu provincia y municipio para ver resultados cerca de ti, o usa los filtros de marca, modelo y año.
            </p>
          </div>
        )}
        </DistancesProvider>
      </main>
    </div>
  );
}
