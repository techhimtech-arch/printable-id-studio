import { formatDate } from "@/lib/format-date";
import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";
import { computeFieldsLayout } from "@/lib/auto-fit";

export default function VerticalClassic({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name" && f !== "address");
  const addr = mapping.address ? student.row[mapping.address] : "";
  const addressIncluded = !!addr && design.visibleFields.includes("address");

  // Scale preview from card mm dims (4 px / mm)
  const W = design.customWidth * 4;
  const H = design.customHeight * 4;

  // Reserved vertical space (header + photo + name + signature + footer + paddings).
  const reserved = 28 /*header*/ + 112 /*photo*/ + 12 /*name*/ + 4 /*pt*/ + 28 /*sig*/ + 18 /*footer*/ + 16;
  const available = Math.max(20, H - reserved);
  const layout = computeFieldsLayout({
    fieldsCount: fields.length + (addressIncluded ? 1 : 0),
    availableHeight: available,
    addressIncluded,
    unit: "px",
  });

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm flex flex-col"
      style={{ width: W, height: H, color: "#111" }}
    >
      {/* Header strip with logo + school name */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b" style={{ borderColor: "#e5e7eb" }}>
        {design.logoDataUrl ? (
          <img src={design.logoDataUrl} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <div className="h-7 w-7" />
        )}
        <div className="min-w-0 flex-1">
          <div
            className="font-bold uppercase leading-tight break-words"
            style={{
              fontSize: design.schoolName.length > 28 ? 8 : design.schoolName.length > 20 ? 9 : 10,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {design.schoolName}
          </div>
          {design.schoolSubtitle && (
            <div className="text-[7px] text-gray-500 truncate leading-tight">
              {design.schoolSubtitle}
            </div>
          )}
        </div>
      </div>

      {/* Photo */}
      <div className="flex flex-col items-center pt-3">
        <div
          className="overflow-hidden border"
          style={{ borderColor: "#d1d5db", width: 96, height: 112 }}
        >
          {photo ? (
            <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50">
              No photo
            </div>
          )}
        </div>
        <div className="text-[12px] font-bold mt-2 px-3 truncate max-w-full text-center">
          {name}
        </div>
      </div>

      {/* Fields */}
      <div className="px-3 mt-2 flex-1 overflow-hidden" style={{ display: "flex", flexDirection: "column", gap: layout.gap }}>
        {fields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const raw = student.row[col]; const v = f === "dob" ? formatDate(String(raw ?? ""), design.dateFormat) : raw;
          if (!v) return null;
          return (
            <div
              key={f}
              className="flex items-baseline justify-between gap-2"
              style={{ fontSize: layout.fontSize, minHeight: layout.rowHeight, lineHeight: 1.1 }}
            >
              <span className="text-gray-500 truncate" style={{ fontSize: layout.labelSize }}>
                {FIELD_LABELS[f]}
              </span>
              <span className="font-semibold truncate text-right" style={{ maxWidth: "60%" }}>{v}</span>
            </div>
          );
        })}
        {addressIncluded && (
          <div className="leading-tight" style={{ fontSize: layout.fontSize }}>
            <div className="text-gray-500" style={{ fontSize: layout.labelSize }}>Address</div>
            <div
              style={{
                display: "-webkit-box",
                WebkitLineClamp: layout.maxAddressLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {addr}
            </div>
          </div>
        )}
      </div>

      {/* Signature row above footer */}
      {(design.signatureDataUrl || design.principalName) && (
        <div className="px-3 pb-1 flex flex-col items-end">
          {design.signatureDataUrl ? (
            <img src={design.signatureDataUrl} alt="signature" className="h-5 object-contain" />
          ) : (
            <div className="h-5" />
          )}
          <div className="text-[6px] text-gray-500 leading-none">
            {design.principalName || "Principal"}
          </div>
        </div>
      )}

      {/* Footer band */}
      <div
        className="px-2 py-1 text-white text-center"
        style={{ background: design.accentColor }}
      >
        <div className="text-[7px] truncate">
          {[design.contactPhone, design.contactEmail].filter(Boolean).join("  ·  ")}
        </div>
      </div>
    </div>
  );
}
