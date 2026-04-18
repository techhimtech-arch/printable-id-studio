import { useIdStore } from "@/lib/idcard-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react";
import { FIELD_LABELS, type CardTemplate, type FieldKey } from "@/types/idcard";
import { cn } from "@/lib/utils";

const TEMPLATES: { key: CardTemplate; label: string; desc: string }[] = [
  { key: "vertical-classic", label: "Vertical · Classic", desc: "Photo top, accent corner, footer band" },
  { key: "horizontal-classic", label: "Horizontal · Classic", desc: "Header band, fields + photo, stripes" },
  { key: "vertical-modern", label: "Vertical · Modern", desc: "Solid header, clean rules" },
  { key: "horizontal-modern", label: "Horizontal · Modern", desc: "Accent sidebar, minimalist body" },
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
      </svg>
    </button>
  );
}

export default function StepDesign() {
  const { design, setDesign, setStep, mapping, toggleField } = useIdStore();

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setDesign({ logoDataUrl: r.result as string });
    r.readAsDataURL(file);
  };

  const onSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setDesign({ signatureDataUrl: r.result as string });
    r.readAsDataURL(file);
  };

  const mappedFields = (Object.keys(FIELD_LABELS) as FieldKey[]).filter(
    (f) => f !== "name" && Boolean(mapping[f]),
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Card design</h2>
        <p className="text-muted-foreground mt-1">Pick a template and configure your school branding.</p>
      </div>

      {/* Template picker */}
      <div className="space-y-3">
        <Label>Template</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      </div>

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
