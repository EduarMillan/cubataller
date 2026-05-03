"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserStore } from "@/lib/queries/store";

export async function updateStore(formData: FormData) {
  const store = await getUserStore();
  if (!store) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const provincia = (formData.get("provincia") as string | null)?.trim() || null;
  const municipio = (formData.get("municipio") as string | null)?.trim() || null;
  const direccion = (formData.get("direccion") as string | null)?.trim() || null;
  const whatsapp = (formData.get("whatsapp") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const logoUrl = (formData.get("logo_url") as string | null)?.trim() || null;

  if (!name) {
    redirect("/dashboard/configuracion?error=El nombre es obligatorio");
  }

  if (!provincia || !municipio) {
    redirect("/dashboard/configuracion?error=Debes seleccionar tu provincia y municipio");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("stores")
    .update({
      name,
      provincia,
      municipio,
      direccion,
      whatsapp_number: whatsapp,
      description,
      logo_url: logoUrl,
    })
    .eq("id", store.storeId);

  if (error) {
    redirect(`/dashboard/configuracion?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/configuracion?ok=1");
}

export async function uploadStoreLogo(
  formData: FormData,
): Promise<{ path?: string; error?: string }> {
  const store = await getUserStore();
  if (!store) return { error: "No store found" };

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No file provided" };

  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${store.storeId}/logo-${timestamp}-${rand}.webp`;

  const admin = createSupabaseAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await admin.storage
    .from("store-logos")
    .upload(path, arrayBuffer, { contentType: "image/webp", upsert: false });

  if (error) return { error: error.message };
  return { path };
}

export async function deleteStoreLogo(path: string): Promise<{ error?: string }> {
  const store = await getUserStore();
  if (!store) return { error: "No store found" };
  if (!path.startsWith(`${store.storeId}/`)) return { error: "Unauthorized" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from("store-logos").remove([path]);
  if (error) return { error: error.message };
  return {};
}
