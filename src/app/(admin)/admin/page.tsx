import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toggleStoreActive, updateSubscriptionStatus, updatePlatformSettings, renewSubscription, approveReceipt, rejectReceipt, toggleServiceActive, deleteServiceAdmin } from "./_actions";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";
import { SERVICE_CATEGORY_MAP } from "@/lib/service-categories";
import { ConfirmDeleteForm } from "./_confirm-delete-form";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; sq?: string; sfiltro?: string }>;
}) {
  const { q, filtro, sq, sfiltro } = await searchParams;
  const admin = createSupabaseAdminClient();

  // Fetch all stores with owner info and subscription
  const { data: stores } = await admin
    .from("stores")
    .select("id, name, slug, whatsapp_number, is_active, created_at, created_by, provincia, municipio, direccion")
    .order("created_at", { ascending: false });

  // Fetch memberships to get owner emails
  const storeIds = (stores ?? []).map((s) => s.id);
  const { data: memberships } = await admin
    .from("store_memberships")
    .select("store_id, user_id, role")
    .in("store_id", storeIds.length > 0 ? storeIds : ["none"])
    .eq("role", "owner");

  // Fetch all services with owner info
  const { data: services } = await admin
    .from("service_providers")
    .select("id, name, slug, category, whatsapp_number, is_active, created_at, user_id, provincia, municipio, direccion")
    .order("created_at", { ascending: false });

  // Fetch user emails (covers both store owners and service owners in one call)
  const ownerUserIds = (memberships ?? []).map((m) => m.user_id);
  const serviceUserIds = (services ?? []).map((s) => s.user_id);
  const allUserIds = [...new Set([...ownerUserIds, ...serviceUserIds])];
  const ownerEmails: Record<string, string> = {};
  if (allUserIds.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    for (const u of users) {
      if (allUserIds.includes(u.id) && u.email) {
        ownerEmails[u.id] = u.email;
      }
    }
  }

  // Map store_id -> owner email
  const storeOwnerEmail: Record<string, string> = {};
  for (const m of memberships ?? []) {
    storeOwnerEmail[m.store_id] = ownerEmails[m.user_id] ?? "—";
  }

  // Fetch subscriptions
  const { data: subscriptions } = await admin
    .from("store_subscriptions")
    .select("id, store_id, status, trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at")
    .in("store_id", storeIds.length > 0 ? storeIds : ["none"]);

  const storeSubs: Record<string, (typeof subscriptions extends (infer T)[] | null ? T : never)> = {};
  for (const sub of subscriptions ?? []) {
    storeSubs[sub.store_id] = sub;
  }

  // Fetch pending receipts (submitted by store owners, awaiting admin review)
  const { data: pendingReceipts } = await admin
    .from("manual_payment_receipts")
    .select("id, store_id, subscription_id, receipt_url, bank_reference, amount, status, paid_at, created_at")
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  // Also fetch recently reviewed receipts (last 10)
  const { data: recentReceipts } = await admin
    .from("manual_payment_receipts")
    .select("id, store_id, subscription_id, receipt_url, bank_reference, amount, status, verified_at, created_at")
    .in("status", ["approved", "rejected"])
    .order("verified_at", { ascending: false })
    .limit(10);

  // Map store names for receipts
  const storeNames: Record<string, string> = {};
  for (const s of stores ?? []) {
    storeNames[s.id] = s.name;
  }

  // Platform settings
  const { data: platformSettings } = await admin
    .from("platform_settings")
    .select("trial_days, admin_whatsapp, grace_period_days, monthly_subscription_price")
    .eq("id", true)
    .single();

  const trialDays = platformSettings?.trial_days ?? 90;
  const gracePeriodDays = platformSettings?.grace_period_days ?? 5;
  const adminWhatsapp = platformSettings?.admin_whatsapp ?? "";
  const monthlySubscriptionPrice = platformSettings?.monthly_subscription_price ?? 15000;

  // Metrics
  const totalStores = stores?.length ?? 0;
  const activeStores = stores?.filter((s) => s.is_active).length ?? 0;
  const trialExpired = (subscriptions ?? []).filter((s) => {
    if (s.status !== "trialing") return false;
    return new Date(s.trial_ends_at) < new Date();
  }).length;
  const totalServices = services?.length ?? 0;
  const activeServices = services?.filter((s) => s.is_active).length ?? 0;

  // Services filter
  let filteredServices = services ?? [];
  if (sfiltro === "activos") filteredServices = filteredServices.filter((s) => s.is_active);
  if (sfiltro === "inactivos") filteredServices = filteredServices.filter((s) => !s.is_active);
  if (sq && sq.trim()) {
    const term = sq.trim().toLowerCase();
    filteredServices = filteredServices.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (ownerEmails[s.user_id] ?? "").toLowerCase().includes(term),
    );
  }

  // Filter
  let filtered = stores ?? [];
  if (filtro === "activas") filtered = filtered.filter((s) => s.is_active);
  if (filtro === "inactivas") filtered = filtered.filter((s) => !s.is_active);
  if (filtro === "trial_vencido") {
    const expiredIds = new Set(
      (subscriptions ?? [])
        .filter((s) => s.status === "trialing" && new Date(s.trial_ends_at) < new Date())
        .map((s) => s.store_id),
    );
    filtered = filtered.filter((s) => expiredIds.has(s.id));
  }
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (storeOwnerEmail[s.id] ?? "").toLowerCase().includes(term),
    );
  }

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gestión de plataforma</h1>
        <p className="mt-1 text-sm text-muted">
          Administra las tiendas, servicios y suscripciones de la plataforma.
        </p>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">Total tiendas</p>
          <p className="mt-2 text-xl font-bold text-accent tabular-nums sm:text-2xl">{totalStores}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">Tiendas activas</p>
          <p className="mt-2 text-xl font-bold text-emerald-400 tabular-nums sm:text-2xl">{activeStores}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">Trial vencido</p>
          <p className={`mt-2 text-xl font-bold tabular-nums sm:text-2xl ${trialExpired > 0 ? "text-red-400" : "text-zinc-500"}`}>
            {trialExpired}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">Total servicios</p>
          <p className="mt-2 text-xl font-bold text-accent tabular-nums sm:text-2xl">{totalServices}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">Servicios activos</p>
          <p className="mt-2 text-xl font-bold text-emerald-400 tabular-nums sm:text-2xl">{activeServices}</p>
        </div>
      </div>

      {/* Platform settings */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Configuración de la plataforma</h2>
        <form action={updatePlatformSettings} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="trialDays" className="block text-sm font-medium text-zinc-300">
              Días de trial
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="trialDays"
                name="trialDays"
                type="number"
                min={1}
                max={365}
                defaultValue={trialDays}
                className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold tabular-nums text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              <span className="text-xs text-muted">días</span>
            </div>
          </div>
          <div>
            <label htmlFor="gracePeriodDays" className="block text-sm font-medium text-zinc-300">
              Días de gracia
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="gracePeriodDays"
                name="gracePeriodDays"
                type="number"
                min={0}
                max={30}
                defaultValue={gracePeriodDays}
                className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold tabular-nums text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              <span className="text-xs text-muted">días</span>
            </div>
          </div>
          <div>
            <label htmlFor="monthlySubscriptionPrice" className="block text-sm font-medium text-zinc-300">
              Precio mensual
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted">CUP</span>
              <input
                id="monthlySubscriptionPrice"
                name="monthlySubscriptionPrice"
                type="number"
                min={0}
                step={500}
                defaultValue={monthlySubscriptionPrice}
                className="w-28 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold tabular-nums text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">Cobro post-trial visible al cliente.</p>
          </div>
          <div>
            <label htmlFor="adminWhatsapp" className="block text-sm font-medium text-zinc-300">
              WhatsApp admin
            </label>
            <input
              id="adminWhatsapp"
              name="adminWhatsapp"
              type="text"
              placeholder="56912345678"
              defaultValue={adminWhatsapp}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
            >
              Guardar configuración
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              Trial: <span className="font-semibold text-zinc-200">{trialDays}d</span> · Gracia: <span className="font-semibold text-zinc-200">{gracePeriodDays}d</span> · Precio: <span className="font-semibold text-zinc-200">{monthlySubscriptionPrice.toLocaleString("es-CU", { style: "currency", currency: "CUP", minimumFractionDigits: 0 })}/mes</span> · WhatsApp: <span className="font-semibold text-zinc-200">{adminWhatsapp || "no configurado"}</span>
            </p>
          </div>
        </form>
      </div>

      {/* ── Pending receipts ── */}
      {(pendingReceipts ?? []).length > 0 && (
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 shadow-md sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Comprobantes por revisar
            <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-200 ring-1 ring-amber-500/40">
              {(pendingReceipts ?? []).length}
            </span>
          </h2>
          <div className="mt-3 space-y-3">
            {(pendingReceipts ?? []).map((receipt) => (
              <div
                key={receipt.id}
                className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">
                      {storeNames[receipt.store_id] ?? "Tienda desconocida"}
                    </span>
                    {receipt.amount != null && (
                      <span className="text-sm font-bold text-emerald-300">
                        {(receipt.amount as number).toLocaleString("es-CU", { style: "currency", currency: "CUP", minimumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Enviado: {new Date(receipt.created_at).toLocaleDateString("es-CU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {receipt.bank_reference && (
                      <> · Ref: <span className="font-medium text-zinc-300">{receipt.bank_reference}</span></>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Email: {storeOwnerEmail[receipt.store_id] ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {receipt.receipt_url && (
                    <a
                      href={receipt.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                      Ver comprobante
                    </a>
                  )}
                  <form action={approveReceipt}>
                    <input type="hidden" name="receiptId" value={receipt.id} />
                    <input type="hidden" name="subscriptionId" value={receipt.subscription_id ?? ""} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                    >
                      Aprobar y activar
                    </button>
                  </form>
                  <form action={rejectReceipt}>
                    <input type="hidden" name="receiptId" value={receipt.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-500/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/15 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recently reviewed receipts ── */}
      {(recentReceipts ?? []).length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-md">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-100 sm:px-5">
            Comprobantes revisados recientemente ({(recentReceipts ?? []).length})
          </summary>
          <div className="divide-y divide-zinc-800 border-t border-zinc-800">
            {(recentReceipts ?? []).map((receipt) => (
              <div key={receipt.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{storeNames[receipt.store_id] ?? "—"}</span>
                    {receipt.amount != null && (
                      <span className="text-xs font-bold text-zinc-200">
                        {(receipt.amount as number).toLocaleString("es-CU", { style: "currency", currency: "CUP", minimumFractionDigits: 0 })}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      receipt.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
                    }`}>
                      {receipt.status === "approved" ? "Aprobado" : "Rechazado"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {receipt.verified_at && `Revisado: ${new Date(receipt.verified_at).toLocaleDateString("es-CU", { day: "2-digit", month: "short" })}`}
                    {receipt.bank_reference && ` · Ref: ${receipt.bank_reference}`}
                  </p>
                </div>
                {receipt.receipt_url && (
                  <a
                    href={receipt.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-orange-400 hover:text-orange-300 hover:underline"
                  >
                    Ver archivo
                  </a>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Stores section ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Tiendas</h2>

      {/* Filters */}
      <form className="flex flex-col gap-2 sm:flex-row">
        {sq && <input type="hidden" name="sq" value={sq} />}
        {sfiltro && <input type="hidden" name="sfiltro" value={sfiltro} />}
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Buscar por nombre de tienda o email..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <select
          name="filtro"
          defaultValue={filtro ?? "todas"}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        >
          <option value="todas">Todas</option>
          <option value="activas">Activas</option>
          <option value="inactivas">Inactivas</option>
          <option value="trial_vencido">Trial vencido</option>
        </select>
        <button type="submit" className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
          Filtrar
        </button>
        {(q || (filtro && filtro !== "todas")) && (
          <a
            href={`/admin${sq || sfiltro ? `?${new URLSearchParams({ ...(sq ? { sq } : {}), ...(sfiltro ? { sfiltro } : {}) }).toString()}` : ""}`}
            className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-400 hover:border-orange-500/50 hover:text-orange-400"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Stores list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center sm:p-12">
          <h3 className="text-base font-semibold">Sin tiendas</h3>
          <p className="mt-1 text-sm text-muted">No hay tiendas que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((store) => {
            const sub = storeSubs[store.id];
            const ownerEmail = storeOwnerEmail[store.id] ?? "—";
            const now = new Date();

            let trialDaysLeft: number | null = null;
            let trialExpired = false;
            let subLabel = "Sin suscripción";
            let subColor = "text-zinc-400 bg-zinc-800 ring-1 ring-zinc-700";

            if (sub) {
              if (sub.status === "trialing") {
                const endDate = new Date(sub.trial_ends_at);
                trialDaysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (trialDaysLeft <= 0) {
                  trialExpired = true;
                  subLabel = "Trial vencido";
                  subColor = "text-red-300 bg-red-500/15 ring-1 ring-red-500/30";
                } else {
                  subLabel = `Trial: ${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""}`;
                  subColor = trialDaysLeft <= 7
                    ? "text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30"
                    : "text-blue-300 bg-blue-500/15 ring-1 ring-blue-500/30";
                }
              } else if (sub.status === "active") {
                if (sub.current_period_ends_at) {
                  const periodEnd = new Date(sub.current_period_ends_at);
                  const daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysUntilRenewal <= 0) {
                    subLabel = "Período vencido";
                    subColor = "text-red-300 bg-red-500/15 ring-1 ring-red-500/30";
                  } else if (daysUntilRenewal <= 7) {
                    subLabel = `Activa: ${daysUntilRenewal}d restante${daysUntilRenewal !== 1 ? "s" : ""}`;
                    subColor = "text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30";
                  } else {
                    subLabel = `Activa: ${daysUntilRenewal}d restantes`;
                    subColor = "text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30";
                  }
                } else {
                  subLabel = "Activa (pagada)";
                  subColor = "text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30";
                }
              } else if (sub.status === "past_due") {
                subLabel = "Pago pendiente";
                subColor = "text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30";
              } else if (sub.status === "cancelled") {
                subLabel = "Cancelada";
                subColor = "text-red-300 bg-red-500/15 ring-1 ring-red-500/30";
              }
            }

            return (
              <article
                key={store.id}
                className={`rounded-lg border p-4 shadow-md sm:p-5 ${store.is_active ? "border-zinc-800 bg-zinc-900/60" : "border-red-500/40 bg-red-500/5"}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Store info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{store.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${subColor}`}>
                        {subLabel}
                      </span>
                      {!store.is_active && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-500/40">
                          DESACTIVADA
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                      <span>{ownerEmail}</span>
                      <span>/{store.slug}</span>
                      {store.whatsapp_number && <span>Tel: {store.whatsapp_number}</span>}
                      {store.municipio && (
                        <span>
                          {store.direccion ? `${store.direccion}, ` : ""}{store.municipio}{store.provincia ? `, ${PROVINCIA_MAP.get(store.provincia)?.name ?? store.provincia}` : ""}
                        </span>
                      )}
                      <span>
                        Creada:{" "}
                        {new Date(store.created_at).toLocaleDateString("es-CU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {sub && sub.status === "trialing" && (
                      <p className="mt-1 text-xs text-muted">
                        Trial: {new Date(sub.trial_starts_at).toLocaleDateString("es-CU")} →{" "}
                        {new Date(sub.trial_ends_at).toLocaleDateString("es-CU")}
                      </p>
                    )}
                    {sub && sub.status === "active" && sub.current_period_ends_at && (
                      <p className="mt-1 text-xs text-muted">
                        Período: {new Date(sub.current_period_starts_at).toLocaleDateString("es-CU")} →{" "}
                        {new Date(sub.current_period_ends_at).toLocaleDateString("es-CU")}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {sub && sub.status === "trialing" && trialExpired && (
                      <form action={updateSubscriptionStatus}>
                        <input type="hidden" name="subscriptionId" value={sub.id} />
                        <input type="hidden" name="status" value="active" />
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                        >
                          Activar suscripción
                        </button>
                      </form>
                    )}

                    {sub && sub.status === "active" && (
                      <>
                        <form action={renewSubscription}>
                          <input type="hidden" name="subscriptionId" value={sub.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                          >
                            Renovar +1 mes
                          </button>
                        </form>
                        <form action={updateSubscriptionStatus}>
                          <input type="hidden" name="subscriptionId" value={sub.id} />
                          <input type="hidden" name="status" value="past_due" />
                          <button
                            type="submit"
                            className="rounded-md border border-amber-500/40 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/15"
                          >
                            Marcar pendiente
                          </button>
                        </form>
                      </>
                    )}

                    <form action={toggleStoreActive}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="active" value={store.is_active ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          store.is_active
                            ? "border border-red-500/40 text-red-300 hover:bg-red-500/15"
                            : "bg-orange-600 text-white shadow-md shadow-orange-500/30 hover:bg-orange-500"
                        }`}
                      >
                        {store.is_active ? "Desactivar" : "Reactivar"}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </section>

      {/* ── Services section ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Servicios</h2>

        {/* Services filters */}
        <form className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            {/* Preserve store filters */}
            {q && <input type="hidden" name="q" value={q} />}
            {filtro && <input type="hidden" name="filtro" value={filtro} />}
            <input
              name="sq"
              type="text"
              defaultValue={sq}
              placeholder="Buscar por nombre de servicio o email..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <select
            name="sfiltro"
            defaultValue={sfiltro ?? "todos"}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <button type="submit" className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Filtrar
          </button>
          {(sq || (sfiltro && sfiltro !== "todos")) && (
            <a
              href={`/admin${q || filtro ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(filtro ? { filtro } : {}) }).toString()}` : ""}`}
              className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-400 hover:border-orange-500/50 hover:text-orange-400"
            >
              Limpiar
            </a>
          )}
        </form>

        {filteredServices.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center sm:p-12">
            <h3 className="text-base font-semibold">Sin servicios</h3>
            <p className="mt-1 text-sm text-muted">No hay servicios que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((service) => {
              const ownerEmail = ownerEmails[service.user_id] ?? "—";
              const category = SERVICE_CATEGORY_MAP.get(service.category);

              return (
                <article
                  key={service.id}
                  className={`rounded-lg border p-4 shadow-md sm:p-5 ${service.is_active ? "border-zinc-800 bg-zinc-900/60" : "border-red-500/40 bg-red-500/5"}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{service.name}</h3>
                        {category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                            <span>{category.emoji}</span>
                            {category.label}
                          </span>
                        )}
                        {!service.is_active && (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-500/40">
                            DESACTIVADO
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                        <span className="break-all">{ownerEmail}</span>
                        <span>/{service.slug}</span>
                        {service.whatsapp_number && <span>Tel: {service.whatsapp_number}</span>}
                        {service.municipio && (
                          <span>
                            {service.direccion ? `${service.direccion}, ` : ""}{service.municipio}
                            {service.provincia ? `, ${PROVINCIA_MAP.get(service.provincia)?.name ?? service.provincia}` : ""}
                          </span>
                        )}
                        <span>
                          Creado:{" "}
                          {new Date(service.created_at).toLocaleDateString("es-CU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <form action={toggleServiceActive}>
                        <input type="hidden" name="serviceId" value={service.id} />
                        <input type="hidden" name="active" value={service.is_active ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                            service.is_active
                              ? "border border-amber-500/40 text-amber-300 hover:bg-amber-500/15"
                              : "bg-orange-600 text-white shadow-md shadow-orange-500/30 hover:bg-orange-500"
                          }`}
                        >
                          {service.is_active ? "Desactivar" : "Reactivar"}
                        </button>
                      </form>
                      <ConfirmDeleteForm
                        action={deleteServiceAdmin}
                        message={`¿Eliminar definitivamente el servicio "${service.name}"? Esta acción no se puede deshacer.`}
                        hiddenFields={{ serviceId: service.id }}
                      >
                        <button
                          type="submit"
                          className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-red-500/30 hover:bg-red-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                        >
                          Eliminar
                        </button>
                      </ConfirmDeleteForm>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
