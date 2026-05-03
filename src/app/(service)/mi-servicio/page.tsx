import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserService } from "@/lib/queries/service";
import { getUserStore } from "@/lib/queries/store";
import { LocationSelects } from "@/app/_components/location-selects";
import { SERVICE_CATEGORIES, DAYS_OF_WEEK } from "@/lib/service-categories";
import { createService, updateService, deleteService } from "./_actions";

export default async function MiServicioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If the user has a store, they can't register a service — show a clear message instead of silently redirecting.
  const store = await getUserStore();
  if (store) {
    return (
      <section className="mx-auto max-w-xl space-y-5">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-amber-200 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                No puedes registrar un servicio
              </h1>
              <p className="mt-1 text-sm text-amber-100/80">
                El correo <strong>{user.email}</strong> ya está registrado en la aplicación con una tienda (<strong>{store.storeName}</strong>).
                Un mismo correo solo puede tener una tienda <em>o</em> un servicio, no ambos.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                >
                  Ir a mi panel de tienda
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-500/50 hover:text-orange-400"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const service = await getUserService();
  const { error, ok } = await searchParams;

  const isEdit = !!service;
  const action = isEdit ? updateService : createService;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {isEdit ? "Mi servicio" : "Registra tu servicio"}
        </h1>
        <p className="text-sm text-muted">
          {isEdit
            ? "Edita tu información para mantener a los clientes al día. También puedes eliminar tu servicio cuando quieras."
            : "Completa los datos para aparecer en el directorio público de servicios."}
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Guardado correctamente.
        </div>
      )}

      {isEdit && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Tu ficha pública
          </p>
          <Link
            href={`/servicios/${service.slug}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Ver /servicios/{service.slug}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
        </div>
      )}

      <form
        action={action}
        className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 shadow-md sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Nombre del servicio
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={service?.name ?? ""}
              placeholder="Ej: Taller El Rápido"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="block text-sm font-medium">
              Identificador (URL)
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              maxLength={60}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              defaultValue={service?.slug ?? ""}
              placeholder="ej: taller-el-rapido"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-muted">Solo minúsculas, números y guiones.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-sm font-medium">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={service?.category ?? ""}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Selecciona una categoría</option>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={500}
            defaultValue={service?.description ?? ""}
            placeholder="Cuenta brevemente qué servicios ofreces, tu experiencia, especialidades, etc."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LocationSelects
            defaultProvincia={service?.provincia ?? undefined}
            defaultMunicipio={service?.municipio ?? undefined}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="direccion" className="block text-sm font-medium">
            Dirección (opcional)
          </label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            maxLength={200}
            defaultValue={service?.direccion ?? ""}
            placeholder="Ej: Calle 23 esquina a L, Vedado"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className="block text-sm font-medium">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            defaultValue={service?.whatsappNumber ?? ""}
            placeholder="Ej: 5351234567"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-xs text-muted">
            Incluye el código de país (53 para Cuba). Es el canal principal de contacto.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Horario de atención (opcional)</legend>
          <p className="text-xs text-muted">
            Ej: 09:00-18:00. Deja vacío un día si ese día no atiendes.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.key} className="flex items-center gap-2">
                <label
                  htmlFor={`hours_${day.key}`}
                  className="w-20 text-xs font-medium text-zinc-400"
                >
                  {day.label}
                </label>
                <input
                  id={`hours_${day.key}`}
                  name={`hours_${day.key}`}
                  type="text"
                  maxLength={30}
                  defaultValue={service?.hours?.[day.key] ?? ""}
                  placeholder="09:00-18:00"
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="submit"
            className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 sm:flex-1 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            {isEdit ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </form>

      {isEdit && (
        <form
          action={deleteService}
          className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 shadow-md"
        >
          <h2 className="text-sm font-bold text-red-200 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Eliminar mi servicio</h2>
          <p className="mt-1 text-xs text-red-300/80">
            Esta acción borra tu servicio del directorio público. No se puede deshacer.
          </p>
          <button
            type="submit"
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-red-500/30 hover:bg-red-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            Eliminar servicio
          </button>
        </form>
      )}
    </section>
  );
}
