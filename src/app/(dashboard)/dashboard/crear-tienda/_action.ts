"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeWhatsapp } from "@/lib/phone";

export async function createStore(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim().toLowerCase();
  const provincia = (formData.get("provincia") as string | null)?.trim() || null;
  const municipio = (formData.get("municipio") as string | null)?.trim() || null;
  const direccion = (formData.get("direccion") as string | null)?.trim() || null;
  const whatsapp = normalizeWhatsapp(formData.get("whatsapp") as string | null);
  const currency = (formData.get("currency") as string | null)?.trim() || "CUP";

  if (!name || !slug) {
    redirect("/dashboard/crear-tienda?error=Nombre e identificador son obligatorios");
  }

  if (!provincia || !municipio) {
    redirect("/dashboard/crear-tienda?error=Debes seleccionar tu provincia y municipio");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    redirect(
      "/dashboard/crear-tienda?error=El identificador solo puede tener letras minúsculas, números y guiones",
    );
  }

  // Use admin client to bypass RLS for store bootstrapping.
  // The user's identity is already verified above via getUser().
  const admin = createSupabaseAdminClient();

  // Block users who already have a service — one user = store OR service, not both
  const { data: existingService } = await admin
    .from("service_providers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingService) {
    redirect(`/mi-servicio?error=${encodeURIComponent(`El correo ${user.email ?? ""} ya está registrado con un servicio. Un mismo correo solo puede tener una tienda o un servicio.`)}`);
  }

  // WhatsApp must be unique across stores and across service_providers.
  // The DB has a UNIQUE index on each table; here we add the cross-table check.
  if (whatsapp) {
    const { data: storeWithPhone } = await admin
      .from("stores")
      .select("id")
      .eq("whatsapp_number", whatsapp)
      .maybeSingle();
    if (storeWithPhone) {
      redirect(`/dashboard/crear-tienda?error=${encodeURIComponent("Este número de WhatsApp ya está registrado en otra tienda")}`);
    }
    const { data: serviceWithPhone } = await admin
      .from("service_providers")
      .select("id")
      .eq("whatsapp_number", whatsapp)
      .maybeSingle();
    if (serviceWithPhone) {
      redirect(`/dashboard/crear-tienda?error=${encodeURIComponent("Este número de WhatsApp ya está registrado en un servicio")}`);
    }
  }

  const { data: store, error: storeError } = await admin
    .from("stores")
    .insert({
      name,
      slug,
      provincia,
      municipio,
      direccion,
      whatsapp_number: whatsapp,
      country_code: "CU",
      currency_code: currency === "USD" ? "USD" : "CUP",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (storeError) {
    let msg = storeError.message;
    if (storeError.code === "23505") {
      msg = storeError.message.includes("whatsapp")
        ? "Este número de WhatsApp ya está registrado"
        : "Ese identificador ya está en uso";
    }
    redirect(`/dashboard/crear-tienda?error=${encodeURIComponent(msg)}`);
  }

  const { error: memberError } = await admin
    .from("store_memberships")
    .insert({
      store_id: store.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    redirect(
      `/dashboard/crear-tienda?error=${encodeURIComponent(memberError.message)}`,
    );
  }

  // Create default settings for the store
  await admin.from("store_settings").insert({ store_id: store.id });

  // Create a subscription on the free plan
  const { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (plan) {
    // Read trial duration from platform settings
    const { data: platformSettings } = await admin
      .from("platform_settings")
      .select("trial_days")
      .eq("id", true)
      .single();
    const trialDays = platformSettings?.trial_days ?? 90;

    const now = new Date().toISOString();
    const trialEnd = new Date(
      Date.now() + trialDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    await admin.from("store_subscriptions").insert({
      store_id: store.id,
      plan_id: plan.id,
      status: "trialing",
      trial_starts_at: now,
      trial_ends_at: trialEnd,
    });
  }

  redirect("/dashboard");
}
