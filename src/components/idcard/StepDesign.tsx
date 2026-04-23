import { useIdStore } from "@/lib/idcard-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Upload, X, Wand2 } from "lucide-react";
import { FIELD_LABELS, type CardTemplate, type FieldKey } from "@/types/idcard";
import { cn } from "@/lib/utils";
import CustomEditor from "./CustomEditor";
import { templateToCustomElements } from "@/lib/template-to-custom";
import { toast } from "sonner";

const TEMPLATES: { key: CardTemplate; label: string; desc: string }[] = [
  { key: "vertical-classic", label: "Vertical · Classic", desc: "Photo top, accent corner, footer band" },
  { key: "horizontal-classic", label: "Horizontal · Classic", desc: "Header band, fields + photo, stripes" },
  { key: "vertical-modern", label: "Vertical · Modern", desc: "Solid header, clean rules" },
  { key: "horizontal-modern", label: "Horizontal · Modern", desc: "Accent sidebar, minimalist body" },
  { key: "custom", label: "Custom · Your design", desc: "Upload background, drag fields freely" },
];

function TemplateThumb({ tpl, active, accent, onClick }: { tpl: CardTemplate; active: boolean; accent: string; onClick: () => void }) {
  const isV = tpl.startsWith("vertical");
  const w = isV ? 54 : 86;
  const h = isV ? 86 : 54;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-2 rounded-md p-2 bg-muted/30 hover:bg-muted transition flex items-center justify-center",
        active ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      <svg viewBox={`0 0 ${w} ${h}`} width={isV ? 54 : 86} height={isV ? 86 : 54} className="bg-white rounded-sm border">
        {tpl === "vertical-classic" && (
          <>
            <circle cx={w} cy={0} r="20" fill={accent} opacity="0.2" />
            <circle cx="0" cy="0" r="12" fill={accent} />
            <rect x="15" y="14" width="24" height="28" fill="#eee" stroke={accent} />
            <rect x="6" y="48" width="42" height="2" fill={accent} opacity="0.5" />
            <rect x="6" y="54" width="30" height="1.5" fill="#ccc" />
            <rect x="6" y="58" width="36" height="1.5" fill="#ccc" />
            <rect x="6" y="62" width="28" height="1.5" fill="#ccc" />
            <rect x="0" y={h - 8} width={w} height="8" fill={accent} />
          </>
        )}
        {tpl === "horizontal-classic" && (
          <>
            <rect x="0" y="0" width={w} height="11" fill={accent} />
            <rect x="58" y="14" width="22" height="26" fill="#eee" stroke={accent} />
            <rect x="4" y="16" width="30" height="3" fill={accent} />
            <rect x="4" y="22" width="40" height="1.5" fill="#ccc" />
            <rect x="4" y="26" width="40" height="1.5" fill="#ccc" />
            <rect x="4" y="30" width="40" height="1.5" fill="#ccc" />
            <rect x="58" y="42" width="22" height="3" fill={accent} />
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={i} x1={i * 5 - 10} y1={h} x2={i * 5 - 10 + 8} y2={h - 8} stroke={accent} strokeWidth="1.5" />
            ))}
          </>
        )}
        {tpl === "vertical-modern" && (
          <>
            <rect x="0" y="0" width={w} height="20" fill={accent} />
            <rect x="14" y="24" width="26" height="26" fill="#eee" stroke={accent} />
            <rect x="6" y="56" width="42" height="1.5" fill={accent} />
            <rect x="6" y="62" width="42" height="1" fill="#ddd" />
            <rect x="6" y="68" width="42" height="1" fill="#ddd" />
            <rect x="6" y="74" width="42" height="1" fill="#ddd" />
            <rect x="6" y="80" width="42" height="1" fill="#ddd" />
          </>
        )}
        {tpl === "horizontal-modern" && (
          <>
            <rect x="0" y="0" width="20" height={h} fill={accent} />
            <rect x="24" y="6" width="20" height="24" fill="#eee" stroke={accent} />
            <rect x="48" y="8" width="32" height="3" fill="#333" />
            <rect x="48" y="14" width="20" height="2" fill={accent} />
            <rect x="48" y="20" width="32" height="1.5" fill="#ccc" />
            <rect x="48" y="24" width="32" height="1.5" fill="#ccc" />
            <rect x="48" y="28" width="32" height="1.5" fill="#ccc" />
          </>
        )}
        {tpl === "custom" && (
          <>
            <rect x="3" y="3" width={w - 6} height={h - 6} fill="#f5f5f5" stroke={accent} strokeDasharray="2 2" />
            <rect x="8" y="10" width="14" height="18" fill={accent} opacity="0.3" />
            <rect x="26" y="12" width="20" height="2" fill={accent} />
            <rect x="26" y="18" width="16" height="1.5" fill="#999" />
            <rect x="26" y="22" width="18" height="1.5" fill="#999" />
            <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">CUSTOM</text>
          </>
        )}
      </svg>
    </button>
  );
}

