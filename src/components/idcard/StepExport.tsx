import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { useIdStore } from "@/lib/idcard-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import CardPreview from "./CardPreview";
import { CARD_DIMS, drawCard, drawCropMarks } from "@/lib/cardDraw";

export default function StepExport() {
  const { students, photos, mapping, design, setStep } = useIdStore();
  const [busy, setBusy] = useState(false);
  const [cutGuides, setCutGuides] = useState(true);

  const photoMap = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);
  const dims = { w: design.customWidth, h: design.customHeight };

  const generatePdf = async () => {
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const cardW = dims.w;
      const cardH = dims.h;
      const cols = Math.max(1, Math.floor((pageW - 8) / (cardW + 4)));
      const rows = Math.max(1, Math.floor((pageH - 8) / (cardH + 4)));
      const gapX = (pageW - cols * cardW) / (cols + 1);
      const gapY = (pageH - rows * cardH) / (rows + 1);
      const perPage = cols * rows;

      for (let i = 0; i < students.length; i++) {
        if (i > 0 && i % perPage === 0) doc.addPage();
        const idxOnPage = i % perPage;
        const col = idxOnPage % cols;
        const row = Math.floor(idxOnPage / cols);
        const x = gapX + col * (cardW + gapX);
        const y = gapY + row * (cardH + gapY);

        const s = students[i];
        const photo = s.photoId ? photoMap[s.photoId] : null;
        drawCard({ doc, x, y, student: s, photo, mapping, design });
        if (cutGuides) drawCropMarks(doc, x, y, cardW, cardH);
      }

      doc.save(`id-cards-${Date.now()}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const perPagePreview = Math.max(
    1,
    Math.floor((210 - 8) / (dims.w + 4)) * Math.floor((297 - 8) / (dims.h + 4)),
  );
  const sample = students.slice(0, Math.min(6, students.length));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Preview & download</h2>
        <p className="text-muted-foreground mt-1">
          {students.length} cards · {dims.w}×{dims.h}mm · ~{perPagePreview} per A4 page.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
        <Checkbox checked={cutGuides} onCheckedChange={(v) => setCutGuides(Boolean(v))} />
        Include cut guides for trimming
      </label>

      <div className="bg-muted/40 rounded-lg p-6 border">
        <div className="flex flex-wrap gap-5 justify-center">
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
