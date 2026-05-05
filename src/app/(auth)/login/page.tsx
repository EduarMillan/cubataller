import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/(auth)/_actions";
import { InfoTip } from "@/app/_components/tooltip";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
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
              src="/cubamecanica.png"
              alt="Cuba Mecánica"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ingresa a tu cuenta para acceder al panel
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm searchParams={searchParams} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold text-accent hover:text-accent-dark"
          >
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <form action={login} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="flex items-center text-sm font-medium">
          Correo electrónico
          <InfoTip content="Ingresa el email con el que te registraste en Cuba Mecánica. Ejemplo: nombre@dominio.com" />
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
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="flex items-center text-sm font-medium">
            Contraseña
            <InfoTip content="Tu contraseña debe tener al menos 6 caracteres. Si la olvidaste, usa el enlace de recuperación." />
          </label>
          <Link
            href="/recuperar"
            className="text-xs font-medium text-accent hover:text-accent-dark"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2"
      >
        Iniciar sesión
      </button>
    </form>
  );
}
