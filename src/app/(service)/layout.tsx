import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/_actions";

export const metadata: Metadata = {
  title: { default: "Mi servicio", template: "%s | FIXCAR" },
  robots: { index: false, follow: false },
};

export default async function ServiceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center">
            <img
              src="/cubagarage.png"
              alt="Cuba Garage"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/servicios"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:text-orange-400 sm:inline-flex"
            >
              Ver sitio público
            </Link>
            <span className="hidden text-xs text-zinc-500 sm:inline">{user?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
