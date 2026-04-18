import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";

export default function HorizontalModern({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name");

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm flex"
      style={{ width: 344, height: 216, color: "#111" }}
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
      <div className="flex-1 p-3 flex gap-3 min-w-0">
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
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold leading-tight truncate">{name}</div>
          <div className="text-[8px] font-semibold mb-1.5" style={{ color: design.accentColor }}>
            STUDENT
          </div>
          <div className="space-y-[2px]">
            {fields.map((f) => {
              const col = mapping[f];
              if (!col) return null;
              const v = student.row[col];
              if (!v) return null;
              return (
                <div key={f} className="flex justify-between gap-2 text-[8px]">
                  <span className="text-gray-500">{FIELD_LABELS[f]}</span>
                  <span className={`font-semibold text-right ${f === "address" ? "line-clamp-2" : "truncate"} max-w-[140px]`}>
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-2 right-3 left-[92px] h-px"
        style={{ background: design.accentColor }}
      />
    </div>
  );
}
