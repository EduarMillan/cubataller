const MAX_TERMS = 6;

/**
 * Normalizes a string the same way the `search_text` column does in SQL:
 * lowercase and without diacritics. NFD decomposition plus stripping the
 * combining marks matches what unaccent() does, including ñ → n.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Splits a search box query into the words that must all appear. Punctuation
 * is dropped, which also removes the LIKE wildcards `%` and `_`, so a term is
 * always a literal. Single letters are ignored: they match almost everything.
 */
export function toSearchTerms(query: string): string[] {
  return normalizeForSearch(query)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1)
    .slice(0, MAX_TERMS);
}
