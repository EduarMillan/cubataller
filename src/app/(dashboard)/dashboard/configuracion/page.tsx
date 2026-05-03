import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { updateStore, uploadStoreLogo, deleteStoreLogo } from "./_action";
import { LocationSelects } from "@/app/_components/location-selects";
import { LogoUpload } from "@/app/_components/logo-upload";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { error, ok } = await searchParams;

  // Fetch full store data including description
  const supabase = await createSupabaseServerClient();
  const { data: storeData } = await supabase
    .from("stores")
    .select("name, slug, description, whatsapp_number, provincia, municipio, direccion, logo_url")
    .eq("id", store.storeId)
    .single();

  if (!storeData) redirect("/dashboard");

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted">
          Edita los datos de tu tienda. Estos aparecen en tu página pública y en el buscador.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {ok && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Datos actualizados correctamente.
        </div>
      )}

      <form
        action={updateStore}
        className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 shadow-md sm:p-6"
      >
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Logo de la tienda (opcional)
          </label>
          <LogoUpload
            initialUrl={storeData.logo_url}
            uploadAction={uploadStoreLogo}
            deleteAction={deleteStoreLogo}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium">
            Nombre de la tienda
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={storeData.name}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-muted">
            Identificador (URL)
          </label>
          <p className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-400">
            {storeData.slug}
          </p>
          <p className="text-xs text-muted">
            El identificador no se puede cambiar.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={storeData.description ?? ""}
            placeholder="Describe brevemente tu tienda..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        <LocationSelects
          defaultProvincia={storeData.provincia ?? undefined}
          defaultMunicipio={storeData.municipio ?? undefined}
        />

        <div className="space-y-1.5">
          <label htmlFor="direccion" className="block text-sm font-medium">
            Dirección del local
          </label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            maxLength={200}
            defaultValue={storeData.direccion ?? ""}
            placeholder="Ej: Calle Obispo 123, entre Habana y Compostela"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
          <p className="text-xs text-muted">
            Permite a tus clientes navegar con GPS hasta tu local.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className="block text-sm font-medium">
            WhatsApp de contacto
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            defaultValue={storeData.whatsapp_number ?? ""}
            placeholder="Ej: 5351234567"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
          <p className="text-xs text-muted">
            Incluye el código de país (53 para Cuba).
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
        >
          Guardar cambios
        </button>
      </form>
    </section>
  );
}
