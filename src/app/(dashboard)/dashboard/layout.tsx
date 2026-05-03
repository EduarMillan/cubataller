import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/_actions";
import { MobileBottomNav, MobileHeader } from "@/app/_components/mobile-nav";
import { getUserStore } from "@/lib/queries/store";
import { SubscriptionBanner } from "@/app/_components/subscription-banner";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | FIXCAR" },
  robots: { index: false, follow: false },
};

const links = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inventario",
    label: "Inventario",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/ventas",
    label: "Ventas",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/configuracion",
    label: "Configuración",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/facturacion",
    label: "Mi Plan",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the user's store is deactivated
  const store = await getUserStore();
  if (store && !store.isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="mx-auto max-w-md rounded-lg border border-red-500/40 bg-surface p-8 shadow-2xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="mt-6 text-xl font-bold text-zinc-100">Tienda desactivada</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Tu tienda ha sido desactivada. Mientras esté inactiva, tu inventario no aparecerá en las búsquedas públicas y no podrás acceder al panel de gestión.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Para reactivar tu tienda, contacta al administrador de la plataforma.
          </p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Fetch subscription and platform settings for the banner
  let subStatus = "";
  let trialEndsAt: string | null = null;
  let periodEndsAt: string | null = null;
  let gracePeriodDays = 5;
  let adminWhatsapp: string | null = null;
  let monthlyPrice = 15000;

  if (store) {
    const [subResult, settingsResult] = await Promise.all([
      supabase
        .from("store_subscriptions")
        .select("status, trial_ends_at, current_period_ends_at")
        .eq("store_id", store.storeId)
        .single(),
      supabase
        .from("platform_settings")
        .select("grace_period_days, admin_whatsapp, monthly_subscription_price")
        .eq("id", true)
        .single(),
    ]);

    if (subResult.data) {
      subStatus = subResult.data.status;
      trialEndsAt = subResult.data.trial_ends_at;
      periodEndsAt = subResult.data.current_period_ends_at;
    }
    if (settingsResult.data) {
      gracePeriodDays = settingsResult.data.grace_period_days ?? 5;
      adminWhatsapp = settingsResult.data.admin_whatsapp ?? null;
      monthlyPrice = settingsResult.data.monthly_subscription_price ?? 15000;
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {/* Mobile header */}
      <MobileHeader
        userEmail={user?.email ?? "U"}
        logoutAction={logout}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center border-b border-zinc-800 px-6 py-5">
          <img
            src="/cubagarage.png"
            alt="Cuba Garage"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Menú principal
          </p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Ver sitio público
            </Link>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-700 text-xs font-bold text-white shadow-md shadow-orange-500/30">
              {user?.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{user?.email}</p>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs font-medium text-zinc-500 hover:text-red-400"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content — extra bottom padding on mobile for the nav bar */}
      <main className="flex w-full flex-1 flex-col gap-4 bg-background p-4 pb-24 md:p-8 md:pb-8 lg:p-10">
        {subStatus && (
          <SubscriptionBanner
            status={subStatus}
            trialEndsAt={trialEndsAt}
            periodEndsAt={periodEndsAt}
            gracePeriodDays={gracePeriodDays}
            adminWhatsapp={adminWhatsapp}
            monthlyPrice={monthlyPrice}
          />
        )}
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
