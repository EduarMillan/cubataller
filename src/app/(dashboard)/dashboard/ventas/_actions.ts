"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/queries/store";

interface OrderItem {
  partId: string;
  quantity: number;
  unitPrice: number;
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `V${date}-${rand}`;
}

export async function createOrder(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const customerName = (formData.get("customer_name") as string)?.trim() || null;
  const customerPhone = (formData.get("customer_phone") as string)?.trim() || null;

  // Parse items from form
  const itemCount = parseInt(formData.get("item_count") as string, 10) || 0;
  const items: OrderItem[] = [];
  for (let i = 0; i < itemCount; i++) {
    const partId = formData.get(`item_${i}_part_id`) as string;
    const quantity = parseInt(formData.get(`item_${i}_quantity`) as string, 10);
    const unitPrice = parseFloat(formData.get(`item_${i}_unit_price`) as string);
    if (partId && quantity > 0 && unitPrice >= 0) {
      items.push({ partId, quantity, unitPrice });
    }
  }

  if (items.length === 0) {
    redirect("/dashboard/ventas/nueva?error=Debes agregar al menos una pieza");
  }

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const orderNumber = generateOrderNumber();

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .insert({
      store_id: store.storeId,
      order_number: orderNumber,
      status: "confirmed",
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal,
      total: subtotal,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orderError) {
    redirect(`/dashboard/ventas/nueva?error=${encodeURIComponent(orderError.message)}`);
  }

  // Insert items
  const orderItems = items.map((it) => ({
    sales_order_id: order.id,
    store_id: store.storeId,
    part_id: it.partId,
    quantity: it.quantity,
    unit_price: it.unitPrice,
  }));

  const { error: itemsError } = await supabase
    .from("sales_order_items")
    .insert(orderItems);

  if (itemsError) {
    // Rollback order
    await supabase.from("sales_orders").delete().eq("id", order.id);
    redirect(`/dashboard/ventas/nueva?error=${encodeURIComponent(itemsError.message)}`);
  }

  // Discount stock and create inventory movements
  for (const it of items) {
    await supabase
      .from("parts")
      .update({ quantity_on_hand: undefined })
      .eq("id", it.partId); // We'll use RPC or direct update below

    // Decrease stock
    const { data: part } = await supabase
      .from("parts")
      .select("quantity_on_hand")
      .eq("id", it.partId)
      .single();

    if (part) {
      const newQty = Math.max(0, part.quantity_on_hand - it.quantity);
      await supabase
        .from("parts")
        .update({ quantity_on_hand: newQty })
        .eq("id", it.partId)
        .eq("store_id", store.storeId);
    }

    // Record movement
    await supabase.from("inventory_movements").insert({
      store_id: store.storeId,
      part_id: it.partId,
      movement_type: "sale",
      quantity: it.quantity,
      reason: `Venta ${orderNumber}`,
      created_by: user.id,
    });
  }

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
  redirect("/dashboard/ventas");
}

export async function updateOrder(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = formData.get("order_id") as string;
  const customerName = (formData.get("customer_name") as string)?.trim() || null;
  const customerPhone = (formData.get("customer_phone") as string)?.trim() || null;

  // Verify the order belongs to this store and is editable
  const { data: order } = await supabase
    .from("sales_orders")
    .select("id, order_number, status")
    .eq("id", orderId)
    .eq("store_id", store.storeId)
    .single();

  if (!order || (order.status !== "confirmed" && order.status !== "draft")) {
    redirect("/dashboard/ventas?error=Esta venta no se puede editar");
  }

  // Parse new items
  const itemCount = parseInt(formData.get("item_count") as string, 10) || 0;
  const newItems: OrderItem[] = [];
  for (let i = 0; i < itemCount; i++) {
    const partId = formData.get(`item_${i}_part_id`) as string;
    const quantity = parseInt(formData.get(`item_${i}_quantity`) as string, 10);
    const unitPrice = parseFloat(formData.get(`item_${i}_unit_price`) as string);
    if (partId && quantity > 0 && unitPrice >= 0) {
      newItems.push({ partId, quantity, unitPrice });
    }
  }

  if (newItems.length === 0) {
    redirect(`/dashboard/ventas/${orderId}/editar?error=Debes agregar al menos una pieza`);
  }

  // Get old items to calculate inventory diff
  const { data: oldItems } = await supabase
    .from("sales_order_items")
    .select("part_id, quantity")
    .eq("sales_order_id", orderId)
    .eq("store_id", store.storeId);

  const oldQtyMap = new Map<string, number>();
  for (const item of oldItems ?? []) {
    oldQtyMap.set(item.part_id, (oldQtyMap.get(item.part_id) ?? 0) + item.quantity);
  }

  const newQtyMap = new Map<string, number>();
  for (const item of newItems) {
    newQtyMap.set(item.partId, (newQtyMap.get(item.partId) ?? 0) + item.quantity);
  }

  // Calculate diffs: positive = need to deduct more stock, negative = need to return stock
  const allPartIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);

  // Delete old items
  await supabase
    .from("sales_order_items")
    .delete()
    .eq("sales_order_id", orderId)
    .eq("store_id", store.storeId);

  // Insert new items
  const orderItems = newItems.map((it) => ({
    sales_order_id: orderId,
    store_id: store.storeId,
    part_id: it.partId,
    quantity: it.quantity,
    unit_price: it.unitPrice,
  }));

  const { error: itemsError } = await supabase
    .from("sales_order_items")
    .insert(orderItems);

  if (itemsError) {
    redirect(`/dashboard/ventas/${orderId}/editar?error=${encodeURIComponent(itemsError.message)}`);
  }

  // Update order totals and customer info
  const subtotal = newItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  await supabase
    .from("sales_orders")
    .update({
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal,
      total: subtotal,
    })
    .eq("id", orderId)
    .eq("store_id", store.storeId);

  // Reconcile inventory for each affected part
  for (const partId of allPartIds) {
    const oldQty = oldQtyMap.get(partId) ?? 0;
    const newQty = newQtyMap.get(partId) ?? 0;
    const diff = newQty - oldQty; // positive = sell more, negative = return

    if (diff === 0) continue;

    const { data: part } = await supabase
      .from("parts")
      .select("quantity_on_hand")
      .eq("id", partId)
      .single();

    if (part) {
      const updatedQty = Math.max(0, part.quantity_on_hand - diff);
      await supabase
        .from("parts")
        .update({ quantity_on_hand: updatedQty })
        .eq("id", partId)
        .eq("store_id", store.storeId);
    }

    await supabase.from("inventory_movements").insert({
      store_id: store.storeId,
      part_id: partId,
      movement_type: diff > 0 ? "sale" : "return",
      quantity: Math.abs(diff),
      reason: `Edición venta ${order.order_number}`,
      created_by: user.id,
    });
  }

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
  redirect("/dashboard/ventas");
}

