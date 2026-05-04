/**
 * Normaliza un número de WhatsApp a un formato canónico de solo dígitos.
 *
 * Reglas (orientadas al mercado cubano):
 * - Quita espacios, signos +, guiones, paréntesis y cualquier no-dígito.
 * - Quita prefijo internacional "00" si está presente.
 * - Si quedan 8 dígitos, antepone "53" (móvil cubano sin código de país).
 * - Devuelve null si la entrada queda vacía.
 *
 * Ejemplos:
 *   "5351234567"        -> "5351234567"
 *   "+53 5 123 4567"    -> "5351234567"
 *   "0053-5-1234567"    -> "5351234567"
 *   "51234567"          -> "5351234567"
 *   ""                  -> null
 */
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) return `53${digits}`;
  return digits;
}
