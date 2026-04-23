import type jsPDF from "jspdf";
import QRCode from "qrcode";
import type { CardDesign, ColumnMapping, PhotoFile, Student, CustomElement, FieldKey } from "@/types/idcard";
import { FIELD_LABELS } from "@/types/idcard";
import { formatDate } from "@/lib/format-date";
import { computeFieldsLayout } from "@/lib/auto-fit";

const DATE_FIELDS = new Set<FieldKey>(["dob"]);

function drawQrToPdf(doc: jsPDF, value: string, x: number, y: number, size: number, color: string) {
  try {
    const qr = QRCode.create(value || " ", { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const n = modules.size;
    const cell = size / n;
    const [r, g, b] = hexToRgb(color || "#000000");
    doc.setFillColor(r, g, b);
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (modules.get(row, col)) {
          doc.rect(x + col * cell, y + row * cell, cell + 0.02, cell + 0.02, "F");
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export const CARD_DIMS = {
  vertical: { w: 54, h: 86 },
  horizontal: { w: 86, h: 54 },
};

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lighten([r, g, b]: [number, number, number], amt: number): [number, number, number] {
  return [
    Math.round(r + (255 - r) * amt),
    Math.round(g + (255 - g) * amt),
    Math.round(b + (255 - b) * amt),
  ];
}

export function drawDashedLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, dash = 0.6, gap = 0.6) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  let drawn = 0;
  while (drawn < len) {
    const sx = x1 + ux * drawn;
    const sy = y1 + uy * drawn;
    const ex = x1 + ux * Math.min(drawn + dash, len);
    const ey = y1 + uy * Math.min(drawn + dash, len);
    doc.line(sx, sy, ex, ey);
    drawn += dash + gap;
  }
}

export function drawDiagonalStripes(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
) {
  doc.saveGraphicsState();
  // @ts-ignore - clip via rectangle
  doc.rect(x, y, w, h).clip().discardPath();
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(1.2);
  for (let i = -h; i < w + h; i += 2.4) {
    doc.line(x + i, y + h, x + i + h, y);
  }
  doc.restoreGraphicsState();
}

export function drawCornerAccent(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  rgb: [number, number, number],
) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  // quarter circle approximated by filled circle then mask via rect
  doc.circle(x, y, size, "F");
}

function safeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: { align?: "left" | "center" | "right"; lineHeight?: number; maxLines?: number } = {},
) {
  const lines = doc.splitTextToSize(text || "", maxWidth) as string[];
  const lh = opts.lineHeight ?? 3.2;
  const max = opts.maxLines ?? lines.length;
  const shown = lines.slice(0, max);
  if (lines.length > max && shown.length > 0) {
    shown[shown.length - 1] = shown[shown.length - 1].replace(/.{1,3}$/, "…");
  }
  shown.forEach((ln, i) => {
    doc.text(ln, x, y + i * lh, { align: opts.align ?? "left" });
  });
  return shown.length * lh;
}

interface DrawCtx {
  doc: jsPDF;
  x: number;
  y: number;
  student: Student;
  photo: PhotoFile | null;
  mapping: ColumnMapping;
  design: CardDesign;
}

function getValue(student: Student, mapping: ColumnMapping, key: string, design?: CardDesign) {
  const col = (mapping as any)[key];
  if (!col) return "";
  let v = String(student.row[col] ?? "");
  if (DATE_FIELDS.has(key as FieldKey) && design) {
    v = formatDate(v, design.dateFormat);
  }
  return v;
}

function detectImageFormat(dataUrl: string): "JPEG" | "PNG" {
  // data:image/png;base64,... | data:image/jpeg;... | data:image/jpg;...
  const m = /^data:image\/(png|jpe?g|webp|svg\+xml)/i.exec(dataUrl || "");
  if (!m) return "PNG";
  const t = m[1].toLowerCase();
  if (t === "png" || t === "webp" || t === "svg+xml") return "PNG";
  return "JPEG";
}

// Cache normalized data URLs so the same logo/signature isn't re-converted
// for every card.
const normalizedCache = new Map<string, string>();

/** Force-convert any image data URL into a clean PNG via canvas (sync via image element is async, so we cache on first use). */
function normalizeToCanvasPng(dataUrl: string): Promise<string> {
  if (normalizedCache.has(dataUrl)) return Promise.resolve(normalizedCache.get(dataUrl)!);
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, img.width || 512);
          canvas.height = Math.max(1, img.height || 512);
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0);
          const out = canvas.toDataURL("image/png");
          normalizedCache.set(dataUrl, out);
          resolve(out);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

