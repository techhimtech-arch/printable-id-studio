import { formatDate } from "@/lib/format-date";
import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";
import { computeFieldsLayout } from "@/lib/auto-fit";

export default function VerticalModern({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name");
  const addressIncluded = fields.includes("address");

  const W = design.customWidth * 4;
  const H = design.customHeight * 4;

  // Reserved: header (~70) + photo block (~120) + name (~16) + signature (~28) + paddings (~16)
  const reserved = 70 + 120 + 16 + 28 + 16;
  const available = Math.max(20, H - reserved);
  const layout = computeFieldsLayout({
    fieldsCount: fields.length,
    availableHeight: available,
    addressIncluded,
    unit: "px",
  });

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm flex flex-col"
      style={{ width: W, height: H, color: "#111" }}
    >
      <div
        className="px-3 py-3 text-white text-center"
        style={{ background: design.accentColor }}
      >
        {design.logoDataUrl && (
          <img src={design.logoDataUrl} alt="" className="h-7 w-7 object-contain mx-auto mb-1" />
        )}
        <div className="text-[10px] font-bold uppercase tracking-wide truncate">{design.schoolName}</div>
        <div className="text-[7px] opacity-90 truncate">{design.schoolSubtitle}</div>
        <div className="text-[7.5px] tracking-[0.2em] mt-1">STUDENT ID</div>
      </div>

      <div className="flex flex-col items-center pt-3">
        <div
          className="overflow-hidden border-2"
          style={{ borderColor: design.accentColor, width: 104, height: 104 }}
        >
          {photo ? (
            <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50">
              No photo
            </div>
          )}
        </div>
        <div className="text-[12.5px] font-bold mt-2 px-3 truncate max-w-full text-center">{name}</div>
      </div>

      <div className="px-3 mt-2 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden" style={{ display: "flex", flexDirection: "column", gap: layout.gap }}>
        {fields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const raw = student.row[col]; const v = f === "dob" ? formatDate(String(raw ?? ""), design.dateFormat) : raw;
          if (!v) return null;
          return (
            <div
              key={f}
              className="flex justify-between gap-2 border-b border-gray-100"
              style={{ fontSize: layout.fontSize, minHeight: layout.rowHeight, paddingBottom: 1 }}
            >
              <span className="text-gray-400 uppercase tracking-wide" style={{ fontSize: layout.labelSize }}>
                {FIELD_LABELS[f]}
              </span>
              <span
                className="font-semibold text-right"
                style={{
                  maxWidth: "60%",
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
          <div className="flex flex-col items-center pt-1">
            {design.signatureDataUrl && (
              <img src={design.signatureDataUrl} alt="signature" className="h-5 object-contain" />
            )}
            <div className="text-[6.5px] text-gray-500 leading-none mt-0.5">
              {design.principalName || "Principal"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
