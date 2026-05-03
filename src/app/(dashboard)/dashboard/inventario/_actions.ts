"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserStore } from "@/lib/queries/store";

function extractImageUrls(formData: FormData): string[] {
  const count = parseInt(formData.get("image_count") as string, 10) || 0;
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const val = formData.get(`image_${i}`) as string | null;
    if (val) urls.push(val);
  }
  return urls;
}

function parseOptionalPrice(formData: FormData): number | null {
  const raw = (formData.get("price") as string)?.trim();
  if (!raw) return null;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? null : parsed;
}

export async function createPart(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sku = (formData.get("sku") as string).trim();
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const brand = (formData.get("brand") as string).trim();
  const vehicleMake = (formData.get("vehicle_make") as string).trim();
  const vehicleModel = (formData.get("vehicle_model") as string).trim();
  const yearFrom = formData.get("year_from") as string | null;
  const yearTo = formData.get("year_to") as string | null;
  const price = parseOptionalPrice(formData);
  const quantity = parseInt(formData.get("quantity") as string, 10) || 0;
  const imageUrls = extractImageUrls(formData);

  const { error } = await supabase.from("parts").insert({
    store_id: store.storeId,
    sku,
    name,
    description,
    brand,
    vehicle_make: vehicleMake,
    vehicle_model: vehicleModel,
    vehicle_year_from: yearFrom ? parseInt(yearFrom, 10) : null,
    vehicle_year_to: yearTo ? parseInt(yearTo, 10) : null,
    price,
    quantity_on_hand: quantity,
    image_urls: imageUrls,
    created_by: user.id,
  });

  if (error) {
    const msg =
      error.code === "23505"
        ? "Ya existe una pieza con ese SKU"
        : error.message;
    redirect(
      `/dashboard/inventario/nuevo?error=${encodeURIComponent(msg)}`,
    );
  }

  revalidatePath("/dashboard/inventario");
  redirect("/dashboard/inventario");
}

export async function updatePart(partId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const sku = (formData.get("sku") as string).trim();
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const brand = (formData.get("brand") as string).trim();
  const vehicleMake = (formData.get("vehicle_make") as string).trim();
  const vehicleModel = (formData.get("vehicle_model") as string).trim();
  const yearFrom = formData.get("year_from") as string | null;
  const yearTo = formData.get("year_to") as string | null;
  const price = parseOptionalPrice(formData);
  const quantity = parseInt(formData.get("quantity") as string, 10) || 0;
  const isPublic = formData.get("is_public") === "on";
  const isActive = formData.get("is_active") === "on";
  const imageUrls = extractImageUrls(formData);

  const { error } = await supabase
    .from("parts")
    .update({
      sku,
      name,
      description,
      brand,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_year_from: yearFrom ? parseInt(yearFrom, 10) : null,
      vehicle_year_to: yearTo ? parseInt(yearTo, 10) : null,
      price,
      quantity_on_hand: quantity,
      is_public: isPublic,
      is_active: isActive,
      image_urls: imageUrls,
    })
    .eq("id", partId)
    .eq("store_id", store.storeId);

  if (error) {
    redirect(
      `/dashboard/inventario/${partId}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard/inventario");
  redirect("/dashboard/inventario");
}

export async function uploadPartImage(formData: FormData): Promise<{ path?: string; error?: string }> {
  const store = await getUserStore();
  if (!store) return { error: "No store found" };

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No file provided" };

  const folder = (formData.get("folder") as string) || "temp";
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${store.storeId}/${folder}/${timestamp}-${rand}.webp`;

  const admin = createSupabaseAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await admin.storage
    .from("parts-images")
    .upload(path, arrayBuffer, { contentType: "image/webp", upsert: false });

  if (error) return { error: error.message };
  return { path };
}

export async function deletePartImage(path: string): Promise<{ error?: string }> {
  const store = await getUserStore();
  if (!store) return { error: "No store found" };

  // Verify the path belongs to this store
  if (!path.startsWith(`${store.storeId}/`)) return { error: "Unauthorized" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from("parts-images").remove([path]);
  if (error) return { error: error.message };
  return {};
}

export async function deletePart(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const partId = formData.get("partId") as string;

  await supabase
    .from("parts")
    .update({ is_active: false })
    .eq("id", partId)
    .eq("store_id", store.storeId);

  revalidatePath("/dashboard/inventario");
  redirect("/dashboard/inventario");
}
