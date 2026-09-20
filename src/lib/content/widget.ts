/** Shape of `Content.widgetConfig` (see prisma/schema.prisma) — a single interactive function-plot widget. */
export interface GraphWidgetConfig {
  expression: string; // e.g. "a*x^2 + b*x + c", evaluated with x plus every key in `variables`
  variables: Record<string, number>;
  ranges: Record<string, [number, number]>;
}

export function isGraphWidgetConfig(value: unknown): value is GraphWidgetConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.expression === "string" && typeof v.variables === "object" && typeof v.ranges === "object";
}
