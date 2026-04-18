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
import { Trash2, Image as ImageIcon, Type, User, Plus, AlignLeft, AlignCenter, AlignRight, Bold, Italic, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** On-screen scale for the editor — larger than preview so dragging is precise. */
const PX_PER_MM = 6;

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

  const canvasRef = useRef<HTMLDivElement>(null);

  const W = design.customWidth * PX_PER_MM;
  const H = design.customHeight * PX_PER_MM;

  const sample = students[0];
  const samplePhoto = sample?.photoId ? photos.find((p) => p.id === sample.photoId) : photos[0];

  const onBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setDesign({ customBgDataUrl: r.result as string });
    r.readAsDataURL(file);
  };

  const addElement = (partial: Partial<CustomElement> & { kind: CustomElement["kind"] }) => {
    const el: CustomElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: partial.kind,
      field: partial.field,
      text: partial.text ?? "",
      labelPrefix: partial.labelPrefix ?? "",
      x: partial.x ?? design.customWidth / 2 - 10,
      y: partial.y ?? design.customHeight / 2 - 5,
      w: partial.w ?? (partial.kind === "photo" ? 24 : 30),
      h: partial.h ?? (partial.kind === "photo" ? 28 : 5),
      fontSize: partial.fontSize ?? 9,
      fontFamily: partial.fontFamily ?? "helvetica",
      bold: partial.bold ?? (partial.field === "name"),
      italic: partial.italic ?? false,
      color: partial.color ?? "#111111",
      align: partial.align ?? "left",
    };
    addCustomElement(el);
    setSelectedId(el.id);
  };

  // Mouse drag handlers
  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const dx = (e.clientX - drag.startX) / PX_PER_MM;
      const dy = (e.clientY - drag.startY) / PX_PER_MM;
      if (drag.mode === "move") {
        const nx = Math.max(0, Math.min(design.customWidth - drag.elStartW, drag.elStartX + dx));
        const ny = Math.max(0, Math.min(design.customHeight - drag.elStartH, drag.elStartY + dy));
        updateCustomElement(drag.id, { x: nx, y: ny });
      } else {
        const nw = Math.max(4, Math.min(design.customWidth - drag.elStartX, drag.elStartW + dx));
        const nh = Math.max(3, Math.min(design.customHeight - drag.elStartY, drag.elStartH + dy));
        updateCustomElement(drag.id, { w: nw, h: nh });
      }
    };
    const up = () => setDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag, design.customWidth, design.customHeight, updateCustomElement]);

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
      const v = col && sample ? sample.row[col] : "";
      const fallback = el.field ? FIELD_LABELS[el.field] : "Field";
      return (el.labelPrefix || "") + (v || `[${fallback}]`);
    }
    return "";
  };

  const selected = design.customElements.find((e) => e.id === selectedId) || null;
  const mappedFieldKeys = (Object.keys(FIELD_LABELS) as FieldKey[]).filter((f) => mapping[f]);

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
            <SelectValue placeholder="+ Field" />
          </SelectTrigger>
          <SelectContent>
            {mappedFieldKeys.map((f) => (
              <SelectItem key={f} value={f}>
                {FIELD_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "text", text: "ID CARD" })}>
          <Plus className="h-3.5 w-3.5" /> Text
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "logo", w: 12, h: 12 })}>
          <ImageIcon className="h-3.5 w-3.5" /> Logo
        </Button>
        <Button size="sm" variant="outline" onClick={() => addElement({ kind: "signature", w: 24, h: 8 })}>
          <ImageIcon className="h-3.5 w-3.5" /> Signature
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Canvas */}
        <div className="bg-muted/40 rounded-lg p-6 border overflow-auto flex items-start justify-center">
          <div
            ref={canvasRef}
            onMouseDown={() => setSelectedId(null)}
            className="relative bg-white shadow-md select-none"
            style={{
              width: W,
              height: H,
              backgroundImage: design.customBgDataUrl ? `url(${design.customBgDataUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
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

              {selected.kind === "text" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Text</Label>
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
                </>
              )}

              {(selected.kind === "field" || selected.kind === "text") && (
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
