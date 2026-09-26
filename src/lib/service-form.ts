import type { SupabaseClient } from "@supabase/supabase-js";
import { SERVICE_CATEGORY_MAP, DAYS_OF_WEEK, type WeeklyHours } from "@/lib/service-categories";
import { PROVINCIA_MAP, getMunicipios } from "@/lib/cuba-locations";
import { normalizeWhatsapp } from "@/lib/phone";
import { isValidSlug } from "@/lib/slug";

export type ServiceFormValues = {
  name: string;
  slug: string;
  category: string;
  description: string | null;
  especialidades: string | null;
  whatsapp: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  hours: WeeklyHours;
};

/** Reads the shared service fields out of a submitted form. */
export function parseServiceForm(formData: FormData): ServiceFormValues {
  const hours: WeeklyHours = {};
  for (const day of DAYS_OF_WEEK) {
    const value = (formData.get(`hours_${day.key}`) as string | null)?.trim();
    hours[day.key] = value || null;
  }

  return {
    name: ((formData.get("name") as string) || "").trim(),
    slug: ((formData.get("slug") as string) || "").trim().toLowerCase(),
    category: ((formData.get("category") as string) || "").trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
    especialidades: ((formData.get("especialidades") as string) || "").trim() || null,
    whatsapp: normalizeWhatsapp((formData.get("whatsapp") as string) || ""),
    provincia: ((formData.get("provincia") as string) || "").trim() || null,
    municipio: ((formData.get("municipio") as string) || "").trim() || null,
    direccion: ((formData.get("direccion") as string) || "").trim() || null,
    hours,
  };
}

/**
 * Returns the first validation error, or null when the values are usable.
 * The admin panel leaves the slug optional (it is derived from the name), so
 * an empty slug only fails when `requireSlug` is set.
 */
export function validateServiceForm(
  data: ServiceFormValues,
  { requireSlug }: { requireSlug: boolean },
): string | null {
  if (!data.name) return "El nombre es obligatorio";
  if (requireSlug && !data.slug) return "El identificador es obligatorio";
  if (data.slug && !isValidSlug(data.slug)) {
    return "El identificador solo puede tener letras minúsculas, números y guiones";
  }
  if (!data.category || !SERVICE_CATEGORY_MAP.has(data.category)) {
    return "Debes seleccionar una categoría válida";
  }
  if (!data.provincia || !data.municipio) {
    return "Debes seleccionar la provincia y el municipio";
  }
  // The selects only offer valid pairs, but a listing whose provincia code is
  // not in the catalog renders without its province name, so reject it here.
  if (!PROVINCIA_MAP.has(data.provincia)) {
    return "La provincia seleccionada no es válida";
  }
  if (!getMunicipios(data.provincia).includes(data.municipio)) {
    return "El municipio no pertenece a la provincia seleccionada";
  }
  return null;
}

/**
 * A WhatsApp number identifies one business: it is unique within services and
 * within stores (unique indexes), and the pair of tables cannot share one
 * either, which only the application can enforce. Returns the error message to
 * show, or null when the number is free.
 */
export async function findWhatsappConflict(
  admin: SupabaseClient,
  whatsapp: string | null,
  exclude: { serviceId?: string; userId?: string } = {},
): Promise<string | null> {
  if (!whatsapp) return null;

  let serviceQuery = admin
    .from("service_providers")
    .select("id")
    .eq("whatsapp_number", whatsapp);
  if (exclude.serviceId) serviceQuery = serviceQuery.neq("id", exclude.serviceId);
  if (exclude.userId) serviceQuery = serviceQuery.neq("user_id", exclude.userId);

  const { data: otherService } = await serviceQuery.maybeSingle();
  if (otherService) return "Este número de WhatsApp ya está registrado en otro servicio";

  const { data: storeWithPhone } = await admin
    .from("stores")
    .select("id")
    .eq("whatsapp_number", whatsapp)
    .maybeSingle();
  if (storeWithPhone) return "Este número de WhatsApp ya está registrado en una tienda";

  return null;
}

/** Maps the parsed values onto the `service_providers` column names. */
export function serviceFormToRow(data: ServiceFormValues) {
  return {
    name: data.name,
    slug: data.slug,
    category: data.category,
    description: data.description,
    especialidades: data.especialidades,
    whatsapp_number: data.whatsapp,
    provincia: data.provincia,
    municipio: data.municipio,
    direccion: data.direccion,
    hours: data.hours,
  };
}
