import Link from "next/link";
import { SearchLocationSelects } from "@/app/_components/search-location-selects";
import { PublicNavSession } from "@/app/_components/public-nav-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80";

const darkInputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const [storesResult, partsResult, servicesResult, settingsResult] =
    await Promise.all([
      supabase
        .from("stores")
        .select("id, municipio", { count: "exact", head: false })
        .eq("is_active", true),
      supabase
        .from("parts")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("is_public", true)
        .gt("quantity_on_hand", 0),
      supabase
        .from("service_providers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("platform_settings")
        .select("trial_days")
        .eq("id", true)
        .single(),
    ]);

  const trialDays = settingsResult.data?.trial_days ?? 90;
  const storeCount = storesResult.count ?? 0;
  const partCount = partsResult.count ?? 0;
  const serviceCount = servicesResult.count ?? 0;
  const municipioCount = new Set(
    (storesResult.data ?? []).map((s) => s.municipio).filter(Boolean),
  ).size;

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100 [font-family:var(--font-geist-sans),system-ui,sans-serif]">
      {/* ── Dark navbar ── */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/cubamecanica.png"
              alt="Cuba Mecánica"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>
          <div className="hidden items-center gap-6 md:flex [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            <Link
              href="/buscar"
              className="text-sm font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:text-orange-500"
            >
              Repuestos
            </Link>
            <Link
              href="/servicios"
              className="text-sm font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:text-orange-500"
            >
              Servicios
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicNavSession variant="dark" />
          </div>
        </div>
      </nav>

      {/* ── Hero with engine background ── */}
      <section className="relative isolate">
        {/* Background image + overlays (overflow-hidden lives here so it doesn't clip the stats bar below) */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-zinc-950/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <span className="mb-4 inline-block border-l-2 border-orange-500 pl-3 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Marketplace automotriz Cuba
            </span>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              ENCUENTRA EL REPUESTO
              <br />
              <span className="text-orange-500">QUE NECESITAS</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-300 sm:text-lg">
              Busca por marca, modelo y año. Conecta con tiendas y talleres
              cerca de ti. Compra directo por WhatsApp.
            </p>
          </div>

          {/* Search form */}
          <form
            action="/buscar"
            className="mt-8 max-w-4xl rounded-lg border border-zinc-800 bg-zinc-900/85 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur sm:mt-10 sm:p-6"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchLocationSelects selectClassName={darkInputClass} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input
                name="marca"
                type="text"
                placeholder="Marca (ej: Lada)"
                className={darkInputClass}
              />
              <input
                name="modelo"
                type="text"
                placeholder="Modelo (ej: Niva)"
                className={darkInputClass}
              />
              <input
                name="anio"
                type="number"
                placeholder="Año (ej: 2020)"
                className={darkInputClass}
              />
              <input
                name="q"
                type="text"
                placeholder="Pieza (ej: parachoques)"
                className={darkInputClass}
              />
            </div>
            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-500 active:scale-[0.99] sm:mt-5 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              Buscar repuestos
            </button>
          </form>
        </div>

        {/* Stats bar — flujo normal en mobile, overlap solo en desktop */}
        <div className="relative mx-auto mt-8 max-w-7xl px-4 sm:mt-0 sm:-mb-14 sm:px-6">
          <div className="grid grid-cols-2 gap-y-6 divide-x divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl sm:grid-cols-4 sm:gap-y-0 sm:p-6 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            <StatCell
              value={storeCount}
              label={
                storeCount === 1 ? "Tienda registrada" : "Tiendas registradas"
              }
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              }
            />
            <StatCell
              value={partCount}
              label="Repuestos publicados"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              }
            />
            <StatCell
              value={serviceCount}
              label={
                serviceCount === 1
                  ? "Servicio automotriz"
                  : "Servicios automotrices"
              }
              accent="emerald"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
                  />
                </svg>
              }
            />
            <StatCell
              value={municipioCount}
              label={
                municipioCount === 1
                  ? "Municipio con cobertura"
                  : "Municipios con cobertura"
              }
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Dual CTA: Crear tienda / Registrar servicio ── */}
      <section className="bg-zinc-950 pt-12 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Únete a la red
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              ¿VENDES O REPARAS?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
              Publica tu negocio en Cuba Mecánica y aparece en las búsquedas de miles
              de clientes que buscan repuestos y servicios automotrices en Cuba.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:gap-6 lg:grid-cols-2">
            {/* Crear tienda */}
            <Link
              href="/registro"
              className="group relative isolate flex flex-col overflow-hidden rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-600/20 via-zinc-900 to-zinc-900 p-6 shadow-xl transition-all hover:border-orange-500/60 hover:shadow-orange-500/20 sm:p-8"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition-all group-hover:bg-orange-500/20" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-orange-600 text-white shadow-lg shadow-orange-500/30">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                    />
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  Tiendas de repuestos
                </span>
              </div>
              <h3 className="relative mt-5 text-2xl font-bold text-white sm:text-3xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Crear mi tienda
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Vende tus repuestos en línea con inventario, ventas, métricas y
                página pública. Prueba gratis por {trialDays} días, sin tarjeta.
              </p>
              <ul className="relative mt-5 space-y-2 text-sm text-zinc-300">
                <DarkBullet>Catálogo público con WhatsApp directo</DarkBullet>
                <DarkBullet>Control de stock y registro de ventas</DarkBullet>
                <DarkBullet>Métricas de visitas y desempeño</DarkBullet>
              </ul>
              <span className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-md bg-orange-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 transition-all group-hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Empezar gratis
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            </Link>

            {/* Registrar servicio */}
            <Link
              href="/registro"
              className="group relative isolate flex flex-col overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 via-zinc-900 to-zinc-900 p-6 shadow-xl transition-all hover:border-emerald-500/60 hover:shadow-emerald-500/20 sm:p-8"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437"
                    />
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  Talleres y servicios
                </span>
              </div>
              <h3 className="relative mt-5 text-2xl font-bold text-white sm:text-3xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Registrar mi servicio
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Mecánicos, torneros, electricistas, gomerías y más. Aparece en
                el directorio público —{" "}
                <strong className="text-emerald-400">100% gratis</strong>.
              </p>
              <ul className="relative mt-5 space-y-2 text-sm text-zinc-300">
                <DarkBullet color="emerald">
                  Ficha pública con WhatsApp y horarios
                </DarkBullet>
                <DarkBullet color="emerald">
                  Filtros por categoría y ubicación
                </DarkBullet>
                <DarkBullet color="emerald">Sin costo ni comisiones</DarkBullet>
              </ul>
              <span className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-md border-2 border-emerald-500 bg-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider text-emerald-400 transition-all group-hover:bg-emerald-500 group-hover:text-zinc-950 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Registrarme gratis
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Workshop services / for buyers ── */}
      <section className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Para compradores
          </span>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            ENCUENTRA, COMPARA Y CONTACTA
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
            Filtra por vehículo, año y municipio. Compara precios entre tiendas
            cercanas y contacta directo al vendedor por WhatsApp. Sin
            intermediarios, sin comisiones ocultas.
          </p>
          <ul className="mx-auto mt-6 max-w-xl space-y-3 text-left">
            <li className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">
                Búsqueda por provincia y municipio
              </span>
            </li>
            <li className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                  />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">
                Compatibilidad por marca, modelo y año
              </span>
            </li>
            <li className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
              </span>
              <span className="text-sm text-zinc-200">
                Contacto directo por WhatsApp
              </span>
            </li>
          </ul>
          <Link
            href="/buscar"
            className="mt-8 inline-flex items-center gap-2 rounded-md border-2 border-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-orange-400 transition-all hover:bg-orange-500 hover:text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Explorar repuestos
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Features grid (dark) ── */}
      <section className="bg-zinc-950 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Funcionalidades
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              TODO PARA OPERAR
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
              Herramientas diseñadas para el día a día de las tiendas y talleres
              automotrices.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            <DarkFeatureCard
              title="Buscador público"
              description="Tus clientes encuentran piezas filtrando por marca, modelo, año y compatibilidad."
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              }
            />
            <DarkFeatureCard
              title="Gestión de inventario"
              description="Control de stock con SKU, precios, entradas y salidas en tiempo real."
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              }
            />
            <DarkFeatureCard
              title="Ventas y cobros"
              description="Registra órdenes y gestiona cobros manuales por transferencia."
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              }
            />
            <DarkFeatureCard
              title="Métricas en tiempo real"
              description="Dashboard con ventas del día, alertas de stock bajo y resumen operativo."
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              }
            />
            <DarkFeatureCard
              title="WhatsApp directo"
              description="Tus clientes te escriben sin intermediarios desde la ficha de cada pieza."
              icon={
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
              }
            />
            <DarkFeatureCard
              title={`Prueba ${trialDays} días gratis`}
              description="Sin tarjeta, sin compromiso. Cancela cuando quieras."
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden border-t border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 py-16 sm:py-20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            ¿LISTO PARA EMPEZAR?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400 sm:text-base">
            Crea tu cuenta en minutos. Sin tarjeta, sin compromiso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-orange-500/30 transition-all hover:bg-orange-500 active:scale-[0.99] sm:w-auto [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              Crear mi tienda
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="/registro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-emerald-500 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-emerald-400 transition-all hover:bg-emerald-500 hover:text-zinc-950 sm:w-auto [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              Registrar mi servicio
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img
                src="/cubamecanica.png"
                alt="Cuba Mecánica"
                className="h-10 w-auto object-contain"
              />
              <p className="mt-3 max-w-xs text-xs text-zinc-500">
                Marketplace automotriz cubano. Repuestos y servicios al alcance
                de todos.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Comprar
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/buscar"
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    Buscar repuestos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/servicios"
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    Directorio de servicios
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Vender
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/registro"
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    Crear tienda
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registro"
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    Registrar servicio
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    Ingresar a mi panel
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Estado
              </h4>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                Plataforma operativa
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Cuba Mecánica. Todos los derechos
            reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCell({
  value,
  label,
  icon,
  accent = "orange",
}: {
  value: number;
  label: string;
  icon?: React.ReactNode;
  accent?: "orange" | "emerald";
}) {
  const color = accent === "emerald" ? "text-emerald-400" : "text-orange-500";
  const iconBg =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : "bg-orange-500/15 text-orange-400 ring-orange-500/30";
  return (
    <div className="flex flex-col items-center gap-2 px-3 text-center sm:px-6">
      {icon && (
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md ring-1 ${iconBg}`}
        >
          {icon}
        </span>
      )}
      <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>
        {value}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wider leading-snug text-zinc-300 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function DarkBullet({
  children,
  color = "orange",
}: {
  children: React.ReactNode;
  color?: "orange" | "emerald";
}) {
  const dot = color === "emerald" ? "bg-emerald-400" : "bg-orange-500";
  return (
    <li className="flex items-center gap-2.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span>{children}</span>
    </li>
  );
}

function DarkFeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 transition-all hover:border-orange-500/50 hover:bg-zinc-900 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20 transition-all group-hover:bg-orange-500/20">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
    </article>
  );
}
