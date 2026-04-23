import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { useIdStore } from "@/lib/idcard-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import CardPreview from "./CardPreview";
import { drawCard, drawCropMarks, drawCutGridLines, withRotatedCard, prewarmImageCache } from "@/lib/cardDraw";

type PageSizeKey = "a4" | "a4-landscape" | "letter" | "a3";
type CutStyle = "none" | "corners" | "grid";

const PAGE_DIMS: Record<PageSizeKey, { w: number; h: number; format: string; orientation: "portrait" | "landscape" }> = {
  a4: { w: 210, h: 297, format: "a4", orientation: "portrait" },
  "a4-landscape": { w: 297, h: 210, format: "a4", orientation: "landscape" },
  letter: { w: 216, h: 279, format: "letter", orientation: "portrait" },
  a3: { w: 297, h: 420, format: "a3", orientation: "portrait" },
};

function computeFit(pageW: number, pageH: number, cardW: number, cardH: number, margin: number, gap: number) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  const cols = Math.max(0, Math.floor((usableW + gap) / (cardW + gap)));
  const rows = Math.max(0, Math.floor((usableH + gap) / (cardH + gap)));
  return { cols, rows, total: cols * rows };
}

export default function StepExport() {
  const { students, photos, mapping, design, setStep } = useIdStore();
  const [busy, setBusy] = useState(false);

  const [pageSize, setPageSize] = useState<PageSizeKey>("a4");
  const [margin, setMargin] = useState(5);
  const [gap, setGap] = useState(2);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cutStyle, setCutStyle] = useState<CutStyle>("corners");
  const [duplicateN, setDuplicateN] = useState(1);

  const photoMap = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);
  const cardW = design.customWidth;
  const cardH = design.customHeight;
  const page = PAGE_DIMS[pageSize];

  const layout = useMemo(() => {
    const a = computeFit(page.w, page.h, cardW, cardH, margin, gap);
    const b = computeFit(page.w, page.h, cardH, cardW, margin, gap);
    if (autoRotate && b.total > a.total) {
      return { ...b, rotated: true, drawW: cardH, drawH: cardW };
    }
    return { ...a, rotated: false, drawW: cardW, drawH: cardH };
  }, [page, cardW, cardH, margin, gap, autoRotate]);

  const totalCards = students.length * Math.max(1, duplicateN);
  const totalPages = layout.total > 0 ? Math.ceil(totalCards / layout.total) : 0;

  const generatePdf = async () => {
    if (layout.total === 0) return;
    setBusy(true);
    try {
      // Pre-convert all design + photo images to PDF-safe PNGs once.
      await prewarmImageCache([
        design.logoDataUrl,
        design.signatureDataUrl,
        design.customBgDataUrl,
        ...photos.map((p) => p.dataUrl),
      ]);
      const doc = new jsPDF({ unit: "mm", format: page.format, orientation: page.orientation });
      const { cols, rows, drawW, drawH, rotated } = layout;
      const usableW = page.w - 2 * margin;
      const usableH = page.h - 2 * margin;
      const offsetX = margin + (usableW - (cols * drawW + (cols - 1) * gap)) / 2;
      const offsetY = margin + (usableH - (rows * drawH + (rows - 1) * gap)) / 2;
      const perPage = cols * rows;

      // Build the print queue (with optional duplicates)
      const queue: typeof students = [];
      for (const s of students) {
        for (let k = 0; k < Math.max(1, duplicateN); k++) queue.push(s);
      }

      for (let i = 0; i < queue.length; i++) {
        if (i > 0 && i % perPage === 0) {
          doc.addPage(page.format, page.orientation);
          if (cutStyle === "grid") {
            drawCutGridLines(doc, offsetX, offsetY, gap, cols, rows, drawW, drawH, page.w, page.h);
          }
        } else if (i === 0 && cutStyle === "grid") {
          drawCutGridLines(doc, offsetX, offsetY, gap, cols, rows, drawW, drawH, page.w, page.h);
        }

        const idxOnPage = i % perPage;
        const col = idxOnPage % cols;
        const row = Math.floor(idxOnPage / cols);
        const x = offsetX + col * (drawW + gap);
        const y = offsetY + row * (drawH + gap);

        const s = queue[i];
        const photo = s.photoId ? photoMap[s.photoId] : null;

        if (rotated) {
          withRotatedCard(doc, x, y, drawW, drawH, (nx, ny) => {
            drawCard({ doc, x: nx, y: ny, student: s, photo, mapping, design });
          });
        } else {
          drawCard({ doc, x, y, student: s, photo, mapping, design });
        }
        if (cutStyle === "corners") drawCropMarks(doc, x, y, drawW, drawH);
      }

      doc.save(`id-cards-${Date.now()}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const sample = students.slice(0, Math.min(6, students.length));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Preview & download</h2>
        <p className="text-muted-foreground mt-1">
          {students.length} cards · {cardW}×{cardH}mm · {layout.cols}×{layout.rows} ={" "}
          <span className="font-medium text-foreground">{layout.total} per page</span> · {totalPages} page
          {totalPages !== 1 ? "s" : ""}
          {layout.rotated && <span className="ml-1 text-primary">(rotated 90°)</span>}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Settings panel */}
        <div className="space-y-5 rounded-lg border bg-card p-5">
          <h3 className="font-medium">Sheet layout</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page size</label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSizeKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 Portrait (210×297)</SelectItem>
                  <SelectItem value="a4-landscape">A4 Landscape (297×210)</SelectItem>
                  <SelectItem value="letter">Letter (216×279)</SelectItem>
                  <SelectItem value="a3">A3 (297×420)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cut guides</label>
              <Select value={cutStyle} onValueChange={(v) => setCutStyle(v as CutStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="corners">Corner crop marks</SelectItem>
                  <SelectItem value="grid">Full cut lines (grid)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Page margin</label>
              <span className="text-xs text-muted-foreground">{margin} mm</span>
            </div>
            <Slider min={3} max={15} step={1} value={[margin]} onValueChange={(v) => setMargin(v[0])} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Gap between cards</label>
              <span className="text-xs text-muted-foreground">{gap} mm</span>
            </div>
            <Slider min={0} max={6} step={1} value={[gap]} onValueChange={(v) => setGap(v[0])} />
          </div>

          <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
            <div>
              <div className="font-medium">Auto-rotate cards</div>
              <div className="text-xs text-muted-foreground">Rotate 90° if it fits more per page</div>
            </div>
            <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Copies per student</label>
              <span className="text-xs text-muted-foreground">×{duplicateN}</span>
            </div>
            <Slider min={1} max={10} step={1} value={[duplicateN]} onValueChange={(v) => setDuplicateN(v[0])} />
          </div>
        </div>

        {/* Live mini-preview */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Sheet preview</div>
          <div
            className="relative mx-auto rounded-md border bg-background shadow-sm"
            style={{
              width: "100%",
              maxWidth: 260,
              aspectRatio: `${page.w} / ${page.h}`,
            }}
          >
            {Array.from({ length: layout.rows }).flatMap((_, r) =>
              Array.from({ length: layout.cols }).map((__, c) => {
                const usableW = page.w - 2 * margin;
                const usableH = page.h - 2 * margin;
                const offsetX = margin + (usableW - (layout.cols * layout.drawW + (layout.cols - 1) * gap)) / 2;
                const offsetY = margin + (usableH - (layout.rows * layout.drawH + (layout.rows - 1) * gap)) / 2;
                const x = offsetX + c * (layout.drawW + gap);
                const y = offsetY + r * (layout.drawH + gap);
                return (
                  <div
                    key={`${r}-${c}`}
                    className="absolute rounded-sm bg-primary/15 border border-primary/40"
                    style={{
                      left: `${(x / page.w) * 100}%`,
                      top: `${(y / page.h) * 100}%`,
                      width: `${(layout.drawW / page.w) * 100}%`,
                      height: `${(layout.drawH / page.h) * 100}%`,
                    }}
                  />
                );
              }),
            )}
            {layout.total === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-destructive p-3 text-center">
                Card too large — reduce margin or change page size.
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {layout.total} cards/page · {totalPages} pages · {totalCards} total
          </p>
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg p-6 border">
        <div className="text-sm font-medium mb-4">Card preview</div>
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
        <Button onClick={generatePdf} disabled={busy || layout.total === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      </div>
    </div>
  );
}
