/**
 * Formats a number with commas or human-readable short notation
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
