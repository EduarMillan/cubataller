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
 * Generates a slug for `stores` derived from `name` that is guaranteed to be
 * unique across the table. Picks `base` if free, otherwise tries
 * `base-2`, `base-3`, ... If the user is editing an existing row, pass its id
 * via `excludeStoreId` so the lookup ignores their own row.
 */
export async function generateUniqueStoreSlug(
  admin: SupabaseClient,
  name: string,
  excludeStoreId?: string,
): Promise<string> {
  const base = slugify(name) || `tienda-${Math.random().toString(36).slice(2, 8)}`;

  let query = admin
    .from("stores")
    .select("id, slug")
    .or(`slug.eq.${base},slug.like.${base}-%`);
  if (excludeStoreId) query = query.neq("id", excludeStoreId);

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
