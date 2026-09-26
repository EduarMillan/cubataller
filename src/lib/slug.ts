import type { SupabaseClient } from "@supabase/supabase-js";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 60;

/**
 * Converts an arbitrary string into a URL-safe slug:
 *   "Repuestos González & Hijos" → "repuestos-gonzalez-hijos"
 *
 * Strips diacritics (á → a, ñ → n via NFD decomposition), lowercases,
 * collapses any run of non-alphanumeric characters into a single hyphen
 * and trims leading/trailing hyphens. Truncates to MAX_SLUG_LENGTH.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_REGEX.test(slug);
}

/**
 * Generates a slug for `table` derived from `name` that is guaranteed to be
 * unique across it. Picks `base` if free, otherwise tries `base-2`, `base-3`,
 * ... If an existing row is being edited, pass its id via `excludeId` so the
 * lookup ignores that row's own slug.
 */
async function generateUniqueSlug(
  admin: SupabaseClient,
  table: string,
  name: string,
  fallbackPrefix: string,
  excludeId?: string,
): Promise<string> {
  const base =
    slugify(name) || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`;

  let query = admin
    .from(table)
    .select("id, slug")
    .or(`slug.eq.${base},slug.like.${base}-%`);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const taken = new Set((data ?? []).map((row) => row.slug as string));

  if (!taken.has(base)) return base;

  for (let n = 2; n < 10000; n++) {
    const suffix = `-${n}`;
    const trimmed = base.length + suffix.length > MAX_SLUG_LENGTH
      ? base.slice(0, MAX_SLUG_LENGTH - suffix.length)
      : base;
    const candidate = `${trimmed}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

/** Unique slug for `stores`, derived from the store name. */
export function generateUniqueStoreSlug(
  admin: SupabaseClient,
  name: string,
  excludeStoreId?: string,
): Promise<string> {
  return generateUniqueSlug(admin, "stores", name, "tienda", excludeStoreId);
}

/** Unique slug for `service_providers`, derived from the service name. */
export function generateUniqueServiceSlug(
  admin: SupabaseClient,
  name: string,
  excludeServiceId?: string,
): Promise<string> {
  return generateUniqueSlug(admin, "service_providers", name, "servicio", excludeServiceId);
}
