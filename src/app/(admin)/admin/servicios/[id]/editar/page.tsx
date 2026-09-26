import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateServiceAdmin, deleteServiceAdmin } from "../../../_actions";
import { ServiceForm, type ServiceFormDefaults } from "../../../_service-form";
import { ConfirmDeleteForm } from "../../../_confirm-delete-form";

export default async function EditarServicioAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const admin = createSupabaseAdminClient();
  const { data: service } = await admin
    .from("service_providers")
    .select(
      "id, name, slug, category, description, whatsapp_number, provincia, municipio, direccion, hours, is_active, user_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!service) notFound();

  const ownerless = !service.user_id;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href="/admin" className="text-xs font-medium text-zinc-400 hover:text-orange-400">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Editar servicio</h1>
        <p className="text-sm text-muted">
          {ownerless
            ? "Ficha publicada por ti. El taller no tiene cuenta, así que solo tú puedes editarla."
            : "Esta ficha pertenece a una cuenta registrada. Los cambios que guardes aquí reemplazan lo que el dueño haya escrito."}
        </p>
        <Link
          href={`/servicios/${service.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          Ver ficha pública /servicios/{service.slug}
        </Link>
      </header>

      <ServiceForm
        action={updateServiceAdmin}
        service={service as ServiceFormDefaults}
        submitLabel="Guardar cambios"
        error={error}
      />

      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 shadow-md">
        <h2 className="text-sm font-bold text-red-200 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
          Eliminar servicio
        </h2>
        <p className="mt-1 text-xs text-red-300/80">
          Borra la ficha del directorio público. No se puede deshacer.
        </p>
        <ConfirmDeleteForm
          action={deleteServiceAdmin}
          message={`¿Eliminar definitivamente el servicio "${service.name}"? Esta acción no se puede deshacer.`}
          hiddenFields={{ serviceId: service.id, redirectTo: "/admin" }}
        >
          <button
            type="submit"
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-red-500/30 hover:bg-red-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Eliminar servicio
          </button>
        </ConfirmDeleteForm>
      </div>
    </section>
  );
}