export default function StepDesign() {
  const { design, setDesign, setStep, mapping, toggleField } = useIdStore();

  // Normalize any uploaded image (PNG/JPEG/WEBP/SVG) into a PDF-safe PNG data URL.
  // Keeps transparency, caps max dimension to keep PDF size sane.
  const normalizeToPng = (file: File, maxDim = 1024): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const w = Math.max(1, Math.round((img.width || maxDim) * scale));
            const h = Math.max(1, Math.round((img.height || maxDim) * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(src);
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/png"));
          } catch {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.readAsDataURL(file);
    });

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await normalizeToPng(file, 512);
      setDesign({ logoDataUrl: dataUrl });
    } catch {
      toast.error("Couldn't read that logo. Try a PNG or JPG.");
    } finally {
      e.target.value = "";
    }
  };

  const onSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await normalizeToPng(file, 768);
      setDesign({ signatureDataUrl: dataUrl });
    } catch {
      toast.error("Couldn't read that signature. Try a PNG or JPG.");
    } finally {
      e.target.value = "";
    }
  };

  const mappedFields = (Object.keys(FIELD_LABELS) as FieldKey[]).filter(
    (f) => f !== "name" && Boolean(mapping[f]),
  );

  const convertToEditable = () => {
    const elements = templateToCustomElements(design);
    setDesign({
      template: "custom",
      customElements: elements,
      customBgDataUrl: null,
    });
    toast.success("Template converted to editable layout. Drag any element to customize.");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Card design</h2>
        <p className="text-muted-foreground mt-1">Pick a template and configure your school branding.</p>
      </div>

      {/* Template picker */}
      <div className="space-y-3">
        <Label>Template</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.key} className="space-y-2">
              <TemplateThumb
                tpl={t.key}
                active={design.template === t.key}
                accent={design.accentColor}
                onClick={() => setDesign({ template: t.key })}
              />
              <div className="text-xs">
                <div className="font-medium">{t.label}</div>
                <div className="text-muted-foreground text-[11px] leading-tight">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {design.template !== "custom" && (
          <div className="flex items-start gap-3 p-3 bg-muted/40 border rounded-md">
            <Wand2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Want to tweak this template?</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Convert it to an editable layout — same design, but you can drag, resize and restyle every element.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={convertToEditable}>
              Customize this template
            </Button>
          </div>
        )}
      </div>

      {/* Card size (mm) — works for all templates */}
      <div className="space-y-2">
        <Label>Card size (mm)</Label>
        <p className="text-xs text-muted-foreground">
          Standard ID is 54 × 86 mm (CR80). Adjust if you print on different stock.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">Width</span>
            <Input
              type="number"
              min={30}
              max={150}
              value={design.customWidth}
              onChange={(e) => setDesign({ customWidth: Math.max(30, Math.min(150, Number(e.target.value) || 54)) })}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">Height</span>
            <Input
              type="number"
              min={30}
              max={150}
              value={design.customHeight}
              onChange={(e) => setDesign({ customHeight: Math.max(30, Math.min(150, Number(e.target.value) || 86)) })}
              className="w-24"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDesign(
                design.orientation === "portrait"
                  ? { customWidth: 54, customHeight: 86 }
                  : { customWidth: 86, customHeight: 54 },
              )
            }
          >
            Reset to standard
          </Button>
        </div>
      </div>

      {design.template === "custom" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
            <Wand2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-medium text-sm mb-0.5">💡 Use your own finished design</div>
              Apni finished card design (Photoshop / Canva se exported <strong>PNG / JPG</strong>) yahaan <strong>background</strong> ke roop mein upload karo.
              Phir <strong>Auto-add fields</strong> click karo — saare mapped Excel fields ek saath aa jayenge.
              Drag karke jagah set karo, aur Excel ke har student ke liye PDF mein same design use hogi.
              Agar background mein purane name/photo placeholders hain toh <strong>Erase</strong> tool se white-out kardo — Photoshop ki zarurat nahi.
            </div>
          </div>
          <CustomEditor />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label>School name</Label>
          <Input value={design.schoolName} onChange={(e) => setDesign({ schoolName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Subtitle / motto</Label>
          <Input value={design.schoolSubtitle} onChange={(e) => setDesign({ schoolSubtitle: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>School address</Label>
          <Textarea
            rows={2}
            value={design.schoolAddress}
            onChange={(e) => setDesign({ schoolAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact phone</Label>
          <Input value={design.contactPhone} onChange={(e) => setDesign({ contactPhone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Contact email</Label>
          <Input value={design.contactEmail} onChange={(e) => setDesign({ contactEmail: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Principal name</Label>
          <Input value={design.principalName} onChange={(e) => setDesign({ principalName: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>Accent color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={design.accentColor}
              onChange={(e) => setDesign({ accentColor: e.target.value })}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Input
              value={design.accentColor}
              onChange={(e) => setDesign({ accentColor: e.target.value })}
              className="max-w-[140px] font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>School logo (optional)</Label>
          <div className="flex items-center gap-3">
            {design.logoDataUrl ? (
              <div className="relative h-16 w-16 border rounded overflow-hidden bg-muted">
                <img src={design.logoDataUrl} alt="logo" className="w-full h-full object-contain" />
                <button
                  onClick={() => setDesign({ logoDataUrl: null })}
                  className="absolute top-0 right-0 p-0.5 bg-background/80 rounded-bl"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Principal signature (optional)</Label>
          <div className="flex items-center gap-3">
            {design.signatureDataUrl ? (
              <div className="relative h-16 w-28 border rounded overflow-hidden bg-muted">
                <img src={design.signatureDataUrl} alt="sig" className="w-full h-full object-contain" />
                <button
                  onClick={() => setDesign({ signatureDataUrl: null })}
                  className="absolute top-0 right-0 p-0.5 bg-background/80 rounded-bl"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="h-16 w-28 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={onSigUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Visible fields */}
      {mappedFields.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label>Fields shown on card</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Toggle which mapped fields appear on each ID card.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {mappedFields.map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={design.visibleFields.includes(f)}
                  onCheckedChange={() => toggleField(f)}
                />
                <span className="text-sm">{FIELD_LABELS[f]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setStep(4)}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
