import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { getUserService } from "@/lib/queries/service";

type Variant = "light" | "dark";

/**
 * Auth-aware CTA links for public navbars.
 * - Logged out: Ingresar + Registrarse
 * - Has store: Mi panel
 * - Has service: Mi servicio
 * - Logged in but no store/service: Completa tu cuenta
 */
export async function PublicNavSession({ variant = "light" }: { variant?: Variant } = {}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDark = variant === "dark";
  const ghostClass = isDark
    ? "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white sm:px-4"
    : "rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground sm:px-4";
  const primaryClass = isDark
    ? "rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 hover:bg-orange-500 sm:px-4"
    : "rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-dark sm:px-4";
  const dashboardClass = isDark
    ? "inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 hover:bg-orange-500 sm:px-4"
    : "inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-dark sm:px-4";
  const serviceClass = isDark
    ? "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 sm:px-4"
    : "inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 sm:px-4";
  const completeClass = primaryClass;

  if (!user) {
    return (
      <>
        <Link href="/login" className={ghostClass}>
          Ingresar
        </Link>
        <Link href="/registro" className={primaryClass}>
          Registrarse
        </Link>
      </>
    );
  }

  const store = await getUserStore();
  if (store) {
    return (
      <Link href="/dashboard" className={dashboardClass}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        Mi panel
      </Link>
    );
  }

  const service = await getUserService();
  if (service) {
    return (
      <Link href="/mi-servicio" className={serviceClass}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
        </svg>
        Mi servicio
      </Link>
    );
  }

  // Logged in but hasn't chosen store/service yet
  return (
    <Link href="/onboarding" className={completeClass}>
      Completa tu cuenta
    </Link>
  );
}
