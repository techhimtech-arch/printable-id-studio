import { useIdStore } from "@/lib/idcard-store";
import { Check, FileSpreadsheet, Columns3, Users, Palette, FileDown, IdCard, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Upload", icon: FileSpreadsheet },
  { label: "Map columns", icon: Columns3 },
  { label: "Review photos", icon: Users },
  { label: "Design", icon: Palette },
  { label: "Export PDF", icon: FileDown },
];

export default function Stepper() {
  const { step, setStep, rows, reset } = useIdStore();

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <IdCard className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold leading-tight">ID Card Studio</div>
          <div className="text-[11px] text-muted-foreground">Frontend-only · No login</div>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const enabled = i === 0 || rows.length > 0;
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              disabled={!enabled}
              onClick={() => setStep(i)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                active && "bg-primary text-primary-foreground",
                !active && enabled && "hover:bg-sidebar-accent text-sidebar-foreground",
                !enabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium border",
                  active && "bg-primary-foreground/20 border-primary-foreground/40",
                  done && !active && "bg-primary text-primary-foreground border-primary",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className="font-medium">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <Button variant="ghost" size="sm" onClick={reset} className="mt-4 justify-start text-muted-foreground">
        <RotateCcw className="h-3.5 w-3.5" /> Start over
      </Button>
    </aside>
  );
}
