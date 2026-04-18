import type { CardProps } from "../CardPreview";
import type { CustomElement } from "@/types/idcard";
import { FIELD_LABELS } from "@/types/idcard";

/** Pixels-per-mm at on-screen preview (matches other templates' scale ~4 px/mm). */
export const MM_TO_PX = 4;

function elementValue(
  el: CustomElement,
  student: CardProps["student"],
  mapping: CardProps["mapping"],
  design: CardProps["design"],
): string {
  if (el.kind === "text") return el.text || "";
  if (el.kind === "field") {
    const key = el.field;
    if (!key) return "";
    const col = mapping[key];
    const val = col ? String(student.row[col] ?? "") : "";
    return (el.labelPrefix || "") + val;
  }
  if (el.kind === "logo") return design.logoDataUrl || "";
  if (el.kind === "signature") return design.signatureDataUrl || "";
  return "";
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
        const style: React.CSSProperties = {
          position: "absolute",
          left: el.x * MM_TO_PX,
          top: el.y * MM_TO_PX,
          width: el.w * MM_TO_PX,
          height: el.h * MM_TO_PX,
          fontSize: el.fontSize * 1.05, // pt → px approx for preview
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
