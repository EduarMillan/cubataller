import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { cancelOrder, markOrderPaid } from "./_actions";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Borrador", bg: "bg-zinc-800 ring-1 ring-zinc-700", text: "text-zinc-300", dot: "bg-zinc-500" },
  confirmed: { label: "Confirmada", bg: "bg-blue-500/15 ring-1 ring-blue-500/30", text: "text-blue-300", dot: "bg-blue-400" },
  paid: { label: "Pagada", bg: "bg-emerald-500/15 ring-1 ring-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  cancelled: { label: "Anulada", bg: "bg-red-500/15 ring-1 ring-red-500/30", text: "text-red-300", dot: "bg-red-400" },
};

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { q, estado } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("sales_orders")
    .select("id, order_number, status, customer_name, customer_phone, total, created_at")
    .eq("store_id", store.storeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (estado && estado !== "todas") {
    query = query.eq("status", estado);
  }
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`order_number.ilike.${term},customer_name.ilike.${term}`);
  }

  const { data: orders } = await query;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ventas</h1>
          <p className="mt-1 text-sm text-muted">
            {orders?.length ?? 0} orden{orders?.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/ventas/nueva"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark active:bg-accent-dark sm:py-2.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva venta
        </Link>
      </header>

      {/* Filters */}
      <form className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Buscar por N° orden o cliente..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <select
          name="estado"
          defaultValue={estado ?? "todas"}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        >
          <option value="todas">Todas</option>
          <option value="confirmed">Confirmadas</option>
          <option value="paid">Pagadas</option>
          <option value="cancelled">Anuladas</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
        >
          Filtrar
        </button>
        {(q || (estado && estado !== "todas")) && (
          <a
            href="/dashboard/ventas"
            className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-400 hover:border-orange-500/50 hover:text-orange-400"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Results */}
      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center sm:p-12">
          {q || (estado && estado !== "todas") ? (
            <>
              <div className="rounded-md bg-zinc-800 p-4 text-zinc-500">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Sin resultados</h3>
              <p className="mt-1 text-sm text-muted">No se encontraron ventas con esos filtros.</p>
              <a href="/dashboard/ventas" className="mt-4 text-sm font-medium text-accent hover:text-accent-dark">
                Ver todas las ventas
              </a>
            </>
          ) : (
            <>
              <div className="rounded-md bg-amber-500/10 p-4 text-amber-400 ring-1 ring-amber-500/30">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold">Sin ventas aún</h3>
              <p className="mt-1 text-sm text-muted">
                Registra tu primera venta para comenzar a llevar el control.
              </p>
              <Link
                href="/dashboard/ventas/nueva"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark"
              >
                Nueva venta
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 lg:hidden">
            {orders.map((order) => {
              const sc = statusConfig[order.status] ?? statusConfig.draft;
              return (
                <article key={order.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-accent">{order.order_number}</p>
                      {order.customer_name && (
                        <p className="mt-0.5 text-sm">{order.customer_name}</p>
                      )}
                      <p className="text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString("es-CU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <p className="text-lg font-bold tabular-nums text-accent">
                      ${Number(order.total).toLocaleString("es-CU")}
                    </p>
                    <div className="flex items-center gap-1">
                      {(order.status === "confirmed" || order.status === "draft") && (
                        <Link
                          href={`/dashboard/ventas/${order.id}/editar`}
                          className="rounded-md px-3 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/10"
                        >
                          Editar
                        </Link>
                      )}
                      {order.status === "confirmed" && (
                        <form action={markOrderPaid}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <button type="submit" className="rounded-md px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10">
                            Pagada
                          </button>
                        </form>
                      )}
                      {(order.status === "confirmed" || order.status === "draft") && (
                        <form action={cancelOrder}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <button type="submit" className="rounded-md px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400">
                            Anular
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-md lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-orange-500/30 bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-orange-500/15">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">N° Orden</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Cliente</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Fecha</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Total</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-300 [font-family:var(--font-space-grotesk),system-ui,sans-serif]" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const sc = statusConfig[order.status] ?? statusConfig.draft;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-zinc-800 transition-colors odd:bg-zinc-950 even:bg-zinc-900/50 hover:!bg-orange-500/10"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-accent">
                        {order.order_number}
                      </td>
                      <td className="px-5 py-3.5">
                        {order.customer_name || <span className="text-muted">—</span>}
                        {order.customer_phone && (
                          <p className="text-xs text-muted">{order.customer_phone}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted">
                        {new Date(order.created_at).toLocaleDateString("es-CU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                        ${Number(order.total).toLocaleString("es-CU")}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {(order.status === "confirmed" || order.status === "draft") && (
                            <Link
                              href={`/dashboard/ventas/${order.id}/editar`}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:border-orange-500/50 hover:bg-orange-500/20 hover:text-orange-200"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                              Editar
                            </Link>
                          )}
                          {order.status === "confirmed" && (
                            <form action={markOrderPaid}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-200"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                Pagada
                              </button>
                            </form>
                          )}
                          {(order.status === "confirmed" || order.status === "draft") && (
                            <form action={cancelOrder}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-200"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                                Anular
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
