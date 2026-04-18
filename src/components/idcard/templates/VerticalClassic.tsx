import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";

export default function VerticalClassic({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name" && f !== "address");
  const addr = mapping.address ? student.row[mapping.address] : "";

  // Scale preview from card mm dims (4 px / mm)
  const W = design.customWidth * 4;
  const H = design.customHeight * 4;

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
          <div className="text-[10px] font-bold uppercase truncate leading-tight">
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
      <div className="px-3 mt-2 space-y-[3px] flex-1">
        {fields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const v = student.row[col];
          if (!v) return null;
          return (
            <div key={f} className="flex items-baseline justify-between gap-2 text-[8.5px]">
              <span className="text-gray-500 truncate">{FIELD_LABELS[f]}</span>
              <span className="font-semibold truncate max-w-[110px] text-right">{v}</span>
            </div>
          );
        })}
        {addr && design.visibleFields.includes("address") && (
          <div className="text-[7.5px] pt-1 leading-tight">
            <div className="text-gray-500" style={{ fontSize: 6.5 }}>Address</div>
            <div className="line-clamp-2">{addr}</div>
          </div>
        )}
      </div>

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
