import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUserStore() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("store_memberships")
    .select("store_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, whatsapp_number, is_active, provincia, municipio, direccion, currency_code")
    .eq("id", membership.store_id)
    .single();

  if (!store) return null;

  return {
    storeId: store.id as string,
    storeName: store.name as string,
    storeSlug: store.slug as string,
    whatsappNumber: (store.whatsapp_number as string) || null,
    isActive: store.is_active as boolean,
    provincia: (store.provincia as string) || null,
    municipio: (store.municipio as string) || null,
    direccion: (store.direccion as string) || null,
    currencyCode: (store.currency_code as string) || "CUP",
    role: membership.role as string,
  };
}
