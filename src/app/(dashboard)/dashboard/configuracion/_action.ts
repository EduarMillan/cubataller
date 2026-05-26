"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserStore } from "@/lib/queries/store";
import { normalizeWhatsapp } from "@/lib/phone";
import { isValidSlug } from "@/lib/slug";

export async function updateStore(formData: FormData) {
  const store = await getUserStore();
  if (!store) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string | null)?.trim().toLowerCase() || null;
  const provincia = (formData.get("provincia") as string | null)?.trim() || null;
  const municipio = (formData.get("municipio") as string | null)?.trim() || null;
  const direccion = (formData.get("direccion") as string | null)?.trim() || null;
  const whatsapp = normalizeWhatsapp(formData.get("whatsapp") as string | null);
  const description = (formData.get("description") as string | null)?.trim() || null;
  const logoUrl = (formData.get("logo_url") as string | null)?.trim() || null;

  if (!name) {
    redirect("/dashboard/configuracion?error=El nombre es obligatorio");
  }

  if (!provincia || !municipio) {
    redirect("/dashboard/configuracion?error=Debes seleccionar tu provincia y municipio");
  }

  if (slug && !isValidSlug(slug)) {
    redirect(
      "/dashboard/configuracion?error=El identificador solo puede tener letras minúsculas, números y guiones (máx. 60 caracteres)",
    );
  }

  const admin = createSupabaseAdminClient();

  // If the slug changed, verify it's still unique
  if (slug && slug !== store.storeSlug) {
    const { data: clash } = await admin
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .neq("id", store.storeId)
      .maybeSingle();
    if (clash) {
      redirect("/dashboard/configuracion?error=Ese identificador ya está en uso por otra tienda");
    }
  }

  // WhatsApp must be unique across stores and service_providers (excluding this store itself)
  if (whatsapp) {
    const { data: otherStore } = await admin
      .from("stores")
      .select("id")
      .eq("whatsapp_number", whatsapp)
      .neq("id", store.storeId)
      .maybeSingle();
    if (otherStore) {
      redirect(`/dashboard/configuracion?error=${encodeURIComponent("Este número de WhatsApp ya está registrado en otra tienda")}`);
    }
    const { data: serviceWithPhone } = await admin
      .from("service_providers")
      .select("id")
      .eq("whatsapp_number", whatsapp)
      .maybeSingle();
    if (serviceWithPhone) {
      redirect(`/dashboard/configuracion?error=${encodeURIComponent("Este número de WhatsApp ya está registrado en un servicio")}`);
    }
  }

  const supabase = await createSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {
    name,
    provincia,
    municipio,
    direccion,
    whatsapp_number: whatsapp,
    description,
    logo_url: logoUrl,
  };
  if (slug) updatePayload.slug = slug;

  const { error } = await supabase
    .from("stores")
    .update(updatePayload)
    .eq("id", store.storeId);

  if (error) {
    let msg = error.message;
    if (error.code === "23505") {
      msg = error.message.includes("slug")
        ? "Ese identificador ya está en uso por otra tienda"
        : "Este número de WhatsApp ya está registrado";
    }
    redirect(`/dashboard/configuracion?error=${encodeURIComponent(msg)}`);
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
