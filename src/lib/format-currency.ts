/**
 * Formateo de moneda para Cuba. Soporta CUP (peso cubano) y USD.
 * Cuando un valor de moneda no esté disponible, asume CUP.
 */

const LOCALE = "es-CU";

export function formatCurrency(amount: number, currency: string = "CUP"): string {
  return amount.toLocaleString(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });
}

export function formatNumber(amount: number): string {
  return amount.toLocaleString(LOCALE);
}

export function formatCUP(amount: number): string {
  return formatCurrency(amount, "CUP");
}
