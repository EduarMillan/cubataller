"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseServiceForm,
  validateServiceForm,
  serviceFormToRow,
  findWhatsappConflict,
} from "@/lib/service-form";

export async function createService(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseServiceForm(formData);
  const validationError = validateServiceForm(parsed, { requireSlug: true });
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

  const whatsappConflict = await findWhatsappConflict(admin, parsed.whatsapp);
  if (whatsappConflict) {
    redirect(`/mi-servicio?error=${encodeURIComponent(whatsappConflict)}`);
  }

  const { error } = await admin.from("service_providers").insert({
    user_id: user.id,
    created_by: user.id,
    ...serviceFormToRow(parsed),
  });

  if (error) {
    let msg = error.message;
    if (error.code === "23505") {
      msg = error.message.includes("whatsapp")
        ? "Este número de WhatsApp ya está registrado"
        : "Ese identificador ya está en uso, elige otro";
    }
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

  const parsed = parseServiceForm(formData);
  const validationError = validateServiceForm(parsed, { requireSlug: true });
  if (validationError) {
    redirect(`/mi-servicio?error=${encodeURIComponent(validationError)}`);
  }

  const whatsappConflict = await findWhatsappConflict(
    createSupabaseAdminClient(),
    parsed.whatsapp,
    { userId: user.id },
  );
  if (whatsappConflict) {
    redirect(`/mi-servicio?error=${encodeURIComponent(whatsappConflict)}`);
  }

  const { error } = await supabase
    .from("service_providers")
    .update(serviceFormToRow(parsed))
    .eq("user_id", user.id);

  if (error) {
    let msg = error.message;
    if (error.code === "23505") {
      msg = error.message.includes("whatsapp")
        ? "Este número de WhatsApp ya está registrado"
        : "Ese identificador ya está en uso, elige otro";
    }
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
