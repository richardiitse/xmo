/**
 * Sanitize a keyword for safe use in grep.
 * Escapes all regex special characters to prevent grep injection.
 */
export function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
