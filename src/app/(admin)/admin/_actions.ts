"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseServiceForm,
  validateServiceForm,
  serviceFormToRow,
  findWhatsappConflict,
} from "@/lib/service-form";
import { generateUniqueServiceSlug } from "@/lib/slug";

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

// The next billing period starts from whichever is latest: the current period
// end, the trial end (still in the future), or now. This way a customer who
// pays before their period/trial expires keeps the remaining days instead of
// losing them.
function computeNextPeriod(sub: {
  current_period_ends_at?: string | null;
  trial_ends_at?: string | null;
}) {
  const now = new Date();
  const candidates: Date[] = [now];
  if (sub.current_period_ends_at) {
    const d = new Date(sub.current_period_ends_at);
    if (d > now) candidates.push(d);
  }
  if (sub.trial_ends_at) {
    const d = new Date(sub.trial_ends_at);
    if (d > now) candidates.push(d);
  }
  const periodStart = new Date(Math.max(...candidates.map((d) => d.getTime())));
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return { periodStart, periodEnd };
}

const DEFAULT_GRACE_DAYS = 5;

type SubscriptionDates = {
  status?: string | null;
  current_period_ends_at?: string | null;
  trial_ends_at?: string | null;
};

/**
 * The date after which suspend_expired_stores() starts counting the grace
 * period, mirroring the SQL function: trialing looks at the trial end, active
 * at the period end (null means "never expires"), past_due at whichever exists.
 * A cancelled subscription is never auto-suspended.
 */
function subscriptionDeadline(sub: SubscriptionDates): string | null {
  if (sub.status === "trialing") return sub.trial_ends_at ?? null;
  if (sub.status === "active") return sub.current_period_ends_at ?? null;
  if (sub.status === "past_due") return sub.current_period_ends_at ?? sub.trial_ends_at ?? null;
  return null;
}