export async function cancelOrder(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = formData.get("orderId") as string;

  // Get order items to restore stock
  const { data: items } = await supabase
    .from("sales_order_items")
    .select("part_id, quantity")
    .eq("sales_order_id", orderId)
    .eq("store_id", store.storeId);

  // Update order status
  const { error } = await supabase
    .from("sales_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("store_id", store.storeId)
    .in("status", ["draft", "confirmed"]);

  if (error) {
    redirect(`/dashboard/ventas?error=${encodeURIComponent(error.message)}`);
  }

  // Restore stock
  if (items) {
    for (const item of items) {
      const { data: part } = await supabase
        .from("parts")
        .select("quantity_on_hand")
        .eq("id", item.part_id)
        .single();

      if (part) {
        await supabase
          .from("parts")
          .update({ quantity_on_hand: part.quantity_on_hand + item.quantity })
          .eq("id", item.part_id)
          .eq("store_id", store.storeId);
      }

      await supabase.from("inventory_movements").insert({
        store_id: store.storeId,
        part_id: item.part_id,
        movement_type: "return",
        quantity: item.quantity,
        reason: `Anulación de venta`,
        created_by: user.id,
      });
    }
  }

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
  redirect("/dashboard/ventas");
}

export async function markOrderPaid(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const orderId = formData.get("orderId") as string;

  await supabase
    .from("sales_orders")
    .update({ status: "paid" })
    .eq("id", orderId)
    .eq("store_id", store.storeId)
    .eq("status", "confirmed");

  revalidatePath("/dashboard/ventas");
  redirect("/dashboard/ventas");
}

export async function searchParts(query: string, storeId: string) {
  const supabase = await createSupabaseServerClient();
  const term = `%${query.trim()}%`;

  const { data } = await supabase
    .from("parts")
    .select("id, sku, name, brand, vehicle_make, vehicle_model, price, quantity_on_hand")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .gt("quantity_on_hand", 0)
    .or(`name.ilike.${term},sku.ilike.${term},brand.ilike.${term}`)
    .order("name")
    .limit(10);

  return data ?? [];
}
