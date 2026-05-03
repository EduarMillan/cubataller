import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WeeklyHours } from "@/lib/service-categories";

export type UserService = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  whatsappNumber: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  logoUrl: string | null;
  hours: WeeklyHours | null;
  isActive: boolean;
};

export async function getUserService(): Promise<UserService | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("service_providers")
    .select(
      "id, name, slug, category, description, whatsapp_number, provincia, municipio, direccion, logo_url, hours, is_active",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    category: data.category as string,
    description: (data.description as string) || null,
    whatsappNumber: (data.whatsapp_number as string) || null,
    provincia: (data.provincia as string) || null,
    municipio: (data.municipio as string) || null,
    direccion: (data.direccion as string) || null,
    logoUrl: (data.logo_url as string) || null,
    hours: (data.hours as WeeklyHours) ?? null,
    isActive: data.is_active as boolean,
  };
}
