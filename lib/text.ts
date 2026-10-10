export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

export function dictLabel(map: object, key: string): string {
  const value = (map as Record<string, string | undefined>)[key];
  return value ?? key.replace(/_/g, " ");
}
