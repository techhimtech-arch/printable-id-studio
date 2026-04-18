import { useIdStore } from "@/lib/idcard-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react";

export default function StepDesign() {
  const { design, setDesign, setStep } = useIdStore();

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setDesign({ logoDataUrl: r.result as string });
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Card design</h2>
        <p className="text-muted-foreground mt-1">Configure the school branding for the ID cards.</p>
      </div>

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label>School name</Label>
          <Input value={design.schoolName} onChange={(e) => setDesign({ schoolName: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>Subtitle / motto</Label>
          <Input value={design.schoolSubtitle} onChange={(e) => setDesign({ schoolSubtitle: e.target.value })} />
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
            <p className="text-xs text-muted-foreground">PNG/SVG with transparent background works best.</p>
          </div>
        </div>
      </div>

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
