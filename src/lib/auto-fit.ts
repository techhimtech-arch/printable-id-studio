/** Shared auto-fit helpers for ID-card field rendering (preview + PDF). */

export interface FieldsLayoutInput {
  fieldsCount: number;
  /** Available vertical space for the fields block. Same unit as `unit`. */
  availableHeight: number;
  /** Whether address (multi-line) is part of the visible fields. */
  addressIncluded: boolean;
  /** "px" for preview templates, "mm" for jsPDF. */
  unit: "px" | "mm";
}

export interface FieldsLayout {
  rowHeight: number;
  fontSize: number;
  labelSize: number;
  gap: number;
  /** How many lines the (optional) address may occupy. */
  maxAddressLines: number;
}

/**
 * Compute font/row sizes so all visible fields fit inside `availableHeight`.
 * Falls back to the smallest readable size — never returns a layout that would
 * silently drop fields.
 */
export function computeFieldsLayout(input: FieldsLayoutInput): FieldsLayout {
  const { fieldsCount, availableHeight, addressIncluded, unit } = input;
  const n = Math.max(1, fieldsCount);

  // Base sizes in the chosen unit.
  const base =
    unit === "px"
      ? { fontMax: 9, fontMin: 6, rowMax: 14, rowMin: 9, gap: 2, labelDelta: 1 }
      : { fontMax: 6.5, fontMin: 4.4, rowMax: 3.6, rowMin: 2.4, gap: 0.6, labelDelta: 0.4 };

  // First pass: assume address gets 2 lines.
  let addressLines = addressIncluded ? 2 : 0;
  // Effective row count (address counts as N rows for spacing).
  const effRows = (n - (addressIncluded ? 1 : 0)) + addressLines;

  // Required row height to fit everything at base size.
  let rowHeight = Math.min(base.rowMax, availableHeight / Math.max(1, effRows));

  // If too tight, drop address to single line and recompute.
  if (rowHeight < base.rowMin && addressIncluded) {
    addressLines = 1;
    const eff2 = (n - 1) + addressLines;
    rowHeight = Math.min(base.rowMax, availableHeight / Math.max(1, eff2));
  }

  // Clamp rowHeight to min — if it still doesn't fit we shrink font further.
  rowHeight = Math.max(base.rowMin * 0.85, rowHeight);

  // Font size proportional to row height.
  const ratio = (rowHeight - base.rowMin) / Math.max(0.001, base.rowMax - base.rowMin);
  const t = Math.max(0, Math.min(1, ratio));
  const fontSize = base.fontMin + (base.fontMax - base.fontMin) * t;
  const labelSize = Math.max(base.fontMin - base.labelDelta, fontSize - base.labelDelta);

  return {
    rowHeight,
    fontSize,
    labelSize,
    gap: base.gap * (0.5 + 0.5 * t),
    maxAddressLines: addressLines,
  };
}

/** Truncate a string to `maxChars` adding an ellipsis. */
export function truncateToFit(text: string, maxChars: number): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)).trimEnd() + "…";
}
