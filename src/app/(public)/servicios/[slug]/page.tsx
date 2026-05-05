import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { DAYS_OF_WEEK, getServiceCategory, type WeeklyHours } from "@/lib/service-categories";
import { getOpenStatus } from "@/lib/service-hours";
import { PublicNavSession } from "@/app/_components/public-nav-session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("service_providers")
    .select("name, category, municipio, provincia")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return { title: "Servicio no encontrado" };

  const category = getServiceCategory(data.category as string);
  const provinciaName = data.provincia ? PROVINCIA_MAP.get(data.provincia as string)?.name : null;
  const location = [data.municipio, provinciaName].filter(Boolean).join(", ");

  return {
    title: data.name as string,
    description: `${category?.label ?? "Servicio automotriz"} en ${data.name}${location ? ` — ${location}` : ""}. Contacta por WhatsApp.`,
  };
}

export default async function ServicioDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: service } = await supabase
    .from("service_providers")
    .select(
      "id, name, slug, category, description, whatsapp_number, provincia, municipio, direccion, logo_url, hours",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) notFound();

  const category = getServiceCategory(service.category as string);
  const provinciaName = service.provincia ? PROVINCIA_MAP.get(service.provincia as string)?.name : null;
  const hours = (service.hours as WeeklyHours) ?? null;
  const status = getOpenStatus(hours);

  const addressParts = [service.direccion, service.municipio, provinciaName, "Cuba"].filter(Boolean);
  const mapsUrl = addressParts.length > 1
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(", "))}`
    : null;

  const whatsappUrl = service.whatsapp_number
    ? `https://wa.me/${service.whatsapp_number}?text=${encodeURIComponent(`Hola, vi tu servicio "${service.name}" en Cuba Mecánica y me gustaría consultar.`)}`
    : null;

  const logoUrl = service.logo_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-logos/${service.logo_url}`
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubamecanica.com";
  const dayMap: Record<string, string> = {
    mon: "https://schema.org/Monday",
    tue: "https://schema.org/Tuesday",
    wed: "https://schema.org/Wednesday",
    thu: "https://schema.org/Thursday",
    fri: "https://schema.org/Friday",
    sat: "https://schema.org/Saturday",
    sun: "https://schema.org/Sunday",
  };
  const parseHours = (range: string | null | undefined) => {
    if (!range) return null;
    const m = range.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    return m ? { open: m[1], close: m[2] } : null;
  };
  const openingHoursSpec = hours
    ? Object.entries(hours)
        .map(([day, range]) => {
          const parsed = parseHours(range);
          if (!parsed) return null;
          return {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: dayMap[day] ?? day,
            opens: parsed.open,
            closes: parsed.close,
          };
        })
        .filter(Boolean)
    : undefined;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: service.name as string,
    description: (service.description as string) ?? category?.label,
    url: `${siteUrl}/servicios/${service.slug as string}`,
    image: logoUrl ?? undefined,
    telephone: service.whatsapp_number ? `+${service.whatsapp_number as string}` : undefined,
    address:
      service.municipio || service.direccion
        ? {
            "@type": "PostalAddress",
            streetAddress: (service.direccion as string) ?? undefined,
            addressLocality: (service.municipio as string) ?? undefined,
            addressRegion: provinciaName ?? undefined,
            addressCountry: "CU",
          }
        : undefined,
    openingHoursSpecification: openingHoursSpec,
    areaServed: { "@type": "Country", name: "Cuba" },
  };

  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
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
              href="/servicios"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:text-orange-400"
            >
              Servicios
            </Link>
            <Link
              href="/buscar"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:text-orange-400 sm:inline-flex"
            >
              Repuestos
            </Link>
            <PublicNavSession variant="dark" />
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
        <Link
          href="/servicios"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Volver a servicios
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`Logo de ${service.name as string}`}
                    className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover shadow-sm sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 sm:h-16 sm:w-16 sm:text-2xl">
                    {(service.name as string).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{service.name as string}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {category && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                        <span>{category.emoji}</span>
                        {category.label}
                      </span>
                    )}
                    {status.state === "open" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {status.label}
                      </span>
                    )}
                    {status.state === "closed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {service.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                  {service.description as string}
                </p>
              )}
            </div>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Location + Hours grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Location */}
          {(service.municipio || service.direccion) && (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Ubicación
              </h2>
              <p className="mt-3 text-sm text-zinc-300">
                {service.direccion && (
                  <>
                    {service.direccion as string}
                    <br />
                  </>
                )}
                {[service.municipio, provinciaName].filter(Boolean).join(", ")}
              </p>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                  </svg>
                  Cómo llegar
                </a>
              )}
            </div>
          )}

          {/* Hours */}
          {hours && hasAnyHours(hours) && (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Horario de atención
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {DAYS_OF_WEEK.map((day) => {
                  const value = hours[day.key];
                  return (
                    <div key={day.key} className="flex justify-between gap-3">
                      <dt className="font-medium text-zinc-300">{day.label}</dt>
                      <dd className="text-zinc-400">{value || <span className="text-zinc-600">Cerrado</span>}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-zinc-500 sm:px-6 sm:text-sm">
          <p>&copy; {new Date().getFullYear()} Cuba Mecánica. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function hasAnyHours(h: WeeklyHours): boolean {
  return DAYS_OF_WEEK.some((d) => !!h[d.key]);
}
