import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { ReceiptUploadForm } from "./_components";

const FALLBACK_MONTHLY_PRICE = 15000;

function formatCUP(amount: number) {
  return amount.toLocaleString("es-CU", { style: "currency", currency: "CUP", minimumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-CU", { day: "2-digit", month: "short" });
}

type SubStatus = "trialing" | "pending_manual_payment" | "active" | "past_due" | "canceled";

const STATUS_CONFIG: Record<SubStatus, { label: string; color: string; bg: string }> = {
  trialing: { label: "Período de prueba", color: "text-blue-300", bg: "bg-blue-500/15 ring-blue-500/30" },
  pending_manual_payment: { label: "Pago pendiente", color: "text-amber-300", bg: "bg-amber-500/15 ring-amber-500/30" },
  active: { label: "Activa", color: "text-emerald-300", bg: "bg-emerald-500/15 ring-emerald-500/30" },
  past_due: { label: "Vencida", color: "text-red-300", bg: "bg-red-500/15 ring-red-500/30" },
  canceled: { label: "Cancelada", color: "text-zinc-400", bg: "bg-zinc-800 ring-zinc-700" },
};

const RECEIPT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: "En revisión", color: "text-blue-300", bg: "bg-blue-500/15", icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  approved: { label: "Aprobado", color: "text-emerald-300", bg: "bg-emerald-500/15", icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  rejected: { label: "Rechazado", color: "text-red-300", bg: "bg-red-500/15", icon: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
};

export default async function MiPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const supabase = await createSupabaseServerClient();
  const { error: searchError, success } = await searchParams;

  const [subResult, receiptsResult, settingsResult] = await Promise.all([
    supabase
      .from("store_subscriptions")
      .select("id, status, billing_cycle, plan_id, trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at")
      .eq("store_id", store.storeId)
      .single(),
    supabase
      .from("manual_payment_receipts")
      .select("id, receipt_url, bank_reference, amount, status, paid_at, verified_at, created_at")
      .eq("store_id", store.storeId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("platform_settings")
      .select("admin_whatsapp, grace_period_days, monthly_subscription_price")
      .eq("id", true)
      .single(),
  ]);

  const sub = subResult.data;
  const receipts = receiptsResult.data ?? [];
  const adminWhatsapp = settingsResult.data?.admin_whatsapp ?? null;
  const monthlyPrice = settingsResult.data?.monthly_subscription_price ?? FALLBACK_MONTHLY_PRICE;

  // Fetch plan info
  let planName = "Plan Base";
  let planPrice: number | null = null;
  if (sub?.plan_id) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name, monthly_price")
      .eq("id", sub.plan_id)
      .single();
    if (plan) {
      planName = plan.name as string;
      planPrice = plan.monthly_price as number;
    }
  }

  // The catalog plan price may be 0 (free/trial seed). Always prefer the admin-managed
  // platform price unless the plan defines a positive override.
  const displayPrice = planPrice && planPrice > 0 ? planPrice : monthlyPrice;

  const subStatus = (sub?.status ?? "trialing") as SubStatus;
  const statusInfo = STATUS_CONFIG[subStatus] ?? STATUS_CONFIG.trialing;

  // Days left calculation
  let daysLeft: number | null = null;
  let referenceDate: string | null = null;
  if (subStatus === "trialing" && sub?.trial_ends_at) {
    const end = new Date(sub.trial_ends_at as string);
    daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    referenceDate = sub.trial_ends_at as string;
  } else if ((subStatus === "active" || subStatus === "past_due") && sub?.current_period_ends_at) {
    const end = new Date(sub.current_period_ends_at as string);
    daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    referenceDate = sub.current_period_ends_at as string;
  }

  // Should we show the upload form?
  // Show when: trial ending soon (≤15 days), pending payment, past due, or active ending soon
  const hasSubmittedReceipt = receipts.some((r) => r.status === "submitted");
  const showUploadForm =
    !hasSubmittedReceipt &&
    sub &&
    (subStatus === "pending_manual_payment" ||
      subStatus === "past_due" ||
      (subStatus === "trialing" && daysLeft !== null && daysLeft <= 15) ||
      (subStatus === "active" && daysLeft !== null && daysLeft <= 15));

  const whatsappUrl = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent("Hola, tengo una consulta sobre mi suscripción en FIXCAR.")}`
    : null;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi Plan</h1>
        <p className="mt-1 text-sm text-muted">
          Estado de tu suscripción y gestión de pagos
        </p>
      </header>

      {/* Flash messages */}
      {searchError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {searchError}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* ── Subscription status card ── */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusInfo.bg} ${statusInfo.color}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusInfo.label}
              </span>
              <span className="text-xs text-muted">{planName}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {subStatus === "trialing" && sub?.trial_starts_at && sub?.trial_ends_at && (
                <>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Inicio prueba</p>
                    <p className="text-sm font-semibold">{formatDate(sub.trial_starts_at as string)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Fin prueba</p>
                    <p className="text-sm font-semibold">{formatDate(sub.trial_ends_at as string)}</p>
                  </div>
                </>
              )}
              {(subStatus === "active" || subStatus === "past_due") && sub?.current_period_starts_at && sub?.current_period_ends_at && (
                <>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Inicio período</p>
                    <p className="text-sm font-semibold">{formatDate(sub.current_period_starts_at as string)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Próximo vencimiento</p>
                    <p className="text-sm font-semibold">{formatDate(sub.current_period_ends_at as string)}</p>
                  </div>
                </>
              )}
              {daysLeft !== null && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Días restantes</p>
                  <p className={`text-lg font-bold ${daysLeft <= 5 ? "text-red-600" : daysLeft <= 15 ? "text-amber-600" : "text-emerald-600"}`}>
                    {daysLeft > 0 ? daysLeft : 0}
                  </p>
                </div>
              )}
            </div>

            {/* Plan price */}
            <div className="rounded-md border border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-orange-700/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                {subStatus === "trialing" ? "Costo al terminar el trial" : "Costo mensual del plan"}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  {formatCUP(displayPrice)}
                </span>
                <span className="text-sm font-medium text-orange-400">/ mes</span>
              </div>
              <p className="mt-1 text-xs text-orange-300/80">
                Suscripción mensual recurrente. Pago por transferencia bancaria.
              </p>
            </div>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar administrador
            </a>
          )}
        </div>

        {/* Contextual info box */}
        {subStatus === "trialing" && daysLeft !== null && daysLeft > 15 && (
          <div className="mt-4 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs leading-relaxed text-blue-200">
            Estás en tu período de prueba gratuita. Al terminar, tu plan continuará por <strong>{formatCUP(displayPrice)} mensuales</strong>. Cuando se acerque la fecha de vencimiento podrás subir tu comprobante de transferencia aquí para activar tu suscripción.
          </div>
        )}
        {subStatus === "active" && daysLeft !== null && daysLeft > 15 && (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs leading-relaxed text-emerald-200">
            Tu suscripción está al día. Cuando se acerque el vencimiento te avisaremos para que renueves.
          </div>
        )}
      </div>

      {/* ── Upload receipt (shows when payment is needed) ── */}
      {hasSubmittedReceipt && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-5 shadow-md sm:p-6">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-200">Comprobante en revisión</p>
              <p className="mt-1 text-xs text-blue-300">
                Ya enviaste un comprobante y está siendo revisado por el administrador. Te notificaremos cuando sea verificado.
              </p>
            </div>
          </div>
        </div>
      )}

      {showUploadForm && sub && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 shadow-md sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {subStatus === "past_due"
                  ? "Tu suscripción está vencida"
                  : daysLeft !== null && daysLeft <= 5
                    ? `Tu plan vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
                    : "Tu plan vence pronto"}
              </p>
              <p className="mt-1 text-xs text-amber-300">
                Realiza una transferencia bancaria por <strong>{formatCUP(displayPrice)}</strong> y sube el comprobante aquí para
                {subStatus === "trialing" ? " activar" : " renovar"} tu suscripción mensual.
                {whatsappUrl && " Si tienes dudas, contacta al administrador por WhatsApp."}
              </p>
            </div>
          </div>
          <ReceiptUploadForm subscriptionId={sub.id as string} expectedAmount={displayPrice} />
        </div>
      )}

      {/* ── Receipt history ── */}
      {receipts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold">Historial de comprobantes</h2>

          <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-md">
            {receipts.map((receipt) => {
              const info = RECEIPT_CONFIG[receipt.status as string] ?? RECEIPT_CONFIG.submitted;

              return (
                <div
                  key={receipt.id as string}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${info.bg}`}>
                      <svg className={`h-4 w-4 ${info.color}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={info.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold ${info.color}`}>{info.label}</span>
                        {receipt.amount != null && (
                          <span className="text-sm font-bold text-zinc-100">
                            {formatCUP(receipt.amount as number)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        Enviado {formatDateShort(receipt.created_at as string)}
                        {receipt.bank_reference && (
                          <> · Ref: <span className="font-medium">{receipt.bank_reference as string}</span></>
                        )}
                      </p>
                      {receipt.status === "rejected" && (
                        <p className="text-xs font-medium text-red-600">
                          Rechazado — puedes volver a subir un comprobante
                        </p>
                      )}
                      {receipt.status === "approved" && receipt.verified_at && (
                        <p className="text-xs text-emerald-600">
                          Verificado el {formatDateShort(receipt.verified_at as string)}
                        </p>
                      )}
                    </div>
                  </div>

                  {receipt.receipt_url && (
                    <a
                      href={receipt.receipt_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      Ver archivo
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 shadow-md sm:p-6">
        <h2 className="text-base font-bold">¿Cómo funciona el pago?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-400 ring-1 ring-orange-500/30">
              1
            </div>
            <div>
              <p className="text-sm font-semibold">Aviso en tu panel</p>
              <p className="mt-0.5 text-xs text-muted">
                Cuando tu plan esté por vencer verás un aviso aquí y en tu dashboard.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-400 ring-1 ring-orange-500/30">
              2
            </div>
            <div>
              <p className="text-sm font-semibold">Transfiere y sube comprobante</p>
              <p className="mt-0.5 text-xs text-muted">
                Haz la transferencia bancaria y sube la foto del comprobante aquí.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-400 ring-1 ring-orange-500/30">
              3
            </div>
            <div>
              <p className="text-sm font-semibold">Verificación</p>
              <p className="mt-0.5 text-xs text-muted">
                El administrador revisa tu pago y activa tu suscripción. Si no pagas, tu tienda será desactivada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
