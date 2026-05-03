"use client";

import { useState } from "react";
import { uploadReceipt } from "./_actions";

export function ReceiptUploadForm({
  subscriptionId,
  expectedAmount,
}: {
  subscriptionId: string;
  expectedAmount: number;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={uploadReceipt} className="space-y-3">
      <input type="hidden" name="subscription_id" value={subscriptionId} />

      <div>
        <label htmlFor="amount" className="text-xs font-medium text-zinc-300">
          Monto transferido (CUP)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          min={1}
          defaultValue={expectedAmount}
          placeholder={`Ej: ${expectedAmount}`}
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        />
      </div>

      <div>
        <label
          htmlFor="receipt-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-5 text-center transition-colors hover:border-orange-500/50 hover:bg-orange-500/10"
        >
          <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-xs font-medium text-zinc-400">
            {fileName || "Subir comprobante (JPG, PNG, PDF — máx. 5 MB)"}
          </span>
        </label>
        <input
          id="receipt-file"
          type="file"
          name="receipt_file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f ? f.name : null);
          }}
        />
      </div>

      <div>
        <label htmlFor="bank-ref" className="text-xs font-medium text-zinc-300">
          N° de operación bancaria (opcional)
        </label>
        <input
          id="bank-ref"
          name="bank_reference"
          type="text"
          placeholder="Ej: 123456789"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:bg-orange-500 active:scale-[0.98] [font-family:var(--font-space-grotesk),system-ui,sans-serif]"
      >
        Enviar comprobante
      </button>
    </form>
  );
}
