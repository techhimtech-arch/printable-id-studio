import { formatDate } from "@/lib/format-date";
import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";

export default function VerticalModern({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name");

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm flex flex-col"
      style={{ width: design.customWidth * 4, height: design.customHeight * 4, color: "#111" }}
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
        <div className="flex-1">
        {fields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const raw = student.row[col]; const v = f === "dob" ? formatDate(String(raw ?? ""), design.dateFormat) : raw;
          if (!v) return null;
          return (
            <div key={f} className="flex justify-between gap-2 text-[8px] py-[3px] border-b border-gray-100">
              <span className="text-gray-400 uppercase tracking-wide" style={{ fontSize: 7 }}>
                {FIELD_LABELS[f]}
              </span>
              <span className={`font-semibold text-right ${f === "address" ? "line-clamp-2" : "truncate"} max-w-[120px]`}>
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
