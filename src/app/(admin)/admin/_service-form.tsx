import Link from "next/link";
import { LocationSelects } from "@/app/_components/location-selects";
import { SERVICE_CATEGORIES, DAYS_OF_WEEK, type WeeklyHours } from "@/lib/service-categories";

export type ServiceFormDefaults = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  hours?: WeeklyHours | null;
};

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

/**
 * Form used by the admin panel to publish or edit a workshop listing. Unlike
 * the owner-facing form in /mi-servicio, the slug is optional here: leaving it
 * empty derives a unique one from the name.
 */
export function ServiceForm({
  action,
  service,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  service?: ServiceFormDefaults;
  submitLabel: string;
  error?: string;
}) {
  return (
    <>
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        action={action}
        className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 shadow-md sm:p-6"
      >
        {service?.id && <input type="hidden" name="serviceId" value={service.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Nombre del taller
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              defaultValue={service?.name ?? ""}
              placeholder="Ej: Taller El Rápido"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="block text-sm font-medium">
              Identificador (URL) <span className="text-muted">— opcional</span>
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              maxLength={60}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              defaultValue={service?.slug ?? ""}
              placeholder="se genera solo desde el nombre"
              className={inputClass}
            />
            <p className="text-xs text-muted">
              Déjalo vacío y se crea a partir del nombre. Solo minúsculas, números y guiones.
            </p>
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
            className={inputClass}
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
            placeholder="Qué servicios ofrece el taller, especialidades, años de experiencia, etc."
            className={inputClass}
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
            className={inputClass}
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
            defaultValue={service?.whatsapp_number ?? ""}
            placeholder="Ej: 5351234567"
            className={inputClass}
          />
          <p className="text-xs text-muted">
            Con el código de país (53 para Cuba). Es el canal de contacto que verán los clientes.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Horario de atención (opcional)</legend>
          <p className="text-xs text-muted">
            Ej: 09:00-18:00. Deja vacío el día en que no atiende.
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
            {submitLabel}
          </button>
          <Link
            href="/admin"
            className="rounded-md border border-zinc-700 px-5 py-2.5 text-center text-sm font-medium text-zinc-400 hover:border-orange-500/50 hover:text-orange-400"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