// Pre-warm the cache so PDF generation can stay synchronous per card.
export async function prewarmImageCache(urls: Array<string | null | undefined>) {
  const unique = Array.from(new Set(urls.filter((u): u is string => !!u && u.startsWith("data:image/"))));
  await Promise.all(unique.map((u) => normalizeToCanvasPng(u)));
}

function tryAddImage(doc: jsPDF, dataUrl: string, _fmt: "JPEG" | "PNG", x: number, y: number, w: number, h: number) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return;
  if (!(w > 0) || !(h > 0)) return;

  // Prefer the cached PNG version when available — it's always PDF-safe.
  const safeUrl = normalizedCache.get(dataUrl) ?? dataUrl;
  const format = safeUrl === dataUrl ? detectImageFormat(dataUrl) : "PNG";

  try {
    doc.addImage(safeUrl, format, x, y, w, h, undefined, "FAST");
    return;
  } catch {
    /* try alternate format below */
  }
  try {
    doc.addImage(safeUrl, format === "JPEG" ? "PNG" : "JPEG", x, y, w, h, undefined, "FAST");
  } catch {
    /* leave the placeholder rect */
  }
}

/* ============ TEMPLATE: VERTICAL CLASSIC (simple/clean) ============ */
function drawVerticalClassic({ doc, x, y, student, photo, mapping, design }: DrawCtx) {
  const W = design.customWidth;
  const H = design.customHeight;
  const rgb = hexToRgb(design.accentColor);

  // Outer border
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(x, y, W, H, "S");

  // Header strip with logo + school name
  const hdrH = 10;
  doc.setDrawColor(220);
  doc.line(x, y + hdrH, x + W, y + hdrH);
  let textX = x + 2;
  if (design.logoDataUrl) {
    tryAddImage(doc, design.logoDataUrl, "PNG", x + 1.5, y + 1.5, 7, 7);
    textX = x + 10;
  }
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  const nameLen = design.schoolName.length;
  const nameSize = nameLen > 28 ? 5.5 : nameLen > 20 ? 6.2 : 7;
  doc.setFontSize(nameSize);
  safeText(doc, design.schoolName.toUpperCase(), textX, y + 3.5, W - (textX - x) - 2, { maxLines: 2, lineHeight: 2.6 });
  if (design.schoolSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(120);
    safeText(doc, design.schoolSubtitle, textX, y + 8.8, W - (textX - x) - 2, { maxLines: 1 });
  }

  // Photo
  const pw = Math.min(26, W - 12);
  const ph = pw * 1.15;
  const px = x + (W - pw) / 2;
  const py = y + hdrH + 3;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(px, py, pw, ph, "S");
  if (photo) tryAddImage(doc, photo.dataUrl, "JPEG", px, py, pw, ph);

  // Name
  const name = getValue(student, mapping, "name", design) || "—";
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  safeText(doc, name, x + W / 2, py + ph + 4.5, W - 4, { align: "center", maxLines: 1 });

  // Fields — auto-fit
  const fields = design.visibleFields.filter((f) => f !== "name" && f !== "address");
  const addr = getValue(student, mapping, "address", design);
  const addressIncluded = !!addr && design.visibleFields.includes("address");
  const footerH = 6;
  const sigReserve = (design.signatureDataUrl || design.principalName) ? 11 : 2;
  const fieldsTop = py + ph + 7;
  const fieldsBottom = y + H - footerH - sigReserve;
  const available = Math.max(4, fieldsBottom - fieldsTop);
  const layout = computeFieldsLayout({
    fieldsCount: fields.length + (addressIncluded ? 1 : 0),
    availableHeight: available,
    addressIncluded,
    unit: "mm",
  });

  let fy = fieldsTop + layout.fontSize * 0.6;
  doc.setFontSize(layout.fontSize);
  for (const f of fields) {
    const v = getValue(student, mapping, f, design);
    if (!v) continue;
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(layout.labelSize);
    doc.text(FIELD_LABELS[f], x + 3, fy);
    doc.setTextColor(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(layout.fontSize);
    doc.text(String(v), x + W - 3, fy, { align: "right", maxWidth: W - 22 });
    fy += layout.rowHeight;
  }

  // Address
  if (addressIncluded && fy < fieldsBottom) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.setFontSize(layout.labelSize);
    doc.text("Address", x + 3, fy);
    doc.setTextColor(40);
    doc.setFontSize(layout.fontSize);
    safeText(doc, addr, x + 3, fy + layout.labelSize * 0.45, W - 6, {
      lineHeight: layout.fontSize * 0.42,
      maxLines: layout.maxAddressLines,
    });
  }

  // Signature row above footer
  if (design.signatureDataUrl || design.principalName) {
    const sigW = 20, sigH = 6;
    const sigX = x + W - sigW - 2;
    const sigY = y + H - footerH - sigH - 2;
    if (design.signatureDataUrl) {
      tryAddImage(doc, design.signatureDataUrl, "PNG", sigX, sigY, sigW, sigH);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(110);
    doc.text(design.principalName || "Principal", sigX + sigW / 2, sigY + sigH + 2, { align: "center" });
  }

  // Footer band — contact only (school name is in header now)
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y + H - footerH, W, footerH, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  const contact = [design.contactPhone, design.contactEmail].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, x + W / 2, y + H - footerH + 3.8, { align: "center" });
}

