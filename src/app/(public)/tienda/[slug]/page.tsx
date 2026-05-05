import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { TrackView } from "@/app/_components/track-view";
import { PublicNavSession } from "@/app/_components/public-nav-session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, municipio, provincia")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!store) return { title: "Tienda no encontrada" };

  const provinciaName = store.provincia ? PROVINCIA_MAP.get(store.provincia)?.name : null;
  const location = [store.municipio, provinciaName].filter(Boolean).join(", ");
  const title = store.name;
  const description = `Repuestos automotrices en ${store.name}${location ? ` — ${location}` : ""}. Consulta disponibilidad y precios por WhatsApp.`;

  return {
    title,
    description,
    openGraph: {
      title: `${store.name} — Cuba Mecánica`,
      description,
    },
  };
}

export default async function TiendaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch store by slug
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, description, whatsapp_number, provincia, municipio, direccion, logo_url, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!store) notFound();

  // Fetch store's public parts
  const { data: parts } = await supabase
    .from("parts")
    .select("id, sku, name, brand, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, price, quantity_on_hand, image_urls")
    .eq("store_id", store.id)
    .eq("is_public", true)
    .eq("is_active", true)
    .gt("quantity_on_hand", 0)
    .order("name")
    .limit(200);

  const allParts = parts ?? [];
  const provinciaName = store.provincia ? PROVINCIA_MAP.get(store.provincia)?.name : null;
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;

  // Google Maps URL
  const addressParts = [store.direccion, store.municipio, provinciaName, "Cuba"].filter(Boolean);
  const mapsUrl = addressParts.length > 1
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(", "))}`
    : null;

  // WhatsApp URL
  const whatsappUrl = store.whatsapp_number
    ? `https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(`Hola, vi tu tienda "${store.name}" en Cuba Mecánica y me gustaría consultar sobre una pieza.`)}`
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubamecanica.com";
  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: store.name,
    description: store.description ?? undefined,
    url: `${siteUrl}/tienda/${store.slug}`,
    image: store.logo_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-logos/${store.logo_url}`
      : undefined,
    telephone: store.whatsapp_number ? `+${store.whatsapp_number}` : undefined,
    address:
      store.municipio || store.direccion
        ? {
            "@type": "PostalAddress",
            streetAddress: store.direccion ?? undefined,
            addressLocality: store.municipio ?? undefined,
            addressRegion: provinciaName ?? undefined,
            addressCountry: "CU",
          }
        : undefined,
    areaServed: { "@type": "Country", name: "Cuba" },
  };

  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <TrackView storeId={store.id} pageType="store" />
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
              Buscar repuestos
            </Link>
            <PublicNavSession variant="dark" />
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
        {/* Store header */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {store.logo_url ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-logos/${store.logo_url}`}
                    alt={`Logo de ${store.name}`}
                    className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-700 text-lg font-bold text-white shadow-lg shadow-orange-500/30">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{store.name}</h1>
                  {store.description && (
                    <p className="mt-1 text-sm text-muted">{store.description}</p>
                  )}
                </div>
              </div>

              {/* Location */}
              {store.municipio && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    {store.direccion && `${store.direccion}, `}{store.municipio}{provinciaName && `, ${provinciaName}`}
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                      </svg>
                      Cómo llegar
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="rounded-full bg-accent-light px-3 py-1 font-semibold text-accent">
                  {allParts.length} pieza{allParts.length !== 1 ? "s" : ""} disponible{allParts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* WhatsApp CTA */}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Parts grid */}
        {allParts.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <div className="rounded-md bg-zinc-800 p-4 text-zinc-500">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold">Sin piezas disponibles</h3>
            <p className="mt-1 text-sm text-muted">Esta tienda aún no ha publicado piezas.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allParts.map((part) => {
              const imgs = (part.image_urls as string[]) ?? [];
              const whatsappText = encodeURIComponent(
                `Hola, vi en tu tienda "${store.name}" esta pieza:\n• ${part.name}\n• SKU: ${part.sku}\n• Vehículo: ${part.vehicle_make} ${part.vehicle_model}${part.vehicle_year_from ? ` (${part.vehicle_year_from}–${part.vehicle_year_to})` : ""}\n${part.price != null ? `• Precio: $${Number(part.price).toLocaleString("es-CU")}\n` : ""}\n¿Está disponible?`,
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
                    <Link href={`/pieza/${part.id}`} className="hover:text-accent">
                      <h2 className="text-sm font-semibold leading-snug sm:text-base">{part.name}</h2>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent sm:text-xs">
                        {part.brand}
                      </span>
                      <span className="text-xs text-muted">
                        {part.vehicle_make} {part.vehicle_model}
                        {part.vehicle_year_from && ` (${part.vehicle_year_from}–${part.vehicle_year_to})`}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between border-t border-border pt-3 mt-3">
                      <div>
                        {part.price != null ? (
                          <p className="text-xl font-bold text-accent">${Number(part.price).toLocaleString("es-CU")}</p>
                        ) : (
                          <span className="text-sm font-medium text-amber-300">Consultar precio</span>
                        )}
                        <span className="text-xs text-muted">{part.quantity_on_hand} disp.</span>
                      </div>
                      {store.whatsapp_number && (
                        <a
                          href={`https://wa.me/${store.whatsapp_number}?text=${whatsappText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-zinc-500 sm:px-6">
          <p>&copy; {new Date().getFullYear()} Cuba Mecánica. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
