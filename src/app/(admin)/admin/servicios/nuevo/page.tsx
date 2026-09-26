import Link from "next/link";
import { createServiceAdmin } from "../../_actions";
import { ServiceForm } from "../../_service-form";

export default async function NuevoServicioAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href="/admin" className="text-xs font-medium text-zinc-400 hover:text-orange-400">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Agregar servicio</h1>
        <p className="text-sm text-muted">
          Publica un taller en el directorio público. No necesita tener cuenta: la ficha queda a tu
          nombre y puedes editarla o eliminarla cuando quieras desde el panel.
        </p>
      </header>

      <ServiceForm action={createServiceAdmin} submitLabel="Agregar al directorio" error={error} />
    </section>
  );
}
