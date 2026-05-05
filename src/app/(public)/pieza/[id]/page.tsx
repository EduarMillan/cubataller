import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { TrackView } from "@/app/_components/track-view";
import { PartGallery } from "@/app/_components/part-gallery";
import { PublicNavSession } from "@/app/_components/public-nav-session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("parts")
    .select("name, brand, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, price, image_urls, stores!inner(name)")
    .eq("id", id)
    .eq("is_public", true)
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .single();

  if (!data) return { title: "Pieza no encontrada" };

  const part = data as unknown as {
    name: string;
    brand: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year_from: number | null;
    vehicle_year_to: number | null;
    price: number | null;
    image_urls: string[] | null;
    stores: { name: string };
  };

  const vehicle = `${part.vehicle_make} ${part.vehicle_model}${part.vehicle_year_from ? ` (${part.vehicle_year_from}–${part.vehicle_year_to})` : ""}`;
  const title = `${part.name} — ${part.brand}`;
  const description = `${part.name} ${part.brand} compatible con ${vehicle}.${part.price != null ? ` Precio: $${Number(part.price).toLocaleString("es-CU")}` : " Consultar precio."} Disponible en ${part.stores.name}.`;

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;
  const images = part.image_urls?.length
    ? [{ url: `${storageBase}${part.image_urls[0]}`, alt: part.name }]
    : [];

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Cuba Mecánica`,
      description,
      images,
    },
  };
}

export default async function PiezaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch part with store info
  const { data } = await supabase
    .from("parts")
    .select(
      "id, sku, name, description, brand, vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to, price, quantity_on_hand, image_urls, store_id, is_public, is_active, stores!inner(name, slug, whatsapp_number, provincia, municipio, direccion, is_active)",
    )
    .eq("id", id)
    .eq("is_public", true)
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .single();

  if (!data) notFound();

  const part = data as unknown as {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    brand: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year_from: number | null;
    vehicle_year_to: number | null;
    price: number | null;
    quantity_on_hand: number;
    image_urls: string[] | null;
    store_id: string;
    stores: {
      name: string;
      slug: string;
      whatsapp_number: string | null;
      provincia: string | null;
      municipio: string | null;
      direccion: string | null;
    };
  };

  const store = part.stores;
  const imgs = part.image_urls ?? [];
  const provinciaName = store.provincia ? PROVINCIA_MAP.get(store.provincia)?.name : null;
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parts-images/`;

  // Google Maps
  const addressParts = [store.direccion, store.municipio, provinciaName, "Cuba"].filter(Boolean);
  const mapsUrl = addressParts.length > 1
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(", "))}`
    : null;

  // WhatsApp
  const whatsappText = encodeURIComponent(
    `Hola, vi esta pieza en Cuba Mecánica:\n• ${part.name}\n• SKU: ${part.sku}\n• Vehículo: ${part.vehicle_make} ${part.vehicle_model}${part.vehicle_year_from ? ` (${part.vehicle_year_from}–${part.vehicle_year_to})` : ""}\n${part.price != null ? `• Precio: $${Number(part.price).toLocaleString("es-CU")}\n` : ""}\n¿Está disponible?`,
  );
  const whatsappUrl = store.whatsapp_number
    ? `https://wa.me/${store.whatsapp_number}?text=${whatsappText}`
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cubamecanica.com";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    sku: part.sku,
    description: part.description ?? `${part.name} ${part.brand} compatible con ${part.vehicle_make} ${part.vehicle_model}`,
    brand: { "@type": "Brand", name: part.brand },
    image: imgs.map((img) => `${storageBase}${img}`),
    url: `${siteUrl}/pieza/${part.id}`,
    ...(part.price != null && {
      offers: {
        "@type": "Offer",
        price: part.price,
        priceCurrency: "CUP",
        availability:
          part.quantity_on_hand > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: store.name },
        url: `${siteUrl}/pieza/${part.id}`,
      },
    }),
    isRelatedTo: {
      "@type": "Vehicle",
      vehicleModelDate: part.vehicle_year_from
        ? `${part.vehicle_year_from}-${part.vehicle_year_to ?? part.vehicle_year_from}`
        : undefined,
      brand: { "@type": "Brand", name: part.vehicle_make },
      model: part.vehicle_model,
    },
  };

  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <TrackView storeId={part.store_id} pageType="part" partId={part.id} />
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/buscar" className="hover:text-accent">Buscar</Link>
          <span>/</span>
          <Link href={`/tienda/${store.slug}`} className="hover:text-accent">{store.name}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{part.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Images */}
          {imgs.length > 0 ? (
            <PartGallery images={imgs} alt={part.name} storageBase={storageBase} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900 text-zinc-600 sm:h-80">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}

          {/* Details */}
          <div className="space-y-5">
            {/* Title + brand */}
            <div>
              <span className="rounded-lg bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent">
                {part.brand}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{part.name}</h1>
              {part.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted">{part.description}</p>
              )}
            </div>

            {/* Vehicle compatibility */}
            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Vehículo compatible</p>
              <p className="mt-1 text-sm font-semibold">
                {part.vehicle_make} {part.vehicle_model}
                {part.vehicle_year_from && (
                  <span className="font-normal text-muted"> ({part.vehicle_year_from}–{part.vehicle_year_to})</span>
                )}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-500">SKU: {part.sku}</p>
            </div>

            {/* Price + stock */}
            <div className="flex items-end justify-between rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
              <div>
                {part.price != null ? (
                  <p className="text-3xl font-bold text-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">${Number(part.price).toLocaleString("es-CU")}</p>
                ) : (
                  <p className="text-lg font-semibold text-amber-300">Consultar precio</p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                part.quantity_on_hand > 5
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : part.quantity_on_hand > 0
                    ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                    : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
              }`}>
                {part.quantity_on_hand > 0
                  ? `${part.quantity_on_hand} disponible${part.quantity_on_hand !== 1 ? "s" : ""}`
                  : "Agotado"}
              </span>
            </div>

            {/* WhatsApp CTA */}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-md bg-emerald-500 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-[0.98] [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {part.price != null ? "WhatsApp" : "Consultar disponibilidad"}
              </a>
            )}

            {/* Store info card */}
            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Vendido por</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white shadow-md shadow-orange-500/30">
                  {store.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link href={`/tienda/${store.slug}`} className="text-sm font-semibold hover:text-accent">
                    {store.name}
                  </Link>
                  {store.municipio && (
                    <p className="text-xs text-muted">
                      {store.municipio}{provinciaName && `, ${provinciaName}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/tienda/${store.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
                >
                  Ver todas sus piezas
                </Link>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    Cómo llegar
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-zinc-500 sm:px-6">
          <p>&copy; {new Date().getFullYear()} Cuba Mecánica. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
