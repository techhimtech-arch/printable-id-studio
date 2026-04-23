import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CardProps } from "../CardPreview";
import type { CustomElement } from "@/types/idcard";
import { FIELD_LABELS } from "@/types/idcard";
import { formatDate } from "@/lib/format-date";

/** Pixels-per-mm at on-screen preview (matches other templates' scale ~4 px/mm). */
export const MM_TO_PX = 4;

const DATE_FIELDS = new Set(["dob"]);

function elementValue(
  el: CustomElement,
  student: CardProps["student"],
  mapping: CardProps["mapping"],
  design: CardProps["design"],
): string {
  if (el.kind === "text") return el.text || "";
  if (el.kind === "divider") return el.text || "";
  if (el.kind === "field") {
    const key = el.field;
    if (!key) return "";
    const col = mapping[key];
    let val = col ? String(student.row[col] ?? "") : "";
    if (DATE_FIELDS.has(key)) {
      val = formatDate(val, el.dateFormat || design.dateFormat);
    }
    return (el.labelPrefix || "") + val;
  }
  if (el.kind === "logo") return design.logoDataUrl || "";
  if (el.kind === "signature") return design.signatureDataUrl || "";
  return "";
}

function qrPayload(
  el: CustomElement,
  student: CardProps["student"],
  mapping: CardProps["mapping"],
): string {
  const key = el.qrSourceField || "admissionNo";
  const col = mapping[key as keyof typeof mapping];
  let v = col ? String(student.row[col] ?? "") : "";
  if (!v) {
    // fallback: name + rollNo
    const nameCol = mapping.name;
    const rollCol = mapping.rollNo;
    v = [nameCol && student.row[nameCol], rollCol && student.row[rollCol]].filter(Boolean).join(" / ");
  }
  return v || "ID";
}

function QrImage({ value, color }: { value: string; color: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value || " ", { margin: 0, color: { dark: color, light: "#ffffff" }, width: 256 })
      .then((d) => !cancelled && setSrc(d))
      .catch(() => !cancelled && setSrc(""));
    return () => {
      cancelled = true;
    };
  }, [value, color]);
  if (!src) return <div className="w-full h-full bg-muted/40" />;
  return <img src={src} alt="" className="w-full h-full object-contain" />;
}

export default function CustomTemplate({ student, photo, mapping, design }: CardProps) {
  const W = design.customWidth * MM_TO_PX;
  const H = design.customHeight * MM_TO_PX;

  return (
    <div
      className="relative bg-white border shadow-sm overflow-hidden"
      style={{ width: W, height: H, color: "#111" }}
    >
      {design.customBgDataUrl && (
        <img
          src={design.customBgDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
      {design.customElements.map((el) => {
        const baseStyle: React.CSSProperties = {
          position: "absolute",
          left: el.x * MM_TO_PX,
          top: el.y * MM_TO_PX,
          width: el.w * MM_TO_PX,
          height: el.h * MM_TO_PX,
        };

        // ===== LINE =====
        if (el.kind === "line") {
          const t = Math.max(0.2, el.thickness ?? 0.4) * MM_TO_PX;
          // horizontal line: render full width, thickness as height; if h>w treat as vertical
          const isVertical = el.h > el.w;
          return (
            <div
              key={el.id}
              style={{
                ...baseStyle,
                background: el.color,
                ...(isVertical
                  ? { width: t, left: el.x * MM_TO_PX + (el.w * MM_TO_PX - t) / 2 }
                  : { height: t, top: el.y * MM_TO_PX + (el.h * MM_TO_PX - t) / 2 }),
              }}
            />
          );
        }

        // ===== RECT =====
        if (el.kind === "rect") {
          const fill = el.fillColor && el.fillColor !== "none" ? el.fillColor : "transparent";
          const border = el.borderColor && el.borderColor !== "none"
            ? `${Math.max(0.1, el.thickness ?? 0.3) * MM_TO_PX}px solid ${el.borderColor}`
            : "none";
          return (
            <div
              key={el.id}
              style={{
                ...baseStyle,
                background: fill,
                border,
                borderRadius: (el.radius ?? 0) * MM_TO_PX,
              }}
            />
          );
        }

        // ===== DIVIDER (line + centered label) =====
        if (el.kind === "divider") {
          const t = Math.max(0.2, el.thickness ?? 0.3) * MM_TO_PX;
          return (
            <div
              key={el.id}
              style={{
                ...baseStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: el.color,
                fontSize: el.fontSize * 1.05,
                fontFamily:
                  el.fontFamily === "times"
                    ? "Georgia, serif"
                    : el.fontFamily === "courier"
                    ? "monospace"
                    : "Helvetica, Arial, sans-serif",
                fontWeight: el.bold ? 700 : 400,
                fontStyle: el.italic ? "italic" : "normal",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <div style={{ flex: 1, height: t, background: el.color }} />
              {el.text ? <span style={{ padding: "0 4px" }}>{el.text}</span> : null}
              <div style={{ flex: 1, height: t, background: el.color }} />
            </div>
          );
        }

        // ===== QR =====
        if (el.kind === "qr") {
          const value = qrPayload(el, student, mapping);
          return (
            <div key={el.id} style={baseStyle}>
              <QrImage value={value} color={el.color || "#000000"} />
            </div>
          );
        }

        // ===== Text-like (field/text/photo/logo/signature) =====
        const style: React.CSSProperties = {
          ...baseStyle,
          fontSize: el.fontSize * 1.05,
          fontFamily:
            el.fontFamily === "times"
              ? "Georgia, 'Times New Roman', serif"
              : el.fontFamily === "courier"
              ? "'Courier New', monospace"
              : "Helvetica, Arial, sans-serif",
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          color: el.color,
          textAlign: el.align,
          lineHeight: 1.15,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent:
            el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
        };

        if (el.kind === "photo") {
          return (
            <div key={el.id} style={style}>
              {photo ? (
                <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground border border-dashed">
                  Photo
                </div>
              )}
            </div>
          );
        }
        if (el.kind === "logo" || el.kind === "signature") {
          const src = elementValue(el, student, mapping, design);
          return (
            <div key={el.id} style={style}>
              {src ? (
                <img src={src} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full border border-dashed border-muted-foreground/40 flex items-center justify-center text-[8px] text-muted-foreground">
                  {el.kind}
                </div>
              )}
            </div>
          );
        }
        const text = elementValue(el, student, mapping, design);
        return (
          <div key={el.id} style={style}>
            <span className="block w-full" style={{ textAlign: el.align }}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
