/** Field-name casing helpers shared by every language-specific tokenizer/transformer
 * (Python dict keys and kwargs, Go map-literal keys and struct-tag JSON names, ...). Every
 * language here still exchanges JSON-shaped data, so the same snake_case/camelCase variants
 * apply regardless of which language's syntax is wrapped around them. */

export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

export function toCamelCase(name: string): string {
  return name.replace(/_([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

export function fieldVariants(name: string): string[] {
  return [...new Set([name, toSnakeCase(name), toCamelCase(name)].filter(Boolean))];
}

export function normalizeFieldName(name: string): string {
  return toSnakeCase(name);
}
