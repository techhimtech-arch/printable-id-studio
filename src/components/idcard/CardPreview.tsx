import type { CardDesign, ColumnMapping, PhotoFile, Student } from "@/types/idcard";
import { FIELD_LABELS, type FieldKey } from "@/types/idcard";

export interface CardProps {
  student: Student;
  photo: PhotoFile | null;
  mapping: ColumnMapping;
  design: CardDesign;
}

const visibleFields: FieldKey[] = ["rollNo", "class", "section", "dob", "bloodGroup", "fatherName"];

export default function CardPreview({ student, photo, mapping, design }: CardProps) {
  const name = mapping.name ? student.row[mapping.name] : "Student Name";

  return (
    <div
      className="bg-white rounded-md overflow-hidden border shadow-sm"
      style={{ width: 220, height: 340, color: "#111" }}
    >
      <div
        className="h-14 px-3 flex items-center gap-2"
        style={{ background: design.accentColor, color: "#fff" }}
      >
        {design.logoDataUrl && (
          <img src={design.logoDataUrl} alt="" className="h-9 w-9 object-contain bg-white/10 rounded p-0.5" />
        )}
        <div className="leading-tight min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide truncate">{design.schoolName}</div>
          <div className="text-[8px] opacity-90 truncate">{design.schoolSubtitle}</div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-3">
        <div
          className="h-24 w-24 rounded border-2 overflow-hidden bg-gray-100"
          style={{ borderColor: design.accentColor }}
        >
          {photo ? (
            <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">No photo</div>
          )}
        </div>
        <div className="mt-2 text-center px-2">
          <div className="text-[12px] font-semibold leading-tight truncate max-w-[200px]">{name}</div>
          <div className="text-[8px] uppercase tracking-wider text-gray-500">Student ID Card</div>
        </div>
      </div>

      <div className="px-3 mt-2 space-y-0.5">
        {visibleFields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const v = student.row[col];
          if (!v) return null;
          return (
            <div key={f} className="flex justify-between gap-2 text-[8.5px]">
              <span className="text-gray-500">{FIELD_LABELS[f]}</span>
              <span className="font-medium truncate max-w-[120px] text-right">{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
