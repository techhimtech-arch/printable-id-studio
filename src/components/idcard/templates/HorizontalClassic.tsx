import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";

export default function HorizontalClassic({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name");

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm"
      style={{ width: 344, height: 216, color: "#111" }}
    >
      {/* header */}
      <div
        className="px-3 py-2 flex items-center gap-2 text-white"
        style={{ background: design.accentColor }}
      >
        {design.logoDataUrl && (
          <img src={design.logoDataUrl} alt="" className="h-9 w-9 object-contain bg-white/10 rounded p-0.5" />
        )}
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase tracking-wide truncate">{design.schoolName}</div>
          <div className="text-[8px] opacity-90 truncate">{design.schoolSubtitle}</div>
        </div>
      </div>

      <div className="flex px-3 py-2 gap-3">
        {/* fields */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-bold leading-tight truncate"
            style={{ color: design.accentColor }}
          >
            {name}
          </div>
          <div className="h-0.5 w-12 mt-0.5 mb-1.5" style={{ background: design.accentColor }} />
          <div className="space-y-[2px]">
            {fields.map((f) => {
              const col = mapping[f];
              if (!col) return null;
              const v = student.row[col];
              if (!v) return null;
              return (
                <div key={f} className="grid grid-cols-[60px_8px_1fr] text-[8px] gap-1 items-start">
                  <span className="text-gray-500">{FIELD_LABELS[f]}</span>
                  <span className="text-gray-400">:</span>
                  <span className={`font-semibold ${f === "address" ? "line-clamp-2" : "truncate"}`}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* photo */}
        <div className="flex flex-col items-center">
          <div
            className="border-2 overflow-hidden bg-gray-100"
            style={{ borderColor: design.accentColor, width: 84, height: 100 }}
          >
            {photo ? (
              <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">No photo</div>
            )}
          </div>
          <div
            className="mt-1 text-[7.5px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-sm w-full text-center"
            style={{ background: design.accentColor }}
          >
            Identity Card
          </div>
          <div className="mt-1 h-4 w-full flex items-end justify-center">
            {design.signatureDataUrl ? (
              <img src={design.signatureDataUrl} alt="" className="h-4 object-contain" />
            ) : null}
          </div>
          <div className="border-t border-gray-400 w-full text-center text-[7px] text-gray-500 leading-none pt-0.5">
            Principal
          </div>
        </div>
      </div>

      {/* diagonal stripes */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${design.accentColor} 0 6px, transparent 6px 12px)`,
        }}
      />
    </div>
  );
}
