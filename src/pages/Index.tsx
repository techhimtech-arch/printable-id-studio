import { useIdStore } from "@/lib/idcard-store";
import Stepper from "@/components/idcard/Stepper";
import StepUpload from "@/components/idcard/StepUpload";
import StepMapping from "@/components/idcard/StepMapping";
import StepReview from "@/components/idcard/StepReview";
import StepDesign from "@/components/idcard/StepDesign";
import StepExport from "@/components/idcard/StepExport";

const Index = () => {
  const step = useIdStore((s) => s.step);

  return (
    <div className="min-h-screen flex bg-background">
      <Stepper />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {step === 0 && <StepUpload />}
          {step === 1 && <StepMapping />}
          {step === 2 && <StepReview />}
          {step === 3 && <StepDesign />}
          {step === 4 && <StepExport />}
        </div>
      </main>
    </div>
  );
};

export default Index;
