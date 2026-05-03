import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserStore } from "@/lib/queries/store";
import { createOrder, searchParts } from "../_actions";
import { OrderForm } from "../_components";

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await getUserStore();
  if (!store) redirect("/dashboard/crear-tienda");

  const { error } = await searchParams;

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
        <h1 className="text-2xl font-bold tracking-tight">Nueva venta</h1>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <OrderForm searchAction={handleSearch} createAction={createOrder} />
    </section>
  );
}
