import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SearchLocationSelects } from "@/app/_components/search-location-selects";
import { PublicNavSession } from "@/app/_components/public-nav-session";
import { SERVICE_CATEGORIES, getServiceCategory, type WeeklyHours } from "@/lib/service-categories";
import { getOpenStatus } from "@/lib/service-hours";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { DistancesProvider } from "@/app/_components/distances-provider";
import { EnableLocationButton } from "@/app/_components/enable-location-button";
import { DistanceBadge } from "@/app/_components/distance-badge";

export const metadata: Metadata = {
  title: "Servicios automotrices",
  description:
    "Encuentra mecánicos, torneros, electricistas automotrices y otros servicios para tu vehículo cerca de ti en Cuba.",
  openGraph: {
    title: "Servicios automotrices — Cuba Mecánica",
    description:
      "Mecánicos, torneros, electricistas y más. Encuentra el servicio que necesitas para tu auto.",
  },
};

const HERO_IMAGE = "/fondo.jpg";

const darkInputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  whatsapp_number: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  logo_url: string | null;
  hours: WeeklyHours | null;
};

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    provincia?: string;
    municipio?: string;
    q?: string;
  }>;
}) {
  const { categoria, provincia, municipio, q } = await searchParams;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("service_providers")
    .select(
      "id, name, slug, category, description, whatsapp_number, provincia, municipio, direccion, logo_url, hours",
    )
    .eq("is_active", true)
    .order("name")
    .limit(120);

  if (categoria) query = query.eq("category", categoria);
  if (provincia) query = query.eq("provincia", provincia);
  if (municipio) query = query.eq("municipio", municipio);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);

  const { data } = await query;
  const services = (data ?? []) as ServiceRow[];

  const logoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-logos/`;

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/buscar"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:text-orange-400"
            >
              Repuestos
            </Link>
            <PublicNavSession variant="dark" />
          </div>
        </div>
      </nav>

      {/* Hero + search */}
      <section className="relative isolate overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_IMAGE} alt="" aria-hidden="true" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Directorio
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              SERVICIOS AUTOMOTRICES
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-300 sm:text-base">
              Mecánicos, torneros, electricistas y más. Encuentra el servicio que necesitas para tu auto.
            </p>
          </div>

          <form
            action="/servicios"
            className="mx-auto mt-6 max-w-3xl rounded-lg border border-zinc-800 bg-zinc-900/85 p-4 shadow-2xl backdrop-blur sm:mt-8 sm:p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchLocationSelects
                defaultProvincia={provincia}
                defaultMunicipio={municipio}
                selectClassName={darkInputClass}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select
                name="categoria"
                defaultValue={categoria ?? ""}
                className={darkInputClass}
              >
                <option value="">Todas las categorías</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                name="q"
                type="text"
                defaultValue={q ?? ""}
                placeholder="Buscar por nombre..."
                className={darkInputClass}
              />
            </div>

            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 active:scale-[0.99] [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Buscar servicio
            </button>
          </form>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-zinc-800 bg-zinc-950 py-4 sm:py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              href="/servicios"
              label="Todas"
              emoji="⭐"
              active={!categoria}
            />
            {SERVICE_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.code}
                href={buildFilterUrl({ categoria: c.code, provincia, municipio, q })}
                label={c.label}
                emoji={c.emoji}
                active={categoria === c.code}
              />
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <DistancesProvider>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              {services.length === 0
                ? "Sin resultados"
                : `${services.length} ${services.length === 1 ? "servicio" : "servicios"}`}
            </h2>
            {(categoria || provincia || municipio || q) && (
              <Link
                href="/servicios"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
          <EnableLocationButton />
        </header>

        {services.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
            <p className="text-sm text-zinc-400">
              No encontramos servicios con esos filtros. Prueba ampliando la búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} logoBase={logoBase} />
            ))}
          </div>
        )}
        </DistancesProvider>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-zinc-500 sm:px-6 sm:text-sm">
          <p>
            ¿Ofreces un servicio automotriz?{" "}
            <Link href="/registro" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function buildFilterUrl({
  categoria,
  provincia,
  municipio,
  q,
}: {
  categoria?: string;
  provincia?: string;
  municipio?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (categoria) params.set("categoria", categoria);
  if (provincia) params.set("provincia", provincia);
  if (municipio) params.set("municipio", municipio);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/servicios?${qs}` : "/servicios";
}

function CategoryChip({
  href,
  label,
  emoji,
  active,
}: {
  href: string;
  label: string;
  emoji: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-emerald-500 bg-emerald-500 text-zinc-950"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400"
      }`}
    >
      <span>{emoji}</span>
      {label}
    </Link>
  );
}

function ServiceCard({
  service,
  logoBase,
}: {
  service: ServiceRow;
  logoBase: string;
}) {
  const category = getServiceCategory(service.category);
  const provinciaName = service.provincia ? PROVINCIA_MAP.get(service.provincia)?.name : null;
  const locationStr = [service.municipio, provinciaName].filter(Boolean).join(", ");

  const whatsappUrl = service.whatsapp_number
    ? `https://wa.me/${service.whatsapp_number}?text=${encodeURIComponent(`Hola, vi tu servicio "${service.name}" en Cuba Mecánica.`)}`
    : null;

  const addressParts = [service.direccion, service.municipio, provinciaName, "Cuba"].filter(Boolean);
  const mapsUrl = addressParts.length > 1
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(", "))}`
    : null;

  const status = getOpenStatus(service.hours);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-md transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/10">
      <Link href={`/servicios/${service.slug}`} className="flex-1 p-5">
        <div className="flex items-start gap-3">
          {service.logo_url ? (
            <img
              src={`${logoBase}${service.logo_url}`}
              alt={`Logo de ${service.name}`}
              className="h-14 w-14 shrink-0 rounded-md border border-zinc-700 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-xl font-bold text-white shadow-md shadow-emerald-500/30">
              {service.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold tracking-tight text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]">{service.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  <span>{category.emoji}</span>
                  {category.label}
                </span>
              )}
              {status.state === "open" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {status.label}
                </span>
              )}
              {status.state === "closed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {service.description && (
          <p className="mt-3 line-clamp-2 text-xs text-zinc-400">{service.description}</p>
        )}

        {locationStr && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-300">
            <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {service.direccion ? `${service.direccion} · ${locationStr}` : locationStr}
          </p>
        )}

        <div className="mt-2">
          <DistanceBadge municipio={service.municipio} provincia={service.provincia} />
        </div>
      </Link>

      {(whatsappUrl || mapsUrl) && (
        <div className="flex border-t border-zinc-800">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/25 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-orange-300 hover:bg-orange-500/25 [font-family:var(--font-space-grotesk),system-ui,sans-serif] ${whatsappUrl ? "border-l border-zinc-800 bg-orange-500/15" : "bg-orange-500/15"}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
              </svg>
              Cómo llegar
            </a>
          )}
        </div>
      )}
    </article>
  );
}
