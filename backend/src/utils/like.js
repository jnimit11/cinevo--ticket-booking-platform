/**
 * Escapes characters that have special wildcard meaning in PostgreSQL LIKE / ILIKE patterns.
 * Specifically, '%' (matches any sequence of characters), '_' (matches any single character),
 * and '\' (the default PostgreSQL escape character).
 *
 * Backslashes are escaped first to prevent double-escaping subsequent escape prefixes.
 *
 * @param {string} input - The raw search string
 * @returns {string} - The escaped string safe for literal matching in a LIKE/ILIKE pattern
 */
export function escapeLikePattern(input) {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