/* ============ TEMPLATE: HORIZONTAL CLASSIC ============ */
function drawHorizontalClassic({ doc, x, y, student, photo, mapping, design }: DrawCtx) {
  const W = design.customWidth, H = design.customHeight;
  const rgb = hexToRgb(design.accentColor);

  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, W, H, 2, 2, "S");

  // Top header band
  const hdrH = 11;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y, W, hdrH, "F");

  let textX = x + 3;
  if (design.logoDataUrl) {
    tryAddImage(doc, design.logoDataUrl, "PNG", x + 2, y + 1.5, 8, 8);
    textX = x + 12;
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  safeText(doc, design.schoolName.toUpperCase(), textX, y + 5, W - (textX - x) - 3, { maxLines: 1 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  safeText(doc, design.schoolSubtitle, textX, y + 8.5, W - (textX - x) - 3, { maxLines: 1 });

  // Diagonal stripes footer
  const stripeH = 4.5;
  drawDiagonalStripes(doc, x, y + H - stripeH, W, stripeH, rgb);

  // Photo column (right)
  const pw = 22, ph = 26;
  const px = x + W - pw - 4;
  const py = y + hdrH + 3;
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.5);
  doc.rect(px, py, pw, ph, "S");
  if (photo) tryAddImage(doc, photo.dataUrl, "JPEG", px, py, pw, ph);

  // "IDENTITY CARD" pill
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.roundedRect(px, py + ph + 1.5, pw, 3.5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("IDENTITY CARD", px + pw / 2, py + ph + 4, { align: "center" });

  // Signature line
  if (design.signatureDataUrl) {
    tryAddImage(doc, design.signatureDataUrl, "PNG", px + 2, py + ph + 6, pw - 4, 5);
  }
  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.line(px, py + ph + 11.5, px + pw, py + ph + 11.5);
  doc.setTextColor(110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  doc.text("Principal", px + pw / 2, py + ph + 13.5, { align: "center" });

  // Fields column (left)
  const fx = x + 3;
  const fmaxW = W - pw - 12;
  let fy = y + hdrH + 4;

  // Name (highlighted)
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const name = getValue(student, mapping, "name", design) || "—";
  safeText(doc, name, fx, fy, fmaxW, { lineHeight: 3.6, maxLines: 1 });
  fy += 4.5;
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.3);
  doc.line(fx, fy - 1, fx + 18, fy - 1);

  const fields = design.visibleFields.filter((f) => f !== "name");
  const addressIncluded = fields.includes("address");
  const labelW = 18;
  const available = Math.max(4, (y + H - 5) - fy);
  const layout = computeFieldsLayout({
    fieldsCount: fields.length,
    availableHeight: available,
    addressIncluded,
    unit: "mm",
  });
  for (const f of fields) {
    const v = getValue(student, mapping, f, design);
    if (!v) continue;
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(layout.labelSize);
    doc.text(FIELD_LABELS[f], fx, fy);
    doc.setTextColor(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(layout.fontSize);
    doc.text(":", fx + labelW - 1, fy);
    const lines = doc.splitTextToSize(String(v), fmaxW - labelW) as string[];
    const max = f === "address" ? layout.maxAddressLines : 1;
    const shown = lines.slice(0, max);
    if (lines.length > max) shown[shown.length - 1] = shown[shown.length - 1].replace(/.{1,3}$/, "…");
    const lh = layout.fontSize * 0.45;
    shown.forEach((ln, i) => doc.text(ln, fx + labelW + 1, fy + i * lh));
    fy += lh * shown.length + layout.gap;
  }
}

/* ============ TEMPLATE: VERTICAL MODERN ============ */
function drawVerticalModern({ doc, x, y, student, photo, mapping, design }: DrawCtx) {
  const W = design.customWidth, H = design.customHeight;
  const rgb = hexToRgb(design.accentColor);

  doc.setDrawColor(230);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, W, H, 1, 1, "S");

  // Solid header
  const hdrH = 18;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y, W, hdrH, "F");
  if (design.logoDataUrl) tryAddImage(doc, design.logoDataUrl, "PNG", x + 3, y + 3, 8, 8);
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  safeText(doc, design.schoolName.toUpperCase(), x + W / 2, y + 7, W - 6, { align: "center", maxLines: 1 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  safeText(doc, design.schoolSubtitle, x + W / 2, y + 11, W - 6, { align: "center", maxLines: 1 });
  doc.setFontSize(5.5);
  doc.text("STUDENT ID", x + W / 2, y + 15.5, { align: "center" });

  // Photo - circular framed
  const pw = 26, ph = 26;
  const px = x + (W - pw) / 2;
  const py = y + hdrH + 3;
  doc.setFillColor(245, 245, 245);
  doc.rect(px, py, pw, ph, "F");
  if (photo) tryAddImage(doc, photo.dataUrl, "JPEG", px, py, pw, ph);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.4);
  doc.rect(px, py, pw, ph, "S");

  // Name
  const name = getValue(student, mapping, "name", design) || "—";
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  safeText(doc, name, x + W / 2, py + ph + 5, W - 6, { align: "center", maxLines: 1 });

  // Fields with thin rules
  let fy = py + ph + 9;
  const fields = design.visibleFields.filter((f) => f !== "name");
  doc.setFontSize(6);
  for (const f of fields) {
    const v = getValue(student, mapping, f, design);
    if (!v) continue;
    if (fy > y + H - 6) break;
    doc.setTextColor(140);
    doc.setFont("helvetica", "normal");
    doc.text(FIELD_LABELS[f].toUpperCase(), x + 3, fy);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(String(v), 28) as string[];
    const max = f === "address" ? 2 : 1;
    const shown = lines.slice(0, max);
    if (lines.length > max) shown[shown.length - 1] = shown[shown.length - 1].replace(/.{1,3}$/, "…");
    shown.forEach((ln, i) => doc.text(ln, x + W - 3, fy + i * 2.6, { align: "right" }));
    fy += 2.6 * shown.length + 0.6;
    doc.setDrawColor(235);
    doc.setLineWidth(0.1);
    doc.line(x + 3, fy - 0.5, x + W - 3, fy - 0.5);
    fy += 1;
  }

  // Signature near bottom-right
  if (design.signatureDataUrl || design.principalName) {
    const sigW = 22, sigH = 6;
    const sigX = x + W - sigW - 2;
    const sigY = y + H - sigH - 5;
    if (design.signatureDataUrl) {
      tryAddImage(doc, design.signatureDataUrl, "PNG", sigX, sigY, sigW, sigH);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(110);
    doc.text(design.principalName || "Principal", sigX + sigW / 2, sigY + sigH + 2, { align: "center" });
  }
}

/* ============ TEMPLATE: HORIZONTAL MODERN ============ */
function drawHorizontalModern({ doc, x, y, student, photo, mapping, design }: DrawCtx) {
  const W = design.customWidth, H = design.customHeight;
  const rgb = hexToRgb(design.accentColor);

  doc.setDrawColor(230);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, W, H, 1.5, 1.5, "S");

  // Left accent sidebar
  const sbW = 20;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y, sbW, H, "F");

  if (design.logoDataUrl) {
    tryAddImage(doc, design.logoDataUrl, "PNG", x + (sbW - 12) / 2, y + 4, 12, 12);
  }
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  safeText(doc, design.schoolName.toUpperCase(), x + sbW / 2, y + 20, sbW - 2, {
    align: "center",
    lineHeight: 2.6,
    maxLines: 3,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.text("ID CARD", x + sbW / 2, y + H - 3, { align: "center" });

  // Photo
  const pw = 20, ph = 24;
  const px = x + sbW + 3;
  const py = y + 4;
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.4);
  doc.rect(px, py, pw, ph, "S");
  if (photo) tryAddImage(doc, photo.dataUrl, "JPEG", px, py, pw, ph);

  // Name + role
  const fx = px + pw + 4;
  const fmaxW = W - (fx - x) - 3;
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const name = getValue(student, mapping, "name", design) || "—";
  safeText(doc, name, fx, py + 3.5, fmaxW, { lineHeight: 3.6, maxLines: 1 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text("STUDENT", fx, py + 6.5);

  // Fields
  let fy = py + 10.5;
  doc.setFontSize(6);
  const fields = design.visibleFields.filter((f) => f !== "name");
  for (const f of fields) {
    const v = getValue(student, mapping, f, design);
    if (!v) continue;
    if (fy > y + H - 4) break;
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text(FIELD_LABELS[f], fx, fy);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(String(v), fmaxW) as string[];
    const max = f === "address" ? 2 : 1;
    const shown = lines.slice(0, max);
    if (lines.length > max) shown[shown.length - 1] = shown[shown.length - 1].replace(/.{1,3}$/, "…");
    shown.forEach((ln, i) => doc.text(ln, x + W - 3, fy + i * 2.6, { align: "right" }));
    fy += 2.6 * shown.length + 1.2;
  }

  // Bottom hairline
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.3);
  doc.line(x + sbW + 3, y + H - 2.5, x + W - 3, y + H - 2.5);

  // Signature in bottom-right
  if (design.signatureDataUrl || design.principalName) {
    const sigW = 20, sigH = 6;
    const sigX = x + W - sigW - 2;
    const sigY = y + H - sigH - 4;
    if (design.signatureDataUrl) {
      tryAddImage(doc, design.signatureDataUrl, "PNG", sigX, sigY, sigW, sigH);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(110);
    doc.text(design.principalName || "Principal", sigX + sigW / 2, sigY + sigH + 1.8, { align: "center" });
  }
}

/* ============ TEMPLATE: CUSTOM (drag-and-drop) ============ */
function drawCustomTemplate({ doc, x, y, student, photo, mapping, design }: DrawCtx) {
  const W = design.customWidth;
  const H = design.customHeight;

  // Optional outer hairline
  doc.setDrawColor(220);
  doc.setLineWidth(0.15);
  doc.rect(x, y, W, H, "S");

  // Background image
  if (design.customBgDataUrl) {
    tryAddImage(doc, design.customBgDataUrl, "JPEG", x, y, W, H);
  }

  for (const el of design.customElements) {
    const ex = x + el.x;
    const ey = y + el.y;

    if (el.kind === "photo") {
      if (photo) tryAddImage(doc, photo.dataUrl, "JPEG", ex, ey, el.w, el.h);
      else {
        doc.setDrawColor(180);
        doc.setLineWidth(0.2);
        doc.rect(ex, ey, el.w, el.h, "S");
      }
      continue;
    }
    if (el.kind === "logo") {
      if (design.logoDataUrl) tryAddImage(doc, design.logoDataUrl, "PNG", ex, ey, el.w, el.h);
      continue;
    }
    if (el.kind === "signature") {
      if (design.signatureDataUrl) tryAddImage(doc, design.signatureDataUrl, "PNG", ex, ey, el.w, el.h);
      continue;
    }

    // line
    if (el.kind === "line") {
      const t = Math.max(0.1, el.thickness ?? 0.4);
      const [r, g, b] = hexToRgb(el.color || "#111111");
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(t);
      const isVertical = el.h > el.w;
      if (isVertical) {
        const cx = ex + el.w / 2;
        doc.line(cx, ey, cx, ey + el.h);
      } else {
        const cy = ey + el.h / 2;
        doc.line(ex, cy, ex + el.w, cy);
      }
      continue;
    }

    // rectangle
    if (el.kind === "rect") {
      const fill = el.fillColor && el.fillColor !== "none" ? hexToRgb(el.fillColor) : null;
      const border = el.borderColor && el.borderColor !== "none" ? hexToRgb(el.borderColor) : null;
      if (fill) doc.setFillColor(fill[0], fill[1], fill[2]);
      if (border) {
        doc.setDrawColor(border[0], border[1], border[2]);
        doc.setLineWidth(Math.max(0.05, el.thickness ?? 0.3));
      }
      const mode = fill && border ? "FD" : fill ? "F" : border ? "S" : "";
      if (mode) {
        const radius = Math.max(0, el.radius ?? 0);
        if (radius > 0) doc.roundedRect(ex, ey, el.w, el.h, radius, radius, mode);
        else doc.rect(ex, ey, el.w, el.h, mode);
      }
      continue;
    }

    // divider (line + label)
    if (el.kind === "divider") {
      const t = Math.max(0.1, el.thickness ?? 0.3);
      const [r, g, b] = hexToRgb(el.color || "#111111");
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(t);
      const cy = ey + el.h / 2;
      const label = el.text || "";
      if (!label) {
        doc.line(ex, cy, ex + el.w, cy);
      } else {
        doc.setTextColor(r, g, b);
        const style2: "normal" | "bold" | "italic" | "bolditalic" =
          el.bold && el.italic ? "bolditalic" : el.bold ? "bold" : el.italic ? "italic" : "normal";
        doc.setFont(el.fontFamily, style2);
        doc.setFontSize(el.fontSize);
        const tw = (doc.getTextWidth(label) as number) + 2;
        const half = (el.w - tw) / 2;
        if (half > 1) {
          doc.line(ex, cy, ex + half, cy);
          doc.line(ex + el.w - half, cy, ex + el.w, cy);
        }
        doc.text(label, ex + el.w / 2, cy + el.fontSize * 0.18, { align: "center" });
      }
      continue;
    }

    // QR code
    if (el.kind === "qr") {
      const key = (el.qrSourceField || "admissionNo") as FieldKey;
      const col = (mapping as any)[key];
      let v = col ? String(student.row[col] ?? "") : "";
      if (!v) {
        const nameCol = (mapping as any).name;
        const rollCol = (mapping as any).rollNo;
        v = [nameCol && student.row[nameCol], rollCol && student.row[rollCol]].filter(Boolean).join(" / ");
      }
      const size = Math.min(el.w, el.h);
      drawQrToPdf(doc, v || "ID", ex, ey, size, el.color || "#000000");
      continue;
    }

    // text or field
    let text = "";
    if (el.kind === "text") text = el.text || "";
    else if (el.kind === "field" && el.field) {
      const col = (mapping as any)[el.field];
      let v = col ? String(student.row[col] ?? "") : "";
      if (DATE_FIELDS.has(el.field)) {
        v = formatDate(v, el.dateFormat || design.dateFormat);
      }
      text = (el.labelPrefix || "") + v;
    }
    if (!text) continue;

    const [r, g, b] = hexToRgb(el.color || "#111111");
    doc.setTextColor(r, g, b);
    const style: "normal" | "bold" | "italic" | "bolditalic" =
      el.bold && el.italic ? "bolditalic" : el.bold ? "bold" : el.italic ? "italic" : "normal";
    doc.setFont(el.fontFamily, style);
    doc.setFontSize(el.fontSize);

    // Vertical centering inside box (rough): start near top + ascent
    const lh = el.fontSize * 0.42; // pt → mm line-height-ish
    const lines = doc.splitTextToSize(text, el.w) as string[];
    const totalH = lines.length * lh;
    const startY = ey + Math.max(lh, (el.h - totalH) / 2 + lh * 0.85);

    let tx = ex;
    if (el.align === "center") tx = ex + el.w / 2;
    else if (el.align === "right") tx = ex + el.w;

    lines.forEach((ln, i) => {
      if (startY + i * lh > ey + el.h + 0.5) return;
      doc.text(ln, tx, startY + i * lh, { align: el.align });
    });
  }
}

export function drawCard(ctx: DrawCtx) {
  switch (ctx.design.template) {
    case "horizontal-classic":
      return drawHorizontalClassic(ctx);
    case "vertical-modern":
      return drawVerticalModern(ctx);
    case "horizontal-modern":
      return drawHorizontalModern(ctx);
    case "custom":
      return drawCustomTemplate(ctx);
    case "vertical-classic":
    default:
      return drawVerticalClassic(ctx);
  }
}

export function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(180);
  doc.setLineWidth(0.1);
  const m = 1.5;
  // corners
  doc.line(x - m, y, x - 0.3, y);
  doc.line(x, y - m, x, y - 0.3);
  doc.line(x + w + 0.3, y, x + w + m, y);
  doc.line(x + w, y - m, x + w, y - 0.3);
  doc.line(x - m, y + h, x - 0.3, y + h);
  doc.line(x, y + h + 0.3, x, y + h + m);
  doc.line(x + w + 0.3, y + h, x + w + m, y + h);
  doc.line(x + w, y + h + 0.3, x + w, y + h + m);
}

/** Draw full dotted grid lines across the page in the gap centers between cards. */
export function drawCutGridLines(
  doc: jsPDF,
  marginX: number,
  marginY: number,
  gap: number,
  cols: number,
  rows: number,
  cardW: number,
  cardH: number,
  pageW: number,
  pageH: number,
) {
  doc.setDrawColor(170);
  doc.setLineWidth(0.08);
  // Vertical lines
  for (let c = 0; c <= cols; c++) {
    const x = c === 0 ? marginX - gap / 2 : marginX + c * cardW + (c - 0.5) * gap;
    if (x < 1 || x > pageW - 1) continue;
    drawDashedLine(doc, x, 2, x, pageH - 2, 0.8, 0.8);
  }
  // Horizontal lines
  for (let r = 0; r <= rows; r++) {
    const y = r === 0 ? marginY - gap / 2 : marginY + r * cardH + (r - 0.5) * gap;
    if (y < 1 || y > pageH - 1) continue;
    drawDashedLine(doc, 2, y, pageW - 2, y, 0.8, 0.8);
  }
}

/** Run a draw callback with the canvas rotated 90° around the card center.
 *  Uses a single combined CTM (translate(cx,cy) * rotate(90°) * translate(-cx,-cy))
 *  which equals Matrix(0, 1, -1, 0, cx + cy, cy - cx). */
export function withRotatedCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: (nx: number, ny: number, nw: number, nh: number) => void,
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const nx = cx - h / 2;
  const ny = cy - w / 2;
  const d = doc as unknown as {
    advancedAPI: (fn: (doc: jsPDF) => void) => void;
    Matrix: new (a: number, b: number, c: number, d: number, e: number, f: number) => unknown;
    setCurrentTransformationMatrix: (m: unknown) => void;
  };

  d.advancedAPI(() => {
    // Single CTM: rotate 90° clockwise around (cx, cy).
    // [ 0  1  cx + cy ]
    // [-1  0  cy - cx ]
    d.setCurrentTransformationMatrix(new d.Matrix(0, 1, -1, 0, cx + cy, cy - cx));
    draw(nx, ny, h, w);
  });
}
