import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/(auth)/_actions";
import { InfoTip } from "@/app/_components/tooltip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Registra tu tienda de repuestos en FIXCAR. Prueba gratuita de 90 días, sin compromiso.",
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("trial_days")
    .eq("id", true)
    .single();
  const trialDays = settings?.trial_days ?? 90;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-accent">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio
          </Link>
          <div className="mt-4 flex justify-center">
            <img
              src="/cubagarage.png"
              alt="Cuba Garage"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-sm text-muted">
            Registra tu tienda y comienza con {trialDays} días gratis
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <SignupForm searchParams={searchParams} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-accent-dark"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

async function SignupForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={signup} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="flex items-center text-sm font-medium">
          Correo electrónico
          <InfoTip content="Usa un email válido al que tengas acceso. Lo necesitarás para recuperar tu contraseña y recibir notificaciones." />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="flex items-center text-sm font-medium">
          Contraseña
          <InfoTip content="Mínimo 6 caracteres. Usa una combinación de letras, números y símbolos para mayor seguridad." />
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2"
      >
        Crear cuenta
      </button>

      <p className="text-center text-xs text-muted">
        Al registrarte aceptas los términos de servicio
      </p>
    </form>
  );
}
