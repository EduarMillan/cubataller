import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { getUserService } from "@/lib/queries/service";
import { logout } from "@/app/(auth)/_actions";

export const metadata: Metadata = {
  title: "Elige tu tipo de cuenta",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If already set up, send them to the right place
  const store = await getUserStore();
  if (store) redirect("/dashboard");
  const service = await getUserService();
  if (service) redirect("/mi-servicio");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-10">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <div className="flex justify-center">
            <img
              src="/cubamecanica.png"
              alt="Cuba Mecánica"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            ¿Qué tipo de cuenta quieres crear?
          </h1>
          <p className="mt-2 text-sm text-muted">
            Elige la opción que mejor describe tu negocio. Podrás configurar los detalles en el siguiente paso.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Store option */}
          <Link
            href="/dashboard/crear-tienda"
            className="group relative flex flex-col overflow-hidden rounded-lg border border-orange-500/30 bg-zinc-900 p-6 shadow-xl transition-all hover:border-orange-500/60 hover:shadow-orange-500/10"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl transition-all group-hover:bg-orange-500/20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-md bg-orange-600 text-white shadow-lg shadow-orange-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <h2 className="relative mt-4 text-lg font-bold text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Tienda de repuestos</h2>
            <p className="relative mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
              Vendes repuestos automotrices. Accedes a un panel completo con inventario, ventas, métricas y página pública.
            </p>
            <ul className="relative mt-4 space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Gestión de inventario
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Registro de ventas
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Prueba gratuita, luego mensual
              </li>
            </ul>
            <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-orange-400 group-hover:text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Crear tienda
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>

          {/* Service option */}
          <Link
            href="/mi-servicio"
            className="group relative flex flex-col overflow-hidden rounded-lg border border-emerald-500/30 bg-zinc-900 p-6 shadow-xl transition-all hover:border-emerald-500/60 hover:shadow-emerald-500/10"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <h2 className="relative mt-4 text-lg font-bold text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Servicio automotriz</h2>
            <p className="relative mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
              Ofreces un servicio (mecánica, tornería, electricidad, etc.). Apareces en el directorio para que los clientes te encuentren.
            </p>
            <ul className="relative mt-4 space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Ficha pública con WhatsApp y horarios
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Filtros por categoría y ubicación
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-400">100% gratis</span>
              </li>
            </ul>
            <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-emerald-400 group-hover:text-emerald-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Registrar servicio
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-muted">
          <span>Sesión: {user.email}</span>
          <span>·</span>
          <form action={logout}>
            <button type="submit" className="font-medium hover:text-red-600">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
