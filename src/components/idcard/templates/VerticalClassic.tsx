import type { CardProps } from "../CardPreview";
import { FIELD_LABELS } from "@/types/idcard";

export default function VerticalClassic({ student, photo, mapping, design }: CardProps) {
  const name = (mapping.name && student.row[mapping.name]) || "Student Name";
  const fields = design.visibleFields.filter((f) => f !== "name" && f !== "address");
  const addr = mapping.address ? student.row[mapping.address] : "";

  return (
    <div
      className="relative bg-white rounded-md overflow-hidden border shadow-sm"
      style={{ width: 216, height: 344, color: "#111" }}
    >
      {/* corner accents */}
      <div
        className="absolute -top-12 -right-10 rounded-full"
        style={{ width: 110, height: 110, background: design.accentColor, opacity: 0.18 }}
      />
      <div
        className="absolute -top-7 -left-7 rounded-full"
        style={{ width: 60, height: 60, background: design.accentColor }}
      />

      {design.logoDataUrl && (
        <img
          src={design.logoDataUrl}
          alt=""
          className="absolute top-2 left-2 h-8 w-8 object-contain"
        />
      )}

      {/* photo */}
      <div className="relative pt-12 flex flex-col items-center">
        <div
          className="bg-white p-1 shadow-sm"
          style={{ borderColor: design.accentColor }}
        >
          <div
            className="overflow-hidden border-2"
            style={{ borderColor: design.accentColor, width: 96, height: 112 }}
          >
            {photo ? (
              <img src={photo.dataUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50">
                No photo
              </div>
            )}
          </div>
        </div>
        <div
          className="text-[13px] font-bold uppercase tracking-wide mt-2 px-3 truncate max-w-full text-center"
          style={{ color: "#111" }}
        >
          {name}
        </div>
        <div className="text-[7.5px] tracking-[0.18em]" style={{ color: design.accentColor }}>
          STUDENT IDENTITY CARD
        </div>
      </div>

      {/* dashed divider */}
      <div
        className="mx-3 mt-1 border-t border-dashed"
        style={{ borderColor: design.accentColor }}
      />

      {/* fields */}
      <div className="px-3 mt-2 space-y-[3px]">
        {fields.map((f) => {
          const col = mapping[f];
          if (!col) return null;
          const v = student.row[col];
          if (!v) return null;
          return (
            <div key={f} className="flex items-center justify-between gap-2 text-[8.5px]">
              <div className="flex items-center gap-1.5 text-gray-500 min-w-0">
                <span className="inline-block" style={{ width: 4, height: 4, background: design.accentColor }} />
                <span className="truncate">{FIELD_LABELS[f]}</span>
              </div>
              <span className="font-semibold truncate max-w-[110px] text-right">{v}</span>
            </div>
          );
        })}
        {addr && design.visibleFields.includes("address") && (
          <div className="text-[7.5px] pt-1 leading-tight">
            <div className="text-gray-500 uppercase tracking-wide" style={{ fontSize: 6.5 }}>Address</div>
            <div className="line-clamp-2">{addr}</div>
          </div>
        )}
      </div>

      {/* footer band */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-white"
        style={{ background: design.accentColor }}
      >
        <div className="text-[8px] font-bold uppercase truncate text-center">{design.schoolName}</div>
        <div className="text-[6.5px] opacity-90 truncate text-center">
          {[design.contactPhone, design.contactEmail].filter(Boolean).join("  ·  ")}
        </div>
      </div>
    </div>
  );
}
