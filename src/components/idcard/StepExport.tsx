import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { useIdStore } from "@/lib/idcard-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import CardPreview from "./CardPreview";
import { FIELD_LABELS, type FieldKey } from "@/types/idcard";

const visibleFields: FieldKey[] = ["rollNo", "class", "section", "dob", "bloodGroup", "fatherName"];

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function StepExport() {
  const { students, photos, mapping, design, setStep } = useIdStore();
  const [busy, setBusy] = useState(false);

  const photoMap = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);

  const generatePdf = async () => {
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const cardW = 54; // mm (CR-80-ish)
      const cardH = 86;
      const cols = 3;
      const rows = 3;
      const gapX = (pageW - cols * cardW) / (cols + 1);
      const gapY = (pageH - rows * cardH) / (rows + 1);
      const perPage = cols * rows;
      const [r, g, b] = hexToRgb(design.accentColor);

      for (let i = 0; i < students.length; i++) {
        if (i > 0 && i % perPage === 0) doc.addPage();
        const idxOnPage = i % perPage;
        const col = idxOnPage % cols;
        const row = Math.floor(idxOnPage / cols);
        const x = gapX + col * (cardW + gapX);
        const y = gapY + row * (cardH + gapY);

        // Card border
        doc.setDrawColor(220);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "S");

        // Header band
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, cardW, 14, 2, 2, "F");
        doc.rect(x, y + 7, cardW, 7, "F");

        let textX = x + 3;
        if (design.logoDataUrl) {
          try {
            doc.addImage(design.logoDataUrl, "PNG", x + 2, y + 2, 10, 10);
            textX = x + 14;
          } catch { /* ignore */ }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(design.schoolName.toUpperCase(), textX, y + 6, { maxWidth: cardW - (textX - x) - 2 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.text(design.schoolSubtitle, textX, y + 10, { maxWidth: cardW - (textX - x) - 2 });

        // Photo
        const s = students[i];
        const photo = s.photoId ? photoMap[s.photoId] : null;
        const photoSize = 26;
        const px = x + (cardW - photoSize) / 2;
        const py = y + 18;
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.6);
        doc.rect(px, py, photoSize, photoSize, "S");
        if (photo) {
          try {
            doc.addImage(photo.dataUrl, "JPEG", px, py, photoSize, photoSize);
          } catch { /* ignore */ }
        } else {
          doc.setFontSize(5);
          doc.setTextColor(150);
          doc.text("No photo", px + photoSize / 2, py + photoSize / 2, { align: "center" });
        }

        // Name
        const name = mapping.name ? s.row[mapping.name] : "";
        doc.setTextColor(20, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(name || "—", x + cardW / 2, py + photoSize + 5, { align: "center", maxWidth: cardW - 4 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(120);
        doc.text("STUDENT ID CARD", x + cardW / 2, py + photoSize + 8.5, { align: "center" });

        // Fields
        let fy = py + photoSize + 13;
        doc.setFontSize(6.5);
        for (const f of visibleFields) {
          const col2 = mapping[f];
          if (!col2) continue;
          const v = s.row[col2];
          if (!v) continue;
          doc.setTextColor(130);
          doc.text(FIELD_LABELS[f], x + 3, fy);
          doc.setTextColor(30);
          doc.text(String(v), x + cardW - 3, fy, { align: "right", maxWidth: cardW / 2 });
          fy += 3.4;
          if (fy > y + cardH - 3) break;
        }
      }

      doc.save(`id-cards-${Date.now()}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const sample = students.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Preview & download</h2>
        <p className="text-muted-foreground mt-1">
          {students.length} cards will be generated · 9 per A4 page.
        </p>
      </div>

      <div className="bg-muted/40 rounded-lg p-6 border">
        <div className="flex flex-wrap gap-4 justify-center">
          {sample.map((s) => (
            <CardPreview
              key={s.id}
              student={s}
              photo={s.photoId ? photoMap[s.photoId] : null}
              mapping={mapping}
              design={design}
            />
          ))}
        </div>
        {students.length > sample.length && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Showing first {sample.length} of {students.length} cards.
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(3)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={generatePdf} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      </div>
    </div>
  );
}
