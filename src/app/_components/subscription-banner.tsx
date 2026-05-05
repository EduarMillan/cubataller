type SubscriptionPhase =
  | "trial_ok"         // > 15 days left — no banner
  | "trial_soft"       // 15 to 6 days left — info banner
  | "trial_urgent"     // 5 to 0 days left — warning + WhatsApp
  | "grace"            // 0 to -grace days — red banner, still works
  | "active_ok"        // paid, > 15 days left — subtle line
  | "active_soft"      // paid, 15 to 6 days — info banner
  | "active_urgent"    // paid, ≤ 5 days — warning + WhatsApp
  | "active_grace"     // paid period expired within grace
  | "expired";         // past grace — handled by store deactivation

function getPhase(
  status: string,
  trialEndsAt: string | null,
  periodEndsAt: string | null,
  gracePeriodDays: number,
): { phase: SubscriptionPhase; daysLeft: number } {
  const now = new Date();

  if (status === "trialing" && trialEndsAt) {
    const end = new Date(trialEndsAt);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 15) return { phase: "trial_ok", daysLeft };
    if (daysLeft > 5) return { phase: "trial_soft", daysLeft };
    if (daysLeft > 0) return { phase: "trial_urgent", daysLeft };
    if (daysLeft >= -gracePeriodDays) return { phase: "grace", daysLeft };
    return { phase: "expired", daysLeft };
  }

  if (status === "active" && periodEndsAt) {
    const end = new Date(periodEndsAt);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 15) return { phase: "active_ok", daysLeft };
    if (daysLeft > 5) return { phase: "active_soft", daysLeft };
    if (daysLeft > 0) return { phase: "active_urgent", daysLeft };
    if (daysLeft >= -gracePeriodDays) return { phase: "active_grace", daysLeft };
    return { phase: "expired", daysLeft };
  }

  return { phase: "trial_ok", daysLeft: 999 };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCUP(amount: number) {
  return amount.toLocaleString("es-CU", { style: "currency", currency: "CUP", minimumFractionDigits: 0 });
}

export function SubscriptionBanner({
  status,
  trialEndsAt,
  periodEndsAt,
  gracePeriodDays,
  adminWhatsapp,
  monthlyPrice,
}: {
  status: string;
  trialEndsAt: string | null;
  periodEndsAt: string | null;
  gracePeriodDays: number;
  adminWhatsapp: string | null;
  monthlyPrice: number;
}) {
  const { phase, daysLeft } = getPhase(status, trialEndsAt, periodEndsAt, gracePeriodDays);

  const whatsappUrl = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent("Hola, me interesa renovar mi suscripción en Cuba Mecánica. ¿Cuáles son los pasos para realizar el pago?")}`
    : null;

  // No banner for users without trial info
  if (phase === "expired") return null;

  // Trial OK — persistent info line so the client always sees the post-trial price
  if (phase === "trial_ok") {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs font-medium text-orange-200 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Período de prueba: <strong>{daysLeft} día{daysLeft !== 1 ? "s" : ""}</strong> restantes (hasta {formatDate(trialEndsAt!)})
        </span>
        <span className="text-orange-300">
          Plan post-trial: <strong>{formatCUP(monthlyPrice)}/mes</strong>
        </span>
      </div>
    );
  }

  // Active OK — subtle status line
  if (phase === "active_ok") {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Suscripción activa hasta {formatDate(periodEndsAt!)}
        </span>
        <span>
          Plan: <strong>{formatCUP(monthlyPrice)}/mes</strong>
        </span>
      </div>
    );
  }

  // Soft warnings (trial or active, 15-6 days)
  if (phase === "trial_soft" || phase === "active_soft") {
    const label = phase === "trial_soft"
      ? `Tu período de prueba gratuita vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""} (${formatDate(trialEndsAt!)}). Al terminar, el plan continúa por ${formatCUP(monthlyPrice)} mensuales.`
      : `Tu suscripción vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""} (${formatDate(periodEndsAt!)}). Renueva por ${formatCUP(monthlyPrice)} para mantener tu tienda activa.`;

    return (
      <div className="flex flex-col gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-xs font-medium text-blue-200">{label}</p>
        </div>
      </div>
    );
  }

  // Urgent warnings (trial or active, ≤5 days)
  if (phase === "trial_urgent" || phase === "active_urgent") {
    const label = phase === "trial_urgent"
      ? `Tu prueba gratuita vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}. Activa tu suscripción mensual de ${formatCUP(monthlyPrice)} para no perder acceso.`
      : `Tu suscripción vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}. Renueva ahora por ${formatCUP(monthlyPrice)} para no perder acceso.`;

    return (
      <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm font-semibold text-amber-200">{label}</p>
        </div>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar administrador
          </a>
        )}
      </div>
    );
  }

  // Grace period (trial or active expired, within grace days)
  if (phase === "grace" || phase === "active_grace") {
    const graceDaysLeft = gracePeriodDays + daysLeft; // daysLeft is negative here
    const label = phase === "grace"
      ? `Tu prueba gratuita ha vencido. Tienes ${graceDaysLeft} día${graceDaysLeft !== 1 ? "s" : ""} de gracia para activar tu suscripción de ${formatCUP(monthlyPrice)} mensuales antes de que tu tienda sea desactivada.`
      : `Tu suscripción ha vencido. Tienes ${graceDaysLeft} día${graceDaysLeft !== 1 ? "s" : ""} de gracia para renovar (${formatCUP(monthlyPrice)}/mes) antes de que tu tienda sea desactivada.`;

    return (
      <div className="flex flex-col gap-3 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm font-semibold text-red-200">{label}</p>
        </div>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar administrador
          </a>
        )}
      </div>
    );
  }

  return null;
}
