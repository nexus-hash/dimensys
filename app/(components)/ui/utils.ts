/**
 * Tiny class-name joiner (no `clsx`/`tailwind-merge`: DS3 keeps new deps to
 * Radix + testing libs). Falsy values are dropped; later classes are not
 * deduped against earlier ones, so callers should avoid passing conflicting
 * utilities for the same property.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
