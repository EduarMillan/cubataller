"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SERVICE_CATEGORY_MAP, DAYS_OF_WEEK, type WeeklyHours } from "@/lib/service-categories";

type ParsedForm = {
  name: string;
  slug: string;
  category: string;
  description: string | null;
  whatsapp: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  hours: WeeklyHours;
};

function parseForm(formData: FormData): ParsedForm {
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
    whatsapp: ((formData.get("whatsapp") as string) || "").trim() || null,
    provincia: ((formData.get("provincia") as string) || "").trim() || null,
    municipio: ((formData.get("municipio") as string) || "").trim() || null,
    direccion: ((formData.get("direccion") as string) || "").trim() || null,
    hours,
  };
}

function validate(data: ParsedForm): string | null {
  if (!data.name) return "El nombre es obligatorio";
  if (!data.slug) return "El identificador es obligatorio";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    return "El identificador solo puede tener letras minúsculas, números y guiones";
  }
  if (!data.category || !SERVICE_CATEGORY_MAP.has(data.category)) {
    return "Debes seleccionar una categoría válida";
  }
  if (!data.provincia || !data.municipio) {
    return "Debes seleccionar tu provincia y municipio";
  }
  return null;
}

export async function createService(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseForm(formData);
  const validationError = validate(parsed);
  if (validationError) {
    redirect(`/mi-servicio?error=${encodeURIComponent(validationError)}`);
  }

  const admin = createSupabaseAdminClient();

  // Block if user already has a store
  const { data: membership } = await admin
    .from("store_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (membership) {
    redirect(`/mi-servicio?error=${encodeURIComponent(`El correo ${user.email ?? ""} ya está registrado con una tienda. Un mismo correo solo puede tener una tienda o un servicio.`)}`);
  }

  const { error } = await admin.from("service_providers").insert({
    user_id: user.id,
    name: parsed.name,
    slug: parsed.slug,
    category: parsed.category,
    description: parsed.description,
    whatsapp_number: parsed.whatsapp,
    provincia: parsed.provincia,
    municipio: parsed.municipio,
    direccion: parsed.direccion,
    hours: parsed.hours,
  });

  if (error) {
    const msg = error.code === "23505"
      ? "Ese identificador ya está en uso, elige otro"
      : error.message;
    redirect(`/mi-servicio?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/servicios");
  redirect("/mi-servicio?ok=1");
}

export async function updateService(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseForm(formData);
  const validationError = validate(parsed);
  if (validationError) {
    redirect(`/mi-servicio?error=${encodeURIComponent(validationError)}`);
  }

  const { error } = await supabase
    .from("service_providers")
    .update({
      name: parsed.name,
      slug: parsed.slug,
      category: parsed.category,
      description: parsed.description,
      whatsapp_number: parsed.whatsapp,
      provincia: parsed.provincia,
      municipio: parsed.municipio,
      direccion: parsed.direccion,
      hours: parsed.hours,
    })
    .eq("user_id", user.id);

  if (error) {
    const msg = error.code === "23505"
      ? "Ese identificador ya está en uso, elige otro"
      : error.message;
    redirect(`/mi-servicio?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/servicios");
  revalidatePath(`/servicios/${parsed.slug}`);
  redirect("/mi-servicio?ok=1");
}

export async function deleteService() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("service_providers")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    redirect(`/mi-servicio?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/servicios");
  redirect("/onboarding");
}
