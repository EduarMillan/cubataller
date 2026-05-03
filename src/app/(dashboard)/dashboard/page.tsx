import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { getUserService } from "@/lib/queries/service";
import { PROVINCIA_MAP } from "@/lib/cuba-locations";

export default async function DashboardPage() {
  const store = await getUserStore();
  if (!store) {
    const service = await getUserService();
    if (service) redirect("/mi-servicio");
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date();

  // Date ranges
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Last 7 days boundaries
  const days7: { label: string; start: Date; end: Date }[] = [];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    days7.push({ label: i === 0 ? "Hoy" : dayNames[d.getDay()], start, end });
  }

  // Store creation date
  const { data: storeData } = await supabase
    .from("stores")
    .select("created_at")
    .eq("id", store.storeId)
    .single();

  const storeCreatedAt = storeData?.created_at ? new Date(storeData.created_at) : now;
  const storeAgeMonths = Math.floor(
    (now.getTime() - storeCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );

  // ── Parallel queries ──
  const [
    partsResult,
    lowStockResult,
    outOfStockResult,
    noPriceResult,
    inventoryValueResult,
    ordersTodayResult,
    salesTodayResult,
    salesMonthResult,
    salesPrevMonthResult,
    ordersMonthResult,
    topItemsResult,
    recentOrdersResult,
    sales7dResult,
    inventoryByMakeResult,
    publicPartsResult,
    viewsThisMonthResult,
    viewsPrevMonthResult,
    viewsLast30dResult,
  ] = await Promise.all([
    // Active parts count
    supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .eq("is_active", true),

    // Low stock (1-3)
    supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .gt("quantity_on_hand", 0)
      .lte("quantity_on_hand", 3),

    // Out of stock (0)
    supabase
      .from("parts")
      .select("id, name, brand, vehicle_make, vehicle_model")
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .eq("quantity_on_hand", 0)
      .order("updated_at", { ascending: false })
      .limit(8),

    // No price set
    supabase
      .from("parts")
      .select("id, name, brand")
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .is("price", null)
      .limit(8),

    // Inventory value: sum(price * quantity_on_hand) for parts with price
    supabase
      .from("parts")
      .select("price, quantity_on_hand")
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .gt("quantity_on_hand", 0)
      .not("price", "is", null),

    // Orders today count
    supabase
      .from("sales_orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .gte("created_at", todayStart.toISOString()),

    // Sales total today
    supabase
      .from("sales_orders")
      .select("total")
      .eq("store_id", store.storeId)
      .in("status", ["confirmed", "paid"])
      .gte("created_at", todayStart.toISOString()),

    // Sales total this month
    supabase
      .from("sales_orders")
      .select("total")
      .eq("store_id", store.storeId)
      .in("status", ["confirmed", "paid"])
      .gte("created_at", monthStart.toISOString()),

    // Sales total previous month
    supabase
      .from("sales_orders")
      .select("total")
      .eq("store_id", store.storeId)
      .in("status", ["confirmed", "paid"])
      .gte("created_at", prevMonthStart.toISOString())
      .lte("created_at", prevMonthEnd.toISOString()),

    // Orders count this month
    supabase
      .from("sales_orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .in("status", ["confirmed", "paid"])
      .gte("created_at", monthStart.toISOString()),

    // Top items this month
    supabase
      .from("sales_order_items")
      .select("quantity, line_total, part_id, parts(name, brand, vehicle_make, vehicle_model), sales_orders!inner(status, created_at)")
      .eq("store_id", store.storeId)
      .in("sales_orders.status", ["confirmed", "paid"])
      .gte("sales_orders.created_at", monthStart.toISOString()),

    // Recent orders (last 5)
    supabase
      .from("sales_orders")
      .select("id, order_number, status, customer_name, total, created_at")
      .eq("store_id", store.storeId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Sales last 7 days
    supabase
      .from("sales_orders")
      .select("total, created_at")
      .eq("store_id", store.storeId)
      .in("status", ["confirmed", "paid"])
      .gte("created_at", days7[0].start.toISOString()),

    // Inventory distribution by vehicle make
    supabase
      .from("parts")
      .select("vehicle_make, quantity_on_hand, price")
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .gt("quantity_on_hand", 0),

    // Public parts count (for onboarding)
    supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .eq("is_public", true),

    // Page views this month
    supabase
      .from("page_views")
      .select("page_type", { count: "exact", head: false })
      .eq("store_id", store.storeId)
      .gte("viewed_at", monthStart.toISOString()),

    // Page views previous month
    supabase
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.storeId)
      .gte("viewed_at", prevMonthStart.toISOString())
      .lte("viewed_at", prevMonthEnd.toISOString()),

    // Page views last 30 days (daily breakdown)
    supabase
      .from("page_views")
      .select("page_type, viewed_at")
      .eq("store_id", store.storeId)
      .gte("viewed_at", days7[0].start.toISOString()),
  ]);

  // ── Process metrics ──
  const partsCount = partsResult.count ?? 0;
  const lowStockCount = lowStockResult.count ?? 0;
  const outOfStockParts = outOfStockResult.data ?? [];
  const noPriceParts = noPriceResult.data ?? [];
  const ordersToday = ordersTodayResult.count ?? 0;

  const salesToday = (salesTodayResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total), 0,
  );

  // Inventory value
  const inventoryValue = (inventoryValueResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.price) * Number(row.quantity_on_hand), 0,
  );
  const totalUnits = (inventoryValueResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.quantity_on_hand), 0,
  );

  const salesMonth = (salesMonthResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total), 0,
  );
  const salesPrevMonth = (salesPrevMonthResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total), 0,
  );
  const ordersMonth = ordersMonthResult.count ?? 0;
  const ticketPromedio = ordersMonth > 0 ? Math.round(salesMonth / ordersMonth) : 0;

  let monthChange: number | null = null;
  if (salesPrevMonth > 0) {
    monthChange = Math.round(((salesMonth - salesPrevMonth) / salesPrevMonth) * 100);
  }

  // ── Sales last 7 days ──
  const salesByDay = days7.map((day) => {
    const dayTotal = (sales7dResult.data ?? [])
      .filter((row) => {
        const d = new Date(row.created_at);
        return d >= day.start && d <= day.end;
      })
      .reduce((sum, row) => sum + Number(row.total), 0);
    return { label: day.label, total: dayTotal };
  });
  const maxDayTotal = Math.max(...salesByDay.map((d) => d.total), 1);

  // ── Recent orders ──
  const recentOrders = (recentOrdersResult.data ?? []) as Array<{
    id: string;
    order_number: string;
    status: string;
    customer_name: string | null;
    total: number;
    created_at: string;
  }>;

  // ── Inventory by make ──
  const makeMap = new Map<string, { units: number; value: number }>();
  for (const row of inventoryByMakeResult.data ?? []) {
    const make = row.vehicle_make as string;
    const entry = makeMap.get(make) ?? { units: 0, value: 0 };
    entry.units += Number(row.quantity_on_hand);
    entry.value += Number(row.price ?? 0) * Number(row.quantity_on_hand);
    makeMap.set(make, entry);
  }
  const topMakes = [...makeMap.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 6);
  const maxMakeValue = Math.max(...topMakes.map(([, d]) => d.value), 1);

  // ── Top brands, models, parts ──
  const items = (topItemsResult.data ?? []) as unknown as Array<{
    quantity: number;
    line_total: number;
    part_id: string;
    parts: { name: string; brand: string; vehicle_make: string; vehicle_model: string } | null;
    sales_orders: { status: string; created_at: string } | null;
  }>;

  const brandMap = new Map<string, { revenue: number; qty: number }>();
  const modelMap = new Map<string, { revenue: number; qty: number }>();
  const partMap = new Map<string, { name: string; revenue: number; qty: number }>();

  for (const item of items) {
    const part = item.parts;
    if (!part) continue;
    const revenue = Number(item.line_total);
    const qty = item.quantity;

    const b = brandMap.get(part.brand) ?? { revenue: 0, qty: 0 };
    b.revenue += revenue;
    b.qty += qty;
    brandMap.set(part.brand, b);

    const modelKey = `${part.vehicle_make} ${part.vehicle_model}`;
    const m = modelMap.get(modelKey) ?? { revenue: 0, qty: 0 };
    m.revenue += revenue;
    m.qty += qty;
    modelMap.set(modelKey, m);

    const p = partMap.get(item.part_id) ?? { name: part.name, revenue: 0, qty: 0 };
    p.revenue += revenue;
    p.qty += qty;
    partMap.set(item.part_id, p);
  }

  const topBrands = [...brandMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
  const topModels = [...modelMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
  const topParts = [...partMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // ── Slow movers ──
  let slowMovers: Array<{
    id: string;
    name: string;
    brand: string;
    vehicle_make: string;
    vehicle_model: string;
    quantity_on_hand: number;
  }> = [];

  if (storeAgeMonths >= 3) {
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: recentSaleItems } = await supabase
      .from("sales_order_items")
      .select("part_id, sales_orders!inner(status, created_at)")
      .eq("store_id", store.storeId)
      .in("sales_orders.status", ["confirmed", "paid"])
      .gte("sales_orders.created_at", ninetyDaysAgo.toISOString());

    const recentPartIds = new Set(
      (recentSaleItems ?? []).map((i) => (i as { part_id: string }).part_id),
    );

    const { data: allActiveParts } = await supabase
      .from("parts")
      .select("id, name, brand, vehicle_make, vehicle_model, quantity_on_hand")
      .eq("store_id", store.storeId)
      .eq("is_active", true)
      .gt("quantity_on_hand", 0)
      .order("quantity_on_hand", { ascending: false });

    slowMovers = (allActiveParts ?? [])
      .filter((p) => !recentPartIds.has(p.id))
      .slice(0, 8);
  }

  const hasTopData = topBrands.length > 0;
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const currentMonthName = monthNames[now.getMonth()];

  const publicPartsCount = publicPartsResult.count ?? 0;

  // ── Page views metrics ──
  const viewsThisMonthData = viewsThisMonthResult.data ?? [];
  const viewsThisMonth = viewsThisMonthData.length;
  const storeViewsThisMonth = viewsThisMonthData.filter(
    (v) => (v as { page_type: string }).page_type === "store",
  ).length;
  const partViewsThisMonth = viewsThisMonthData.filter(
    (v) => (v as { page_type: string }).page_type === "part",
  ).length;
  const viewsPrevMonth = viewsPrevMonthResult.count ?? 0;

  let viewsChange: number | null = null;
  if (viewsPrevMonth > 0) {
    viewsChange = Math.round(((viewsThisMonth - viewsPrevMonth) / viewsPrevMonth) * 100);
  }

  // Views last 7 days
  const viewsByDay = days7.map((day) => {
    const count = (viewsLast30dResult.data ?? []).filter((row) => {
      const d = new Date((row as { viewed_at: string }).viewed_at);
      return d >= day.start && d <= day.end;
    }).length;
    return { label: day.label, count };
  });
  const maxDayViews = Math.max(...viewsByDay.map((d) => d.count), 1);

  // ── Onboarding checklist ──
  const onboardingSteps = [
    {
      key: "whatsapp",
      label: "Agrega tu número de WhatsApp",
      description: "Para que los clientes puedan contactarte directamente.",
      done: !!store.whatsappNumber,
      href: "/dashboard/configuracion",
      cta: "Ir a configuración",
    },
    {
      key: "location",
      label: "Completa tu dirección",
      description: "Para que aparezcas en búsquedas por ubicación.",
      done: !!store.provincia && !!store.municipio,
      href: "/dashboard/configuracion",
      cta: "Ir a configuración",
    },
    {
      key: "parts",
      label: "Agrega tu primer repuesto",
      description: "Registra las piezas que tienes disponibles.",
      done: partsCount > 0,
      href: "/dashboard/inventario/nuevo",
      cta: "Agregar pieza",
    },
    {
      key: "public",
      label: "Publica tus piezas",
      description: "Marca tus piezas como públicas para que aparezcan en el buscador.",
      done: publicPartsCount > 0,
      href: "/dashboard/inventario",
      cta: "Ver inventario",
    },
    {
      key: "sale",
      label: "Registra tu primera venta",
      description: "Lleva el control de tus ventas desde el panel.",
      done: recentOrders.length > 0,
      href: "/dashboard/ventas/nueva",
      cta: "Nueva venta",
    },
  ];

  const completedSteps = onboardingSteps.filter((s) => s.done).length;
  const allOnboardingDone = completedSteps === onboardingSteps.length;

  // Alerts count for header
  const alertsCount = outOfStockParts.length + noPriceParts.length + lowStockCount;

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700" },
    confirmed: { label: "Confirmada", color: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30" },
    paid: { label: "Pagada", color: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" },
    cancelled: { label: "Cancelada", color: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30" },
  };

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* ── Header + Quick actions ── */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
        <header className="relative">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            {store.storeName}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {store.municipio && store.provincia
              ? `${store.municipio}, ${PROVINCIA_MAP.get(store.provincia)?.name ?? store.provincia} · `
              : ""}
            Resumen de operaciones
          </p>
        </header>
        <div className="relative flex flex-wrap gap-2">
          <Link
            href="/dashboard/ventas/nueva"
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 sm:text-sm [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva venta
          </Link>
          <Link
            href="/dashboard/inventario/nuevo"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:border-orange-500/50 hover:text-orange-400 sm:text-sm [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar pieza
          </Link>
        </div>
      </div>

      {/* ── Onboarding checklist ── */}
      {!allOnboardingDone && (
        <div className="rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-900 p-4 shadow-md sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white sm:text-lg [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                Configura tu tienda
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Completa estos pasos para empezar a recibir consultas de clientes.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300 ring-1 ring-orange-500/30">
              {completedSteps}/{onboardingSteps.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
              style={{ width: `${(completedSteps / onboardingSteps.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {onboardingSteps.map((step) => (
              <div
                key={step.key}
                className={`flex gap-3 rounded-md px-3 py-2.5 transition-colors ${
                  step.done
                    ? "items-center bg-zinc-900/50"
                    : "flex-col bg-zinc-900 ring-1 ring-zinc-800 sm:flex-row sm:items-center"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                  }`}>
                    {step.done ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-[10px] font-bold">{onboardingSteps.indexOf(step) + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${step.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-zinc-500">{step.description}</p>
                    )}
                  </div>
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="self-start rounded-md bg-orange-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-orange-500 sm:shrink-0 sm:self-center [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          title="Ventas hoy"
          value={`$${salesToday.toLocaleString("es-CU")}`}
          icon={<IconCurrency />}
          color="emerald"
        />
        <MetricCard
          title="Órdenes hoy"
          value={String(ordersToday)}
          icon={<IconBag />}
          color="indigo"
        />
        <MetricCard
          title="Valor inventario"
          value={`$${Math.round(inventoryValue).toLocaleString("es-CU")}`}
          subtitle={`${totalUnits.toLocaleString("es-CU")} ud.`}
          icon={<IconBox />}
          color="amber"
        />
        <MetricCard
          title="Alertas"
          value={String(alertsCount)}
          subtitle={alertsCount > 0 ? `${outOfStockParts.length} agot. · ${lowStockCount} bajo` : "Todo en orden"}
          icon={<IconAlert />}
          color={alertsCount > 0 ? "red" : "slate"}
        />
      </div>

      {/* ── Sales last 7 days + Monthly performance ── */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* 7 day chart */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          <h2 className="relative text-xs font-bold uppercase tracking-[0.2em] text-orange-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Ventas últimos 7 días
          </h2>
          <div className="mt-4 flex items-end gap-1.5 sm:gap-2" style={{ height: "120px" }}>
            {salesByDay.map((day) => {
              const pct = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
              return (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="hidden text-[10px] font-semibold tabular-nums text-muted sm:block">
                    {day.total > 0
                      ? day.total >= 1000
                        ? `$${(day.total / 1000).toFixed(0)}k`
                        : `$${day.total}`
                      : ""}
                  </span>
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${day.label === "Hoy" ? "bg-gradient-to-t from-indigo-400 to-indigo-300" : "bg-gradient-to-t from-indigo-200 to-indigo-100"}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${day.label === "Hoy" ? "text-indigo-600 font-bold" : "text-muted"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-right text-xs text-muted">
            Total 7d: <span className="font-semibold text-foreground">
              ${salesByDay.reduce((s, d) => s + d.total, 0).toLocaleString("es-CU")}
            </span>
          </p>
        </div>

        {/* Monthly performance */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <h2 className="relative text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Rendimiento de {currentMonthName}
          </h2>
          <div className="relative mt-4 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-0 rounded-md bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 sm:text-xs">Ingresos</p>
              <p className="mt-1 truncate text-base font-bold tabular-nums text-emerald-300 sm:text-2xl">
                ${salesMonth.toLocaleString("es-CU")}
              </p>
              {monthChange !== null && (
                <p className={`mt-0.5 text-[10px] font-medium sm:text-xs ${monthChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {monthChange >= 0 ? "▲ +" : "▼ "}{monthChange}% vs ant.
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-md bg-orange-500/10 p-2.5 ring-1 ring-orange-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-400 sm:text-xs">Órdenes</p>
              <p className="mt-1 text-base font-bold tabular-nums text-orange-300 sm:text-2xl">
                {ordersMonth}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-amber-500/10 p-2.5 ring-1 ring-amber-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400 sm:text-xs">Ticket prom.</p>
              <p className="mt-1 truncate text-base font-bold tabular-nums text-amber-300 sm:text-2xl">
                ${ticketPromedio.toLocaleString("es-CU")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visibility stats ── */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Views chart last 7 days */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          <div className="relative flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Visitas últimos 7 días
            </h2>
          </div>
          <div className="mt-4 flex items-end gap-1.5 sm:gap-2" style={{ height: "100px" }}>
            {viewsByDay.map((day) => {
              const pct = maxDayViews > 0 ? (day.count / maxDayViews) * 100 : 0;
              return (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="hidden text-[10px] font-semibold tabular-nums text-muted sm:block">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${day.label === "Hoy" ? "bg-gradient-to-t from-purple-400 to-purple-300" : "bg-gradient-to-t from-purple-200 to-purple-100"}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${day.label === "Hoy" ? "text-purple-600 font-bold" : "text-muted"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-right text-xs text-muted">
            Total 7d: <span className="font-semibold text-foreground">
              {viewsByDay.reduce((s, d) => s + d.count, 0)} visitas
            </span>
          </p>
        </div>

        {/* Visibility summary */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          <h2 className="relative text-xs font-bold uppercase tracking-[0.2em] text-purple-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            Visibilidad de {currentMonthName}
          </h2>
          <div className="relative mt-4 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-0 rounded-md bg-purple-500/10 p-2.5 ring-1 ring-purple-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 sm:text-xs">Total visitas</p>
              <p className="mt-1 text-base font-bold tabular-nums text-purple-300 sm:text-2xl">
                {viewsThisMonth}
              </p>
              {viewsChange !== null && (
                <p className={`mt-0.5 text-[10px] font-medium sm:text-xs ${viewsChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {viewsChange >= 0 ? "▲ +" : "▼ "}{viewsChange}% vs ant.
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-md bg-orange-500/10 p-2.5 ring-1 ring-orange-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-400 sm:text-xs">Tienda</p>
              <p className="mt-1 text-base font-bold tabular-nums text-orange-300 sm:text-2xl">
                {storeViewsThisMonth}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-amber-500/10 p-2.5 ring-1 ring-amber-500/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400 sm:text-xs">Piezas</p>
              <p className="mt-1 text-base font-bold tabular-nums text-amber-300 sm:text-2xl">
                {partViewsThisMonth}
              </p>
            </div>
          </div>
          {viewsThisMonth === 0 && (
            <p className="mt-4 text-center text-xs text-zinc-500">
              Las visitas aparecerán cuando clientes vean tu tienda o piezas en el buscador público.
            </p>
          )}
        </div>
      </div>

      {/* ── Recent orders + Inventory by make ── */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Últimas ventas
            </h2>
            <Link href="/dashboard/ventas" className="text-xs font-medium text-accent hover:text-accent-dark">
              Ver todas
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="mt-3 divide-y divide-zinc-800">
              {recentOrders.map((order) => {
                const s = statusLabels[order.status] ?? statusLabels.draft;
                const date = new Date(order.created_at);
                const timeStr = date.toLocaleString("es-CU", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={order.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">#{order.order_number}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {order.customer_name ?? "Sin cliente"} · {timeStr}
                      </p>
                    </div>
                    <p className="ml-3 shrink-0 text-sm font-semibold tabular-nums">
                      ${Number(order.total).toLocaleString("es-CU")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-muted">
              Aún no hay ventas registradas.
            </p>
          )}
        </div>

        {/* Inventory by vehicle make */}
        {topMakes.length > 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Inventario por marca de vehículo
            </h2>
            <div className="mt-3 space-y-2.5">
              {topMakes.map(([make, data], i) => {
                const pct = (data.value / maxMakeValue) * 100;
                const barGradients = [
                  "bg-gradient-to-r from-indigo-500 to-purple-500",
                  "bg-gradient-to-r from-emerald-500 to-teal-500",
                  "bg-gradient-to-r from-amber-500 to-orange-500",
                  "bg-gradient-to-r from-rose-500 to-pink-500",
                  "bg-gradient-to-r from-sky-500 to-cyan-500",
                  "bg-gradient-to-r from-fuchsia-500 to-purple-500",
                ];
                const dotColors = [
                  "bg-indigo-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-sky-500",
                  "bg-fuchsia-500",
                ];
                return (
                  <div key={make}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`h-2 w-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                        {make}
                      </span>
                      <span className="text-muted">
                        {data.units} ud. · ${Math.round(data.value).toLocaleString("es-CU")}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${barGradients[i % barGradients.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <p className="text-sm text-zinc-500">
              La distribución de inventario aparecerá cuando agregues piezas.
            </p>
          </div>
        )}
      </div>

      {/* ── Top rankings ── */}
      {hasTopData && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          <RankingCard title="Marcas con más ingresos" items={topBrands.map(([name, data]) => ({
            label: name,
            value: `$${data.revenue.toLocaleString("es-CU")}`,
            sub: `${data.qty} ud.`,
          }))} />
          <RankingCard title="Modelos con más ingresos" items={topModels.map(([name, data]) => ({
            label: name,
            value: `$${data.revenue.toLocaleString("es-CU")}`,
            sub: `${data.qty} ud.`,
          }))} />
          <RankingCard title="Piezas más vendidas" items={topParts.map(([, data]) => ({
            label: data.name,
            value: `$${data.revenue.toLocaleString("es-CU")}`,
            sub: `${data.qty} ud.`,
          }))} />
        </div>
      )}

      {!hasTopData && (
        <div className="rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center sm:p-8">
          <p className="text-sm font-medium text-zinc-500">
            Los rankings de marcas, modelos y piezas aparecerán cuando registres tus primeras ventas del mes.
          </p>
        </div>
      )}

      {/* ── Alerts section: out of stock + no price ── */}
      {(outOfStockParts.length > 0 || noPriceParts.length > 0) && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {/* Out of stock */}
          {outOfStockParts.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 shadow-md sm:p-5">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  Piezas agotadas ({outOfStockParts.length})
                </h2>
              </div>
              <div className="mt-3 divide-y divide-red-500/20">
                {outOfStockParts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-red-200">{part.name}</p>
                      <p className="text-xs text-red-300/70">
                        {part.brand} · {part.vehicle_make} {part.vehicle_model}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/inventario/${part.id}/editar`}
                      className="ml-2 shrink-0 rounded-md bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/30"
                    >
                      Reponer
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No price */}
          {noPriceParts.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 shadow-md sm:p-5">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
                  Sin precio ({noPriceParts.length})
                </h2>
              </div>
              <p className="mt-1 text-xs text-amber-300/80">
                Estas piezas aparecen como &quot;Consultar precio&quot; en el buscador.
              </p>
              <div className="mt-3 divide-y divide-amber-500/20">
                {noPriceParts.map((part) => (
                  <div key={part.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-amber-200">{part.name}</p>
                      <p className="text-xs text-amber-300/70">{part.brand}</p>
                    </div>
                    <Link
                      href={`/dashboard/inventario/${part.id}/editar`}
                      className="ml-2 shrink-0 rounded-md bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/30"
                    >
                      Asignar precio
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Slow movers ── */}
      {storeAgeMonths >= 3 && slowMovers.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
              Piezas de lento movimiento
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            Piezas con stock disponible que no se han vendido en los últimos 90 días.
          </p>
          <div className="mt-3 divide-y divide-zinc-800">
            {slowMovers.map((part) => (
              <div key={part.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{part.name}</p>
                  <p className="text-xs text-muted">
                    {part.brand} · {part.vehicle_make} {part.vehicle_model}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-300 ring-1 ring-amber-500/30">
                  {part.quantity_on_hand} en stock
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {storeAgeMonths < 3 && (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-center sm:p-6">
          <p className="text-xs text-zinc-500">
            El análisis de piezas de lento movimiento estará disponible cuando tu tienda tenga al menos 3 meses de actividad.
          </p>
        </div>
      )}
    </section>
  );
}

// ── Icon components ──

function IconCurrency() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

// ── Card components ──

const colorMap: Record<string, { bg: string; border: string; iconBg: string; iconText: string; titleText: string; valueText: string; subtitleText: string }> = {
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500/15 to-emerald-700/5",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-300",
    titleText: "text-emerald-300/80",
    valueText: "text-emerald-300",
    subtitleText: "text-emerald-300/70",
  },
  indigo: {
    bg: "bg-gradient-to-br from-orange-500/15 to-orange-700/5",
    border: "border-orange-500/30",
    iconBg: "bg-orange-500/20",
    iconText: "text-orange-300",
    titleText: "text-orange-300/80",
    valueText: "text-orange-300",
    subtitleText: "text-orange-300/70",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500/15 to-orange-700/5",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconText: "text-amber-300",
    titleText: "text-amber-300/80",
    valueText: "text-amber-300",
    subtitleText: "text-amber-300/70",
  },
  red: {
    bg: "bg-gradient-to-br from-rose-500/15 to-pink-700/5",
    border: "border-rose-500/30",
    iconBg: "bg-rose-500/20",
    iconText: "text-rose-300",
    titleText: "text-rose-300/80",
    valueText: "text-rose-300",
    subtitleText: "text-rose-300/70",
  },
  slate: {
    bg: "bg-zinc-900/60",
    border: "border-zinc-800",
    iconBg: "bg-zinc-800",
    iconText: "text-zinc-400",
    titleText: "text-zinc-400",
    valueText: "text-zinc-200",
    subtitleText: "text-zinc-500",
  },
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const c = colorMap[color] ?? colorMap.slate;
  return (
    <article className={`min-w-0 rounded-2xl border ${c.border} ${c.bg} p-3.5 shadow-sm sm:p-5`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${c.titleText}`}>
          {title}
        </h2>
        <div className={`shrink-0 rounded-lg ${c.iconBg} ${c.iconText} p-1.5 sm:rounded-xl sm:p-2`}>{icon}</div>
      </div>
      <p className={`mt-2 truncate text-lg font-bold tabular-nums sm:mt-3 sm:text-3xl ${c.valueText}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`mt-0.5 truncate text-[10px] sm:text-xs ${c.subtitleText}`}>{subtitle}</p>
      )}
    </article>
  );
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; sub: string }>;
}) {
  const medalStyles = [
    "bg-gradient-to-br from-yellow-300 to-amber-500 text-zinc-900 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/50",
    "bg-gradient-to-br from-zinc-300 to-zinc-500 text-zinc-900 shadow-md shadow-zinc-400/30 ring-2 ring-zinc-300/50",
    "bg-gradient-to-br from-orange-400 to-amber-700 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-400/50",
  ];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:p-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">{title}</h3>
      <div className="mt-3 divide-y divide-zinc-800">
        {items.map((item, i) => {
          const medal = medalStyles[i] ?? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30";
          return (
            <div key={item.label} className="flex items-center gap-3 py-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${medal}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{item.label}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-zinc-200">{item.value}</p>
                <p className="text-[10px] text-zinc-500">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
