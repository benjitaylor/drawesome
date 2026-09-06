/** How many swatches the bar can hold. */
export const MAX_SWATCHES = 18;

/** The same ceiling for a rail, which shows one column. */
export const MAX_SWATCHES_COMPACT = 9;

export const SWATCHES = [
  "#111111",
  "#5c5c5c",
  "#9a9a9a",
  "#ffffff",
  "#a83129",
  "#e03131",
  "#f76707",
  "#f59f00",
  "#ffd43b",
  "#74b816",
  "#2f9e44",
  "#0ca678",
  "#1098ad",
  "#1c7ed6",
  "#4263eb",
  "#7048e8",
  "#ae3ec9",
  "#d6336c",
];

/** A short palette, for the vertical rails. */
export const SWATCHES_COMPACT = [
  "#111111",
  "#9a9a9a",
  "#ffffff",
  "#e03131",
  "#f76707",
  "#ffd43b",
  "#2f9e44",
  "#1c7ed6",
  "#7048e8",
];

/** The palette to show, given whatever the host asked for. */
export function resolveSwatches(
  custom: string[] | undefined,
  compact: boolean,
) {
  const max = compact ? MAX_SWATCHES_COMPACT : MAX_SWATCHES;
  if (!custom) return compact ? SWATCHES_COMPACT : SWATCHES;
  return custom.slice(0, max);
}
