import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/_actions";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect("/");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) redirect("/");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Admin header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-xs font-bold text-white shadow-md shadow-red-600/30">
                FC
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-white [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Admin Panel</span>
            </Link>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-orange-400"
            >
              Ir al Dashboard
            </Link>
            <span className="text-xs text-zinc-500">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-red-500 hover:text-red-400"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
