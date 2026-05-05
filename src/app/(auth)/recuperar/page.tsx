import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/(auth)/_actions";
import { InfoTip } from "@/app/_components/tooltip";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
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
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm text-muted">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <ResetForm searchParams={searchParams} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-accent-dark"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

async function ResetForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-base font-semibold">Revisa tu correo</h3>
        <p className="text-sm text-muted">
          Si la cuenta existe, recibirás un enlace para restablecer tu
          contraseña. Revisa también la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={requestPasswordReset} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="flex items-center text-sm font-medium">
          Correo electrónico
          <InfoTip content="Ingresa el email con el que creaste tu cuenta. Recibirás un enlace para establecer una nueva contraseña." />
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

      <button
        type="submit"
        className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2"
      >
        Enviar enlace de recuperación
      </button>
    </form>
  );
}
