import Link from "next/link";
import { updatePassword } from "@/app/(auth)/_actions";
import { InfoTip } from "@/app/_components/tooltip";

export default function NuevaContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
              src="/cubagarage.png"
              alt="Cuba Garage"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ingresa tu nueva contraseña para restablecer el acceso
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <NewPasswordForm searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}

async function NewPasswordForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <form action={updatePassword} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="flex items-center text-sm font-medium">
          Nueva contraseña
          <InfoTip content="Escribe una contraseña nueva de al menos 6 caracteres. No uses la misma contraseña anterior." />
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
        Restablecer contraseña
      </button>
    </form>
  );
}