async function getGracePeriodDays(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<number> {
  const { data } = await admin
    .from("platform_settings")
    .select("grace_period_days")
    .eq("id", true)
    .single();
  return data?.grace_period_days ?? DEFAULT_GRACE_DAYS;
}

/** True when suspend_expired_stores() would switch this store back off. */
function isPastGracePeriod(sub: SubscriptionDates, graceDays: number): boolean {
  const deadline = subscriptionDeadline(sub);
  if (!deadline) return false;
  return new Date(deadline).getTime() + graceDays * 24 * 60 * 60 * 1000 < Date.now();
}

/**
 * Grants service again: renews the period, marks the subscription active and
 * switches the store back on.
 *
 * All three have to happen together. Flipping stores.is_active on its own is
 * undone by suspend_expired_stores() the next time the owner opens /dashboard
 * or the nightly cron runs, which is why a reactivated store used to bounce
 * straight back to "Tienda suspendida".
 */
async function activateSubscriptionAndStore(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscriptionId: string,
) {
  const { data: sub } = await admin
    .from("store_subscriptions")
    .select("store_id, current_period_ends_at, trial_ends_at")
    .eq("id", subscriptionId)
    .single();

  const { periodStart, periodEnd } = computeNextPeriod(sub ?? {});

  await admin
    .from("store_subscriptions")
    .update({
      status: "active",
      current_period_starts_at: periodStart.toISOString(),
      current_period_ends_at: periodEnd.toISOString(),
    })
    .eq("id", subscriptionId);

  if (sub?.store_id) {
    await admin.from("stores").update({ is_active: true }).eq("id", sub.store_id);
  }
}

export async function toggleStoreActive(formData: FormData) {
  await assertAdmin();

  const storeId = formData.get("storeId") as string;
  const newActive = formData.get("active") === "true";

  const admin = createSupabaseAdminClient();

  if (newActive) {
    // Reactivating a store whose subscription already expired would be undone
    // within seconds, so renew the period as part of the same click.
    const { data: sub } = await admin
      .from("store_subscriptions")
      .select("id, status, current_period_ends_at, trial_ends_at")
      .eq("store_id", storeId)
      .maybeSingle();

    if (sub && isPastGracePeriod(sub, await getGracePeriodDays(admin))) {
      await activateSubscriptionAndStore(admin, sub.id);
      revalidatePath("/admin");
      return;
    }
  }

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

  // Activating the subscription also renews the period and switches the store
  // back on; any other status is a plain update.
  if (newStatus === "active") {
    await activateSubscriptionAndStore(admin, subscriptionId);
    revalidatePath("/admin");
    return;
  }

  await admin
    .from("store_subscriptions")
    .update({ status: newStatus })
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

  // Activate/renew the subscription and bring the store back online: the owner
  // just paid, so a suspended store has to reopen with the approval.
  if (subscriptionId) {
    await activateSubscriptionAndStore(admin, subscriptionId);
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

// Services the admin publishes on behalf of a workshop have no owner account
// (user_id stays null), so the admin panel is the only place they can be
// created or edited. There is no limit on how many can be added.
export async function createServiceAdmin(formData: FormData) {
  const user = await assertAdmin();

  const parsed = parseServiceForm(formData);
  const validationError = validateServiceForm(parsed, { requireSlug: false });
  if (validationError) {
    redirect(`/admin/servicios/nuevo?error=${encodeURIComponent(validationError)}`);
  }

  const admin = createSupabaseAdminClient();

  const whatsappConflict = await findWhatsappConflict(admin, parsed.whatsapp);
  if (whatsappConflict) {
    redirect(`/admin/servicios/nuevo?error=${encodeURIComponent(whatsappConflict)}`);
  }

  // The slug is optional in this form: derive it from the name when empty so
  // adding a workshop takes as few fields as possible.
  const slug = parsed.slug || (await generateUniqueServiceSlug(admin, parsed.name));

  const { error } = await admin.from("service_providers").insert({
    user_id: null,
    created_by: user.id,
    ...serviceFormToRow({ ...parsed, slug }),
  });

  if (error) {
    const msg =
      error.code === "23505"
        ? error.message.includes("whatsapp")
          ? "Este número de WhatsApp ya está registrado"
          : "Ese identificador ya está en uso, elige otro"
        : error.message;
    redirect(`/admin/servicios/nuevo?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/servicios");
  redirect(`/admin?ok=${encodeURIComponent(`Servicio "${parsed.name}" agregado al directorio.`)}`);
}

export async function updateServiceAdmin(formData: FormData) {
  await assertAdmin();

  const serviceId = formData.get("serviceId") as string;
  if (!serviceId) redirect("/admin");

  const parsed = parseServiceForm(formData);
  const validationError = validateServiceForm(parsed, { requireSlug: false });
  if (validationError) {
    redirect(
      `/admin/servicios/${serviceId}/editar?error=${encodeURIComponent(validationError)}`,
    );
  }

  const admin = createSupabaseAdminClient();

  const whatsappConflict = await findWhatsappConflict(admin, parsed.whatsapp, { serviceId });
  if (whatsappConflict) {
    redirect(`/admin/servicios/${serviceId}/editar?error=${encodeURIComponent(whatsappConflict)}`);
  }

  const slug = parsed.slug || (await generateUniqueServiceSlug(admin, parsed.name, serviceId));

  const { data: previous } = await admin
    .from("service_providers")
    .select("slug")
    .eq("id", serviceId)
    .maybeSingle();

  const { error } = await admin
    .from("service_providers")
    .update(serviceFormToRow({ ...parsed, slug }))
    .eq("id", serviceId);

  if (error) {
    const msg =
      error.code === "23505"
        ? error.message.includes("whatsapp")
          ? "Este número de WhatsApp ya está registrado"
          : "Ese identificador ya está en uso, elige otro"
        : error.message;
    redirect(`/admin/servicios/${serviceId}/editar?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/servicios");
  revalidatePath(`/servicios/${slug}`);
  if (previous?.slug && previous.slug !== slug) {
    revalidatePath(`/servicios/${previous.slug}`);
  }
  redirect(`/admin?ok=${encodeURIComponent(`Servicio "${parsed.name}" actualizado.`)}`);
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

  // Deleting from the edit page has to leave it: that route no longer exists.
  if (formData.get("redirectTo") === "/admin") {
    redirect(`/admin?ok=${encodeURIComponent("Servicio eliminado del directorio.")}`);
  }
}

export async function suspendExpiredStores() {
  await assertAdmin();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("suspend_expired_stores");

  if (error) {
    throw new Error(`Error al suspender tiendas vencidas: ${error.message}`);
  }
  revalidatePath("/admin");
}

export async function renewSubscription(formData: FormData) {
  await assertAdmin();

  const subscriptionId = formData.get("subscriptionId") as string;

  const admin = createSupabaseAdminClient();
  await activateSubscriptionAndStore(admin, subscriptionId);

  revalidatePath("/admin");
}
