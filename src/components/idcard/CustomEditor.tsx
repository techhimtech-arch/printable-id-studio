import { useRef, useState, useEffect } from "react";
import { useIdStore } from "@/lib/idcard-store";
import type { CustomElement, FieldKey } from "@/types/idcard";
import { FIELD_LABELS } from "@/types/idcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Image as ImageIcon, Type, User, Plus, AlignLeft, AlignCenter, AlignRight, Bold, Italic, X, Minus, Square, QrCode, SeparatorHorizontal, Eraser, Wand2, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DATE_FORMAT_OPTIONS, formatDate } from "@/lib/format-date";
import { eraseRectsFromImage } from "@/lib/bg-eraser";
import { fitImageToCard } from "@/lib/bg-fit";
import { toast } from "sonner";

/** On-screen scale for the editor — larger than preview so dragging is precise. */
const PX_PER_MM_NORMAL = 6;
const PX_PER_MM_FULL = 9;

export default function CustomEditor() {
  const { design, setDesign, addCustomElement, updateCustomElement, removeCustomElement, students, photos, mapping } =
    useIdStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<
    | null
    | {
        id: string;
        mode: "move" | "resize";
        startX: number;
        startY: number;
        elStartX: number;
        elStartY: number;
        elStartW: number;
        elStartH: number;
      }
  >(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [eraseDraw, setEraseDraw] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const eraseStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalBgRef = useRef<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const PX_PER_MM = fullscreen ? PX_PER_MM_FULL : PX_PER_MM_NORMAL;

  // Lock body scroll while fullscreen so the editor truly takes over the viewport
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  /** Snap threshold in mm. */
  const SNAP_MM = 1.2;
  /** Grid step in mm. */
  const GRID_MM = 2;

  const canvasRef = useRef<HTMLDivElement>(null);

  const W = design.customWidth * PX_PER_MM;
  const H = design.customHeight * PX_PER_MM;

  const sample = students[0];
  const samplePhoto = sample?.photoId ? photos.find((p) => p.id === sample.photoId) : photos[0];
  const mappedFieldKeys = (Object.keys(FIELD_LABELS) as FieldKey[]).filter((f) => mapping[f]);

  const onBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8 MB) — please compress or export at lower DPI");
      e.target.value = "";
      return;
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast.error("Use PNG, JPG, or WebP — other formats won't render in PDF");
      e.target.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = async () => {
      const url = r.result as string;
      try {
        const fit = await fitImageToCard(url, design.customWidth, design.customHeight);
        originalBgRef.current = url;
        setDesign({ customBgDataUrl: fit.dataUrl });
        if (fit.padded) {
          toast.success(
            `Background fit to ${design.customWidth}×${design.customHeight}mm — white padding added so fields align exactly in PDF`,
          );
        } else {
          toast.success("Background uploaded — aspect ratio matches card");
        }
      } catch {
        // Fallback: use raw image (preview will object-cover crop)
        originalBgRef.current = url;
        setDesign({ customBgDataUrl: url });
        toast.message("Background uploaded (could not auto-fit)");
      }
    };
    r.readAsDataURL(file);
  };

  /** Re-fit the original background whenever the card dimensions change. */
  useEffect(() => {
    const orig = originalBgRef.current;
    if (!orig) return;
    let cancelled = false;
    fitImageToCard(orig, design.customWidth, design.customHeight)
      .then((fit) => {
        if (!cancelled) setDesign({ customBgDataUrl: fit.dataUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.customWidth, design.customHeight]);

  const resetBackground = async () => {
    if (!originalBgRef.current) {
      toast.message("No original background to restore");
      return;
    }
    try {
      const fit = await fitImageToCard(originalBgRef.current, design.customWidth, design.customHeight);
      setDesign({ customBgDataUrl: fit.dataUrl });
    } catch {
      setDesign({ customBgDataUrl: originalBgRef.current });
    }
    toast.success("Background restored");
  };

  /** Auto-add elements for every mapped Excel field (left column stack + photo). */
  const autoAddAllFields = () => {
    if (mappedFieldKeys.length === 0) {
      toast.error("No fields mapped — go to Step 2 first");
      return;
    }
    const cw = design.customWidth;
    const ch = design.customHeight;
    const hasPhoto = photos.length > 0 || students.some((s) => s.photoId);
    const photoW = 24;
    const photoH = 28;
    // Stack fields on left, photo on top-right.
    const startX = 4;
    const startY = 4;
    const rowH = 6;
    const gap = 1;
    let y = startY;
    let count = 0;

    // name first if mapped
    const ordered: FieldKey[] = [
      ...(mappedFieldKeys.includes("name") ? (["name"] as FieldKey[]) : []),
      ...mappedFieldKeys.filter((f) => f !== "name"),
    ];

    for (const f of ordered) {
      if (y + rowH > ch - 4) break;
      const isName = f === "name";
      addElement({
        kind: "field",
        field: f,
        x: startX,
        y,
        w: Math.min(cw - startX * 2, 46),
        h: rowH,
        fontSize: isName ? 11 : 8,
        bold: isName,
        labelPrefix: isName ? "" : `${FIELD_LABELS[f]}: `,
      });
      y += rowH + gap;
      count++;
    }

    if (hasPhoto) {
      // Photo box on top-right
      addElement({
        kind: "photo",
        x: Math.max(0, cw - photoW - 4),
        y: 4,
        w: photoW,
        h: photoH,
      });
      count++;
    }

    toast.success(`Added ${count} element${count === 1 ? "" : "s"} — drag karke arrange karo`);
  };

  /** Handle eraser drag over the canvas. Coordinates are mm relative to the card. */
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (!eraseMode) {
      setSelectedId(null);
      return;
    }
    if (!design.customBgDataUrl) {
      toast.error("Upload a background image first");
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / PX_PER_MM;
    const y = (e.clientY - rect.top) / PX_PER_MM;
    eraseStartRef.current = { x, y };
    setEraseDraw({ x, y, w: 0, h: 0 });
  };

  useEffect(() => {
    if (!eraseMode || !eraseStartRef.current) return;
    const move = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const start = eraseStartRef.current;
      if (!rect || !start) return;
      const cx = (e.clientX - rect.left) / PX_PER_MM;
      const cy = (e.clientY - rect.top) / PX_PER_MM;
      const x = Math.min(start.x, cx);
      const y = Math.min(start.y, cy);
      const w = Math.abs(cx - start.x);
      const h = Math.abs(cy - start.y);
      setEraseDraw({ x, y, w, h });
    };
    const up = async () => {
      const r = eraseDraw;
      eraseStartRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (!r || r.w < 1 || r.h < 1) {
        setEraseDraw(null);
        return;
      }
      try {
        const bg = design.customBgDataUrl;
        if (!bg) return;
        if (!originalBgRef.current) originalBgRef.current = bg;
        const next = await eraseRectsFromImage(bg, [r], design.customWidth, design.customHeight);
        setDesign({ customBgDataUrl: next });
      } catch {
        toast.error("Erase failed");
      } finally {
        setEraseDraw(null);
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [eraseMode, eraseDraw, design.customBgDataUrl, design.customWidth, design.customHeight, setDesign]);

  const addElement = (partial: Partial<CustomElement> & { kind: CustomElement["kind"] }) => {
    const k = partial.kind;
    const isShape = k === "line" || k === "rect" || k === "divider" || k === "qr";
    const el: CustomElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: k,
      field: partial.field,
      text: partial.text ?? (k === "divider" ? "INFO" : ""),
      labelPrefix: partial.labelPrefix ?? "",
      dateFormat: partial.dateFormat,
      x: partial.x ?? design.customWidth / 2 - 10,
      y: partial.y ?? design.customHeight / 2 - 5,
      w: partial.w ?? (k === "photo" ? 24 : k === "qr" ? 14 : k === "line" ? 30 : k === "rect" ? 30 : 30),
      h: partial.h ?? (k === "photo" ? 28 : k === "qr" ? 14 : k === "line" ? 0.6 : k === "rect" ? 12 : k === "divider" ? 4 : 5),
      fontSize: partial.fontSize ?? (k === "divider" ? 6 : 9),
      fontFamily: partial.fontFamily ?? "helvetica",
      bold: partial.bold ?? (partial.field === "name"),
      italic: partial.italic ?? false,
      color: partial.color ?? "#111111",
      align: partial.align ?? "left",
      thickness: partial.thickness ?? (k === "line" || k === "divider" ? 0.4 : k === "rect" ? 0.3 : undefined),
      fillColor: partial.fillColor ?? (k === "rect" ? "none" : undefined),
      borderColor: partial.borderColor ?? (k === "rect" ? "#111111" : undefined),
      radius: partial.radius ?? (k === "rect" ? 1 : undefined),
      qrSourceField: partial.qrSourceField ?? (k === "qr" ? "admissionNo" : undefined),
    };
    addCustomElement(el);
    setSelectedId(el.id);
  };

  // Mouse drag handlers
  useEffect(() => {
    if (!drag) return;
    const others = design.customElements.filter((e) => e.id !== drag.id);
    const cw = design.customWidth;
    const ch = design.customHeight;

    /** Returns nearest snap target for a value `v` against candidates, plus the matched candidate. */
    const snap = (v: number, candidates: number[]) => {
      if (!snapEnabled) return { v, hit: null as number | null };
      let best = v;
      let hit: number | null = null;
      let bestDist = SNAP_MM;
      for (const c of candidates) {
        const d = Math.abs(v - c);
        if (d < bestDist) {
          bestDist = d;
          best = c;
          hit = c;
        }
      }
      // grid snap fallback
      if (hit === null && snapEnabled) {
        const g = Math.round(v / GRID_MM) * GRID_MM;
        if (Math.abs(v - g) < SNAP_MM / 2) best = g;
      }
      return { v: best, hit };
    };

    const move = (e: MouseEvent) => {
      const dx = (e.clientX - drag.startX) / PX_PER_MM;
      const dy = (e.clientY - drag.startY) / PX_PER_MM;

      // Build candidate guide lines from siblings + card edges/center
      const xCands = [0, cw / 2, cw];
      const yCands = [0, ch / 2, ch];
      for (const o of others) {
        xCands.push(o.x, o.x + o.w / 2, o.x + o.w);
        yCands.push(o.y, o.y + o.h / 2, o.y + o.h);
      }

      if (drag.mode === "move") {
        let nx = Math.max(0, Math.min(cw - drag.elStartW, drag.elStartX + dx));
        let ny = Math.max(0, Math.min(ch - drag.elStartH, drag.elStartY + dy));
        const w = drag.elStartW;
        const h = drag.elStartH;

        // try snapping left, center, right
        const sLeft = snap(nx, xCands);
        const sCenter = snap(nx + w / 2, xCands);
        const sRight = snap(nx + w, xCands);
        const vHits: number[] = [];
        // pick the closest of the three
        const xOpts = [
          { delta: sLeft.v - nx, hit: sLeft.hit },
          { delta: sCenter.v - (nx + w / 2), hit: sCenter.hit },
          { delta: sRight.v - (nx + w), hit: sRight.hit },
        ].filter((o) => o.hit !== null);
        if (xOpts.length) {
          xOpts.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
          nx += xOpts[0].delta;
          vHits.push(xOpts[0].hit as number);
        }

        const sTop = snap(ny, yCands);
        const sMid = snap(ny + h / 2, yCands);
        const sBot = snap(ny + h, yCands);
        const hHits: number[] = [];
        const yOpts = [
          { delta: sTop.v - ny, hit: sTop.hit },
          { delta: sMid.v - (ny + h / 2), hit: sMid.hit },
          { delta: sBot.v - (ny + h), hit: sBot.hit },
        ].filter((o) => o.hit !== null);
        if (yOpts.length) {
          yOpts.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
          ny += yOpts[0].delta;
          hHits.push(yOpts[0].hit as number);
        }

        nx = Math.max(0, Math.min(cw - w, nx));
        ny = Math.max(0, Math.min(ch - h, ny));
        setGuides({ v: vHits, h: hHits });
        updateCustomElement(drag.id, { x: nx, y: ny });
      } else {
        let nw = Math.max(4, Math.min(cw - drag.elStartX, drag.elStartW + dx));
        let nh = Math.max(3, Math.min(ch - drag.elStartY, drag.elStartH + dy));
        // snap right edge / bottom edge
        const sR = snap(drag.elStartX + nw, xCands);
        const sB = snap(drag.elStartY + nh, yCands);
        const vHits: number[] = [];
        const hHits: number[] = [];
        if (sR.hit !== null) {
          nw = sR.v - drag.elStartX;
          vHits.push(sR.hit);
        }
        if (sB.hit !== null) {
          nh = sB.v - drag.elStartY;
          hHits.push(sB.hit);
        }
        nw = Math.max(4, Math.min(cw - drag.elStartX, nw));
        nh = Math.max(3, Math.min(ch - drag.elStartY, nh));
        setGuides({ v: vHits, h: hHits });
        updateCustomElement(drag.id, { w: nw, h: nh });
      }
    };
    const up = () => {
      setDrag(null);
      setGuides({ v: [], h: [] });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag, design.customWidth, design.customHeight, design.customElements, snapEnabled, updateCustomElement]);

  const startDrag = (
    e: React.MouseEvent,
    id: string,
    mode: "move" | "resize",
    el: CustomElement,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(id);
    setDrag({
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      elStartX: el.x,
      elStartY: el.y,
      elStartW: el.w,
      elStartH: el.h,
    });
  };

  const renderElValue = (el: CustomElement) => {
    if (el.kind === "text") return el.text || "Text";
    if (el.kind === "field") {
      const col = el.field ? mapping[el.field] : null;
      let v = col && sample ? sample.row[col] : "";
      if (el.field === "dob" && v) {
        v = formatDate(String(v), el.dateFormat || design.dateFormat);
      }
      const fallback = el.field ? FIELD_LABELS[el.field] : "Field";
      return (el.labelPrefix || "") + (v || `[${fallback}]`);
    }
    return "";
  };

  const selected = design.customElements.find((e) => e.id === selectedId) || null;

  return (
    <div className="space-y-4">
      {/* Card size + background */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="space-y-1.5">
          <Label className="text-xs">Card width (mm)</Label>
          <Input
            type="number"
            min={30}
            max={150}
            value={design.customWidth}
            onChange={(e) => setDesign({ customWidth: Math.max(30, Math.min(150, Number(e.target.value) || 54)) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Card height (mm)</Label>
          <Input
            type="number"
            min={30}
            max={150}
            value={design.customHeight}
            onChange={(e) => setDesign({ customHeight: Math.max(30, Math.min(150, Number(e.target.value) || 86)) })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Background image (Photoshop / Canva design)</Label>
          <div className="flex gap-2 items-center">
            <Input type="file" accept="image/*" onChange={onBgUpload} className="text-xs" />
            {design.customBgDataUrl && (
              <Button variant="ghost" size="sm" onClick={() => setDesign({ customBgDataUrl: null })}>
                <X className="h-3 w-3" /> Remove
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label className="text-xs">Date format (applies to Date of Birth)</Label>
          <Select
            value={design.dateFormat}
            onValueChange={(v) => setDesign({ dateFormat: v as any })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}{o.value !== "asis" ? ` — ${o.sample}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Add element toolbar */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/30 rounded-lg border">
        <span className="text-xs font-medium text-muted-foreground mr-1">Add:</span>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "photo", w: 24, h: 28 })}>
          <User className="h-3.5 w-3.5" /> Photo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            addElement({ kind: "field", field: "name", fontSize: 11, bold: true, w: 40, h: 6 })
          }
        >
          <Type className="h-3.5 w-3.5" /> Name
        </Button>
        <Select onValueChange={(v) => addElement({ kind: "field", field: v as FieldKey })}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder={mappedFieldKeys.length === 0 ? "No mapped fields" : "+ Field"} />
          </SelectTrigger>
          <SelectContent>
            {mappedFieldKeys.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground max-w-[220px]">
                No fields mapped yet — go to Step 2: Map columns to add fields.
              </div>
            ) : (
              mappedFieldKeys.map((f) => (
                <SelectItem key={f} value={f}>
                  {FIELD_LABELS[f]}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            addElement({
              kind: "text",
              text: design.principalName || "Principal",
              fontSize: 6,
              align: "center",
              w: 24,
              h: 4,
            })
          }
          title="Add principal label"
        >
          <Type className="h-3.5 w-3.5" /> Principal
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "text", text: "ID CARD" })}>
          <Plus className="h-3.5 w-3.5" /> Text
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "logo", w: 12, h: 12 })}>
          <ImageIcon className="h-3.5 w-3.5" /> Logo
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "signature", w: 24, h: 8 })}>
          <ImageIcon className="h-3.5 w-3.5" /> Signature
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "line", w: 30, h: 0.6 })} title="Horizontal/vertical line">
          <Minus className="h-3.5 w-3.5" /> Line
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "rect", w: 30, h: 12 })} title="Rectangle / box">
          <Square className="h-3.5 w-3.5" /> Box
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "divider", text: "INFO", w: 40, h: 4 })} title="Line with label in middle">
          <SeparatorHorizontal className="h-3.5 w-3.5" /> Divider
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "qr", w: 14, h: 14 })} title="QR code">
          <QrCode className="h-3.5 w-3.5" /> QR
        </Button>
        <div className="ml-auto flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={autoAddAllFields}
            disabled={mappedFieldKeys.length === 0}
            title={mappedFieldKeys.length === 0 ? "Map fields in Step 2 first" : "Add all mapped Excel fields at once"}
          >
            <Wand2 className="h-3.5 w-3.5" /> Auto-add fields
          </Button>
          <Button
            size="sm"
            variant={eraseMode ? "default" : "outline"}
            onClick={() => setEraseMode((s) => !s)}
            disabled={!design.customBgDataUrl}
            title="Drag on the card to white-out areas of the background"
          >
            <Eraser className="h-3.5 w-3.5" /> Erase
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetBackground}
            disabled={!originalBgRef.current}
            title="Restore original uploaded background"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset BG
          </Button>
          <Button
            size="sm"
            variant={snapEnabled ? "default" : "outline"}
            onClick={() => setSnapEnabled((s) => !s)}
            title="Snap to edges, centers and other elements"
          >
            Snap
          </Button>
          <Button
            size="sm"
            variant={showGrid ? "default" : "outline"}
            onClick={() => setShowGrid((s) => !s)}
            title="Show 2mm grid"
          >
            Grid
          </Button>
        </div>
      </div>

      {eraseMode && (
        <div className="text-xs px-3 py-2 bg-destructive/10 border border-destructive/30 rounded text-destructive">
          Erase mode ON — drag on the card to white-out areas (e.g. old name/photo placeholders). Click <strong>Erase</strong> again to exit.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Canvas */}
        <div className="bg-muted/40 rounded-lg p-6 border overflow-auto flex items-start justify-center">
          <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            className={cn("relative bg-white shadow-md select-none", eraseMode && "cursor-crosshair")}
            style={{
              width: W,
              height: H,
              backgroundImage: design.customBgDataUrl
                ? `url(${design.customBgDataUrl})`
                : showGrid
                ? `linear-gradient(to right, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`
                : undefined,
              backgroundSize: design.customBgDataUrl ? "cover" : `${GRID_MM * PX_PER_MM}px ${GRID_MM * PX_PER_MM}px`,
              backgroundPosition: "center",
            }}
          >
            {eraseDraw && (
              <div
                className="absolute pointer-events-none border-2 border-destructive bg-destructive/20"
                style={{
                  left: eraseDraw.x * PX_PER_MM,
                  top: eraseDraw.y * PX_PER_MM,
                  width: eraseDraw.w * PX_PER_MM,
                  height: eraseDraw.h * PX_PER_MM,
                }}
              />
            )}
            {eraseMode && (
              <div className="absolute inset-0 z-10" />
            )}
            {guides.v.map((x, i) => (
              <div
                key={`gv-${i}`}
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: x * PX_PER_MM, width: 1, background: "hsl(var(--primary))" }}
              />
            ))}
            {guides.h.map((y, i) => (
              <div
                key={`gh-${i}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top: y * PX_PER_MM, height: 1, background: "hsl(var(--primary))" }}
              />
            ))}
            {design.customElements.map((el) => {
              const isSel = el.id === selectedId;
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => startDrag(e, el.id, "move", el)}
                  className={cn(
                    "absolute cursor-move overflow-hidden",
                    isSel ? "ring-2 ring-primary" : "ring-1 ring-dashed ring-muted-foreground/30 hover:ring-primary/50",
                  )}
                  style={{
                    left: el.x * PX_PER_MM,
                    top: el.y * PX_PER_MM,
                    width: el.w * PX_PER_MM,
                    height: el.h * PX_PER_MM,
                  }}
                >
                  {el.kind === "photo" ? (
                    samplePhoto ? (
                      <img src={samplePhoto.dataUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <div className="w-full h-full bg-muted/60 flex items-center justify-center text-[10px] text-muted-foreground">
                        Photo
                      </div>
                    )
                  ) : el.kind === "logo" ? (
                    design.logoDataUrl ? (
                      <img src={design.logoDataUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                    ) : (
                      <div className="w-full h-full bg-muted/40 flex items-center justify-center text-[9px] text-muted-foreground">
                        Logo
                      </div>
                    )
                  ) : el.kind === "signature" ? (
                    design.signatureDataUrl ? (
                      <img src={design.signatureDataUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                    ) : (
                      <div className="w-full h-full bg-muted/40 flex items-center justify-center text-[9px] text-muted-foreground">
                        Signature
                      </div>
                    )
                  ) : el.kind === "line" ? (
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <div
                        style={
                          el.h > el.w
                            ? { width: Math.max(1, (el.thickness ?? 0.4) * PX_PER_MM), height: "100%", background: el.color }
                            : { height: Math.max(1, (el.thickness ?? 0.4) * PX_PER_MM), width: "100%", background: el.color }
                        }
                      />
                    </div>
                  ) : el.kind === "rect" ? (
                    <div
                      className="w-full h-full pointer-events-none"
                      style={{
                        background: el.fillColor && el.fillColor !== "none" ? el.fillColor : "transparent",
                        border:
                          el.borderColor && el.borderColor !== "none"
                            ? `${Math.max(1, (el.thickness ?? 0.3) * PX_PER_MM)}px solid ${el.borderColor}`
                            : "none",
                        borderRadius: (el.radius ?? 0) * PX_PER_MM,
                      }}
                    />
                  ) : el.kind === "divider" ? (
                    <div
                      className="w-full h-full flex items-center pointer-events-none"
                      style={{
                        color: el.color,
                        fontSize: el.fontSize * 1.2,
                        fontFamily:
                          el.fontFamily === "times" ? "Georgia, serif" : el.fontFamily === "courier" ? "monospace" : "Helvetica, Arial, sans-serif",
                        fontWeight: el.bold ? 700 : 400,
                        gap: 4,
                      }}
                    >
                      <div style={{ flex: 1, height: Math.max(1, (el.thickness ?? 0.3) * PX_PER_MM), background: el.color }} />
                      {el.text && <span className="px-1 whitespace-nowrap">{el.text}</span>}
                      <div style={{ flex: 1, height: Math.max(1, (el.thickness ?? 0.3) * PX_PER_MM), background: el.color }} />
                    </div>
                  ) : el.kind === "qr" ? (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center pointer-events-none text-[8px] text-muted-foreground border border-dashed">
                      QR
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center px-1 pointer-events-none"
                      style={{
                        fontSize: el.fontSize * 1.2,
                        fontFamily:
                          el.fontFamily === "times"
                            ? "Georgia, serif"
                            : el.fontFamily === "courier"
                            ? "monospace"
                            : "Helvetica, Arial, sans-serif",
                        fontWeight: el.bold ? 700 : 400,
                        fontStyle: el.italic ? "italic" : "normal",
                        color: el.color,
                        justifyContent:
                          el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
                        lineHeight: 1.1,
                      }}
                    >
                      <span className="truncate">{renderElValue(el)}</span>
                    </div>
                  )}
                  {isSel && (
                    <div
                      onMouseDown={(e) => startDrag(e, el.id, "resize", el)}
                      className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspector */}
        <div className="bg-card border rounded-lg p-4 space-y-3 h-fit">
          {!selected ? (
            <div className="text-xs text-muted-foreground">
              Click any element on the card to edit its style. Drag to move, drag corner to resize.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium capitalize">
                  {selected.kind === "field" ? FIELD_LABELS[selected.field as FieldKey] || "Field" : selected.kind}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { removeCustomElement(selected.id); setSelectedId(null); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              {(selected.kind === "text" || selected.kind === "divider") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{selected.kind === "divider" ? "Label (optional)" : "Text"}</Label>
                  <Input
                    value={selected.text || ""}
                    onChange={(e) => updateCustomElement(selected.id, { text: e.target.value })}
                  />
                </div>
              )}
              {selected.kind === "field" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={selected.field}
                      onValueChange={(v) => updateCustomElement(selected.id, { field: v as FieldKey })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        {mappedFieldKeys.map((f) => (
                          <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label prefix (optional)</Label>
                    <Input
                      placeholder="e.g. Roll No: "
                      value={selected.labelPrefix || ""}
                      onChange={(e) => updateCustomElement(selected.id, { labelPrefix: e.target.value })}
                    />
                  </div>
                  {selected.field === "dob" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date format (this field)</Label>
                      <Select
                        value={selected.dateFormat || design.dateFormat}
                        onValueChange={(v) => updateCustomElement(selected.id, { dateFormat: v as any })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {selected.kind === "qr" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Encode field</Label>
                  <Select
                    value={selected.qrSourceField || "admissionNo"}
                    onValueChange={(v) => updateCustomElement(selected.id, { qrSourceField: v as FieldKey })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mappedFieldKeys.map((f) => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">QR will scan to this field's value for each student.</p>
                </div>
              )}

              {(selected.kind === "line" || selected.kind === "divider" || selected.kind === "rect") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Thickness: {(selected.thickness ?? 0.4).toFixed(2)} mm</Label>
                  <Slider
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={[selected.thickness ?? 0.4]}
                    onValueChange={([v]) => updateCustomElement(selected.id, { thickness: v })}
                  />
                </div>
              )}

              {selected.kind === "rect" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Corner radius: {(selected.radius ?? 0).toFixed(1)} mm</Label>
                    <Slider
                      min={0}
                      max={10}
                      step={0.5}
                      value={[selected.radius ?? 0]}
                      onValueChange={([v]) => updateCustomElement(selected.id, { radius: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fill color</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={selected.fillColor && selected.fillColor !== "none" ? selected.fillColor : "#ffffff"}
                        onChange={(e) => updateCustomElement(selected.id, { fillColor: e.target.value })}
                        className="h-8 w-12 rounded border cursor-pointer"
                      />
                      <Button
                        size="sm"
                        variant={selected.fillColor === "none" ? "default" : "outline"}
                        onClick={() => updateCustomElement(selected.id, { fillColor: selected.fillColor === "none" ? "#e5e7eb" : "none" })}
                      >
                        {selected.fillColor === "none" ? "No fill" : "Remove fill"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Border color</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={selected.borderColor && selected.borderColor !== "none" ? selected.borderColor : "#111111"}
                        onChange={(e) => updateCustomElement(selected.id, { borderColor: e.target.value })}
                        className="h-8 w-12 rounded border cursor-pointer"
                      />
                      <Button
                        size="sm"
                        variant={selected.borderColor === "none" ? "default" : "outline"}
                        onClick={() => updateCustomElement(selected.id, { borderColor: selected.borderColor === "none" ? "#111111" : "none" })}
                      >
                        {selected.borderColor === "none" ? "No border" : "Remove border"}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {(selected.kind === "line" || selected.kind === "qr") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateCustomElement(selected.id, { color: e.target.value })}
                      className="h-8 w-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={selected.color}
                      onChange={(e) => updateCustomElement(selected.id, { color: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {(selected.kind === "field" || selected.kind === "text" || selected.kind === "divider") && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font size: {selected.fontSize}pt</Label>
                    <Slider
                      min={5}
                      max={32}
                      step={0.5}
                      value={[selected.fontSize]}
                      onValueChange={([v]) => updateCustomElement(selected.id, { fontSize: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font family</Label>
                    <Select
                      value={selected.fontFamily}
                      onValueChange={(v) => updateCustomElement(selected.id, { fontFamily: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica (sans)</SelectItem>
                        <SelectItem value="times">Times (serif)</SelectItem>
                        <SelectItem value="courier">Courier (mono)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={selected.bold ? "default" : "outline"}
                      onClick={() => updateCustomElement(selected.id, { bold: !selected.bold })}
                      className="flex-1"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={selected.italic ? "default" : "outline"}
                      onClick={() => updateCustomElement(selected.id, { italic: !selected.italic })}
                      className="flex-1"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    {(["left", "center", "right"] as const).map((a) => {
                      const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                      return (
                        <Button
                          key={a}
                          size="sm"
                          variant={selected.align === a ? "default" : "outline"}
                          onClick={() => updateCustomElement(selected.id, { align: a })}
                          className="flex-1"
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </Button>
                      );
                    })}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={selected.color}
                        onChange={(e) => updateCustomElement(selected.id, { color: e.target.value })}
                        className="h-8 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={selected.color}
                        onChange={(e) => updateCustomElement(selected.id, { color: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">X (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selected.x * 10) / 10}
                    onChange={(e) => updateCustomElement(selected.id, { x: Number(e.target.value) || 0 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Y (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selected.y * 10) / 10}
                    onChange={(e) => updateCustomElement(selected.id, { y: Number(e.target.value) || 0 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">W (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selected.w * 10) / 10}
                    onChange={(e) => updateCustomElement(selected.id, { w: Number(e.target.value) || 1 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">H (mm)</Label>
                  <Input
                    type="number"
                    value={Math.round(selected.h * 10) / 10}
                    onChange={(e) => updateCustomElement(selected.id, { h: Number(e.target.value) || 1 })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
