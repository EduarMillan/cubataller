"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect("/");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) redirect("/");
  return user;
}

export async function toggleStoreActive(formData: FormData) {
  await assertAdmin();

  const storeId = formData.get("storeId") as string;
  const newActive = formData.get("active") === "true";

  const admin = createSupabaseAdminClient();

  await admin
    .from("stores")
    .update({ is_active: newActive })
    .eq("id", storeId);

  revalidatePath("/admin");
}

export async function updatePlatformSettings(formData: FormData) {
  await assertAdmin();

  const trialDays = parseInt(formData.get("trialDays") as string, 10);
  const gracePeriodDays = parseInt(formData.get("gracePeriodDays") as string, 10);
  const monthlyPrice = parseInt(formData.get("monthlySubscriptionPrice") as string, 10);
  const adminWhatsapp = (formData.get("adminWhatsapp") as string)?.trim() || null;

  if (isNaN(trialDays) || trialDays < 1 || trialDays > 365) return;
  if (isNaN(gracePeriodDays) || gracePeriodDays < 0 || gracePeriodDays > 30) return;
  if (isNaN(monthlyPrice) || monthlyPrice < 0) return;

  const admin = createSupabaseAdminClient();
  await admin
    .from("platform_settings")
    .update({
      trial_days: trialDays,
      grace_period_days: gracePeriodDays,
      monthly_subscription_price: monthlyPrice,
      admin_whatsapp: adminWhatsapp,
    })
    .eq("id", true);

  revalidatePath("/admin");
  revalidatePath("/dashboard/facturacion");
  revalidatePath("/dashboard");
}

export async function updateSubscriptionStatus(formData: FormData) {
  await assertAdmin();

  const subscriptionId = formData.get("subscriptionId") as string;
  const newStatus = formData.get("status") as string;

  const admin = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { status: newStatus };

  // If activating, set current period starting now
  if (newStatus === "active") {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    updateData.current_period_starts_at = now.toISOString();
    updateData.current_period_ends_at = periodEnd.toISOString();
  }

  await admin
    .from("store_subscriptions")
    .update(updateData)
    .eq("id", subscriptionId);

  revalidatePath("/admin");
}

export async function approveReceipt(formData: FormData) {
  const user = await assertAdmin();

  const receiptId = formData.get("receiptId") as string;
  const subscriptionId = formData.get("subscriptionId") as string;

  const admin = createSupabaseAdminClient();

  // Mark receipt as approved
  await admin
    .from("manual_payment_receipts")
    .update({
      status: "approved",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", receiptId);

  // Activate/renew subscription
  if (subscriptionId) {
    const { data: sub } = await admin
      .from("store_subscriptions")
      .select("status, current_period_ends_at")
      .eq("id", subscriptionId)
      .single();

    const now = new Date();
    const baseDate =
      sub?.current_period_ends_at && new Date(sub.current_period_ends_at) > now
        ? new Date(sub.current_period_ends_at)
        : now;
    const periodEnd = new Date(baseDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await admin
      .from("store_subscriptions")
      .update({
        status: "active",
        current_period_starts_at: baseDate.toISOString(),
        current_period_ends_at: periodEnd.toISOString(),
      })
      .eq("id", subscriptionId);
  }

  revalidatePath("/admin");
}

export async function rejectReceipt(formData: FormData) {
  const user = await assertAdmin();

  const receiptId = formData.get("receiptId") as string;

  const admin = createSupabaseAdminClient();

  await admin
    .from("manual_payment_receipts")
    .update({
      status: "rejected",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", receiptId);

  revalidatePath("/admin");
}

export async function toggleServiceActive(formData: FormData) {
  await assertAdmin();

  const serviceId = formData.get("serviceId") as string;
  const newActive = formData.get("active") === "true";

  const admin = createSupabaseAdminClient();

  await admin
    .from("service_providers")
    .update({ is_active: newActive })
    .eq("id", serviceId);

  revalidatePath("/admin");
  revalidatePath("/servicios");
}

export async function deleteServiceAdmin(formData: FormData) {
  await assertAdmin();

  const serviceId = formData.get("serviceId") as string;
  if (!serviceId) return;

  const admin = createSupabaseAdminClient();

  // Fetch logo_url first so we can remove the file after row deletion
  const { data: service } = await admin
    .from("service_providers")
    .select("logo_url")
    .eq("id", serviceId)
    .maybeSingle();

  await admin.from("service_providers").delete().eq("id", serviceId);

  if (service?.logo_url) {
    await admin.storage.from("service-logos").remove([service.logo_url]);
  }

  revalidatePath("/admin");
  revalidatePath("/servicios");
}

export async function renewSubscription(formData: FormData) {
  await assertAdmin();

  const subscriptionId = formData.get("subscriptionId") as string;

  const admin = createSupabaseAdminClient();

  // Fetch current subscription to extend from current period end
  const { data: sub } = await admin
    .from("store_subscriptions")
    .select("current_period_ends_at")
    .eq("id", subscriptionId)
    .single();

  // Extend from current period end or from now if no period set
  const baseDate = sub?.current_period_ends_at
    ? new Date(sub.current_period_ends_at)
    : new Date();

  const now = new Date();
  // If the period already ended, start from now instead
  const periodStart = baseDate > now ? baseDate : now;
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await admin
    .from("store_subscriptions")
    .update({
      status: "active",
      current_period_starts_at: periodStart.toISOString(),
      current_period_ends_at: periodEnd.toISOString(),
    })
    .eq("id", subscriptionId);

  revalidatePath("/admin");
}
