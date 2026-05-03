"use client";

import { useState, useRef, useEffect } from "react";

interface Part {
  id: string;
  sku: string;
  name: string;
  brand: string;
  vehicle_make: string;
  vehicle_model: string;
  price: number | null;
  quantity_on_hand: number;
}

interface OrderLine {
  part: Part;
  quantity: number;
  unitPrice: number;
}

export interface InitialOrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: {
    partId: string;
    sku: string;
    name: string;
    brand: string;
    vehicleMake: string;
    vehicleModel: string;
    price: number | null;
    quantityOnHand: number;
    quantity: number;
    unitPrice: number;
  }[];
}

export function OrderForm({
  searchAction,
  createAction,
  initialData,
}: {
  searchAction: (query: string) => Promise<Part[]>;
  createAction: (formData: FormData) => void;
  initialData?: InitialOrderData;
}) {
  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (!initialData) return [];
    return initialData.items.map((item) => ({
      part: {
        id: item.partId,
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        vehicle_make: item.vehicleMake,
        vehicle_model: item.vehicleModel,
        price: item.price,
        quantity_on_hand: item.quantityOnHand + item.quantity, // available = current stock + what's already committed
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(value: string) {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const data = await searchAction(value);
      // Filter out already-added parts
      const addedIds = new Set(lines.map((l) => l.part.id));
      setResults(data.filter((p) => !addedIds.has(p.id)));
      setShowResults(true);
      setSearching(false);
    }, 300);
  }

  function addPart(part: Part) {
    setLines((prev) => [
      ...prev,
      { part, quantity: 1, unitPrice: part.price ?? 0 },
    ]);
    setSearchQuery("");
    setResults([]);
    setShowResults(false);
  }

  function updateQuantity(index: number, qty: number) {
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? { ...l, quantity: Math.min(Math.max(1, qty), l.part.quantity_on_hand) }
          : l,
      ),
    );
  }

  function updatePrice(index: number, price: number) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, unitPrice: Math.max(0, price) } : l)),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={createAction} className="space-y-6">
      {initialData && (
        <input type="hidden" name="order_id" value={initialData.orderId} />
      )}
      {/* Customer info */}
      <fieldset className="space-y-4 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-900 p-4 shadow-md sm:p-6">
        <legend className="rounded-md bg-orange-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-orange-300 ring-1 ring-orange-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
          Cliente (opcional)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="customer_name" className="text-sm font-medium">Nombre</label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              defaultValue={initialData?.customerName ?? ""}
              placeholder="Nombre del cliente"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="customer_phone" className="text-sm font-medium">Teléfono</label>
            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              defaultValue={initialData?.customerPhone ?? ""}
              placeholder="+56 9 1234 5678"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
        </div>
      </fieldset>

      {/* Part search + items */}
      <fieldset className="space-y-4 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-zinc-900 p-4 shadow-md sm:p-6">
        <legend className="rounded-md bg-emerald-500/15 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30 [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
          Piezas de la venta
        </legend>

        {/* Search */}
        <div ref={wrapperRef} className="relative">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Buscar pieza por nombre, SKU o marca..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Buscando...</span>
            )}
          </div>

          {showResults && results.length > 0 && (
            <ul className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-950 shadow-2xl">
              {results.map((part) => (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => addPart(part)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:bg-orange-500/15 active:bg-orange-500/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{part.name}</p>
                      <p className="text-xs text-muted">
                        {part.sku} · {part.vehicle_make} {part.vehicle_model} · Stock: {part.quantity_on_hand}
                      </p>
                    </div>
                    {part.price != null && (
                      <span className="shrink-0 font-semibold text-orange-400">
                        ${Number(part.price).toLocaleString("es-CU")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showResults && results.length === 0 && searchQuery.trim().length >= 2 && !searching && (
            <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-400 shadow-2xl">
              No se encontraron piezas con stock
            </div>
          )}
        </div>

        {/* Lines */}
        {lines.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
            Busca y agrega piezas para crear la venta
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={line.part.id}
                className="flex flex-col gap-3 rounded-md border border-zinc-700 bg-zinc-900/60 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{line.part.name}</p>
                  <p className="text-xs text-muted">
                    {line.part.sku} · {line.part.vehicle_make} {line.part.vehicle_model}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-muted uppercase">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      max={line.part.quantity_on_hand}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(i, parseInt(e.target.value, 10) || 1)}
                      className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center text-sm text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-medium text-muted uppercase">Precio</label>
                    <input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => updatePrice(i, parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[10px] font-medium text-muted uppercase">Subtotal</p>
                    <p className="text-sm font-semibold tabular-nums text-orange-400">
                      ${(line.quantity * line.unitPrice).toLocaleString("es-CU")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="ml-1 self-end rounded-md p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
                    aria-label="Eliminar"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>

                {/* Hidden fields */}
                <input type="hidden" name={`item_${i}_part_id`} value={line.part.id} />
                <input type="hidden" name={`item_${i}_quantity`} value={line.quantity} />
                <input type="hidden" name={`item_${i}_unit_price`} value={line.unitPrice} />
              </div>
            ))}
          </div>
        )}
        <input type="hidden" name="item_count" value={lines.length} />
      </fieldset>

      {/* Total + submit */}
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm text-zinc-400">Total de la venta</p>
          <p className="text-2xl font-bold tabular-nums text-orange-400 sm:text-3xl [font-family:var(--font-space-grotesk),system-ui,sans-serif]">
            ${total.toLocaleString("es-CU")}
          </p>
        </div>
        <button
          type="submit"
          disabled={lines.length === 0}
          className="rounded-md bg-orange-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
        >
          {initialData ? "Guardar cambios" : "Confirmar venta"}
        </button>
      </div>
    </form>
  );
}
