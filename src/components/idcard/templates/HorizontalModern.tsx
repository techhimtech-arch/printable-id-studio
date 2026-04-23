import { formatDate } from "@/lib/format-date";
import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";
import { computeFieldsLayout } from "@/lib/auto-fit";

export default function HorizontalModern({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name");
  const addressIncluded = fields.includes("address");

  const W = design.customWidth * 4;
  const H = design.customHeight * 4;

  // Reserved (in body area): name (~18) + role tag (~14) + signature stack (~26) + padding (~12)
  const reserved = 18 + 14 + 26 + 12;
  const available = Math.max(20, H - reserved);
  const layout = computeFieldsLayout({
    fieldsCount: fields.length,
    availableHeight: available,
    addressIncluded,
    unit: "px",
  });

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm flex"
      style={{ width: W, height: H, color: "#111" }}
    >
      {/* sidebar */}
      <div
        className="text-white flex flex-col items-center justify-between py-3 px-2"
        style={{ background: design.accentColor, width: 80 }}
      >
        {design.logoDataUrl ? (
          <img src={design.logoDataUrl} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <div className="h-12 w-12" />
        )}
        <div className="text-center text-[9px] font-bold uppercase tracking-wide leading-tight">
          {design.schoolName}
        </div>
        <div className="text-[7px] tracking-[0.2em]">ID CARD</div>
      </div>

      {/* body */}
      <div className="flex-1 p-3 flex gap-3 min-w-0 overflow-hidden">
        <div
          className="border-2 overflow-hidden bg-gray-100 flex-shrink-0"
          style={{ borderColor: design.accentColor, width: 80, height: 96 }}
        >
          {photo ? (
            <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">No photo</div>
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="text-[14px] font-bold leading-tight truncate">{name}</div>
          <div className="text-[8px] font-semibold mb-1.5" style={{ color: design.accentColor }}>
            STUDENT
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: layout.gap }}>
            {fields.map((f) => {
              const col = mapping[f];
              if (!col) return null;
              const raw = student.row[col]; const v = f === "dob" ? formatDate(String(raw ?? ""), design.dateFormat) : raw;
              if (!v) return null;
              return (
                <div
                  key={f}
                  className="flex justify-between gap-2"
                  style={{ fontSize: layout.fontSize, minHeight: layout.rowHeight }}
                >
                  <span className="text-gray-500 truncate" style={{ fontSize: layout.labelSize }}>
                    {FIELD_LABELS[f]}
                  </span>
                  <span
                    className="font-semibold text-right"
                    style={{
                      maxWidth: "65%",
                      display: "-webkit-box",
                      WebkitLineClamp: f === "address" ? layout.maxAddressLines : 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
          {(design.signatureDataUrl || design.principalName) && (
            <div className="absolute bottom-3 right-3 flex flex-col items-end">
              {design.signatureDataUrl && (
                <img src={design.signatureDataUrl} alt="signature" className="h-5 object-contain" />
              )}
              <div className="text-[6.5px] text-gray-500 leading-none">
                {design.principalName || "Principal"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-2 right-3 left-[92px] h-px"
        style={{ background: design.accentColor }}
      />
    </div>
  );
}
