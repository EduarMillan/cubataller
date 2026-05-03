"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";

export async function uploadReceipt(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscriptionId = formData.get("subscription_id") as string;
  const bankReference = (formData.get("bank_reference") as string)?.trim() || null;
  const amountRaw = (formData.get("amount") as string)?.trim();
  const amount = amountRaw ? parseInt(amountRaw, 10) : null;
  const file = formData.get("receipt_file") as File | null;

  if (!subscriptionId) {
    redirect("/dashboard/facturacion?error=No se encontró tu suscripción");
  }

  // Verify the subscription belongs to this store
  const { data: sub } = await supabase
    .from("store_subscriptions")
    .select("id")
    .eq("id", subscriptionId)
    .eq("store_id", store.storeId)
    .single();

  if (!sub) {
    redirect("/dashboard/facturacion?error=No se encontró tu suscripción");
  }

  if (!file || file.size === 0) {
    redirect("/dashboard/facturacion?error=Debes adjuntar el comprobante de transferencia");
  }

  if (file.size > 5 * 1024 * 1024) {
    redirect("/dashboard/facturacion?error=El archivo no puede superar 5 MB");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!allowedExts.includes(ext)) {
    redirect("/dashboard/facturacion?error=Formato no permitido. Usa JPG, PNG, WEBP o PDF");
  }

  const path = `${store.storeId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    redirect(`/dashboard/facturacion?error=Error al subir archivo: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

  const { error } = await supabase.from("manual_payment_receipts").insert({
    subscription_id: subscriptionId,
    store_id: store.storeId,
    receipt_url: urlData.publicUrl,
    bank_reference: bankReference,
    amount,
    submitted_by: user.id,
    status: "submitted",
  });

  if (error) {
    redirect(`/dashboard/facturacion?error=Error al enviar comprobante: ${error.message}`);
  }

  revalidatePath("/dashboard/facturacion");
  redirect("/dashboard/facturacion?success=Comprobante enviado. El administrador lo revisará pronto.");
}
