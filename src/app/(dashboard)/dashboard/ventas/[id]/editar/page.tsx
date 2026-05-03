import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";
import { updateOrder, searchParts } from "../../_actions";
import { OrderForm } from "../../_components";
import type { InitialOrderData } from "../../_components";

export default async function EditarVentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { id: orderId } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();

  // Fetch order
  const { data: order } = await supabase
    .from("sales_orders")
    .select("id, order_number, status, customer_name, customer_phone")
    .eq("id", orderId)
    .eq("store_id", store.storeId)
    .single();

  if (!order || (order.status !== "confirmed" && order.status !== "draft")) {
    redirect("/dashboard/ventas");
  }

  // Fetch order items with part info
  const { data: items } = await supabase
    .from("sales_order_items")
    .select("part_id, quantity, unit_price, parts(id, sku, name, brand, vehicle_make, vehicle_model, price, quantity_on_hand)")
    .eq("sales_order_id", orderId)
    .eq("store_id", store.storeId);

  const initialData: InitialOrderData = {
    orderId: order.id,
    customerName: order.customer_name ?? "",
    customerPhone: order.customer_phone ?? "",
    items: (items ?? []).map((item) => {
      const part = item.parts as unknown as {
        id: string;
        sku: string;
        name: string;
        brand: string;
        vehicle_make: string;
        vehicle_model: string;
        price: number | null;
        quantity_on_hand: number;
      };
      return {
        partId: item.part_id,
        sku: part.sku,
        name: part.name,
        brand: part.brand,
        vehicleMake: part.vehicle_make,
        vehicleModel: part.vehicle_model,
        price: part.price,
        quantityOnHand: part.quantity_on_hand,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      };
    }),
  };

  async function handleSearch(query: string) {
    "use server";
    return searchParts(query, store!.storeId);
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard/ventas"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar venta</h1>
          <p className="text-xs text-muted font-mono">{order.order_number}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <OrderForm
        searchAction={handleSearch}
        createAction={updateOrder}
        initialData={initialData}
      />
    </section>
  );
}
