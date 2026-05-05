import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { getUserService } from "@/lib/queries/service";
import { createStore } from "./_action";
import { InfoTip } from "@/app/_components/tooltip";
import { LocationSelects } from "@/app/_components/location-selects";

export default async function CrearTiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await getUserStore();
  if (store) redirect("/dashboard");

  // Users who have a service cannot also have a store — show a clear message instead of silently redirecting.
  const service = await getUserService();
  if (service) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <section className="w-full max-w-xl">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold text-amber-200 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  No puedes crear una tienda
                </h1>
                <p className="mt-1 text-sm text-amber-100/80">
                  El correo <strong>{user?.email}</strong> ya está registrado en la aplicación con un servicio (<strong>{service.name}</strong>).
                  Un mismo correo solo puede tener una tienda <em>o</em> un servicio, no ambos.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/mi-servicio"
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                  >
                    Ir a mi servicio
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-500/50 hover:text-orange-400"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="w-full max-w-lg space-y-6">
        <header className="text-center">
          <div className="flex justify-center">
            <img
              src="/cubamecanica.png"
              alt="Cuba Mecánica"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Crear tu tienda
          </h1>
          <p className="mt-2 text-sm text-muted">
            Configura los datos básicos para comenzar a operar.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          action={createStore}
          className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 shadow-md"
        >
          <div className="space-y-1.5">
            <label htmlFor="name" className="flex items-center text-sm font-medium">
              Nombre de la tienda
              <InfoTip content="El nombre comercial de tu negocio. Es lo que verán tus clientes al buscar repuestos." />
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="Ej: Repuestos El Motor"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="flex items-center text-sm font-medium">
              Identificador (URL)
              <InfoTip content="Un identificador único para tu tienda en la plataforma. Solo letras minúsculas, números y guiones. Ej: mi-tienda-123" />
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              maxLength={60}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              placeholder="ej: repuestos-el-motor"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
            <p className="text-xs text-muted">
              Solo letras minúsculas, números y guiones.
            </p>
          </div>

          <LocationSelects />

          <div className="space-y-1.5">
            <label htmlFor="direccion" className="flex items-center text-sm font-medium">
              Dirección del local
              <InfoTip content="Dirección exacta de tu tienda (calle y número). Tus clientes podrán usar GPS para llegar." />
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              maxLength={200}
              placeholder="Ej: Calle Obispo 123, entre Habana y Compostela"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
            <p className="text-xs text-muted">
              Opcional pero recomendado. Permite a tus clientes navegar con GPS hasta tu local.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="currency" className="flex items-center text-sm font-medium">
              Moneda de tus precios
              <InfoTip content="Moneda en la que mostrarás los precios de tus repuestos. Puedes cambiarla luego en configuración." />
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue="CUP"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            >
              <option value="CUP">CUP — Peso cubano</option>
              <option value="USD">USD — Dólar estadounidense</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className="flex items-center text-sm font-medium">
              WhatsApp de contacto
              <InfoTip content="Número de WhatsApp donde tus clientes pueden comunicarse contigo. Incluye el código de país (53 para Cuba)." />
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              placeholder="Ej: 5351234567"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Crear tienda
          </button>
        </form>
      </section>
    </div>
  );
}
