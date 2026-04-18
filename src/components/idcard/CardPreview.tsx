import type { CardDesign, ColumnMapping, PhotoFile, Student } from "@/types/idcard";
import VerticalClassic from "./templates/VerticalClassic";
import HorizontalClassic from "./templates/HorizontalClassic";
import VerticalModern from "./templates/VerticalModern";
import HorizontalModern from "./templates/HorizontalModern";

export interface CardProps {
  student: Student;
  photo: PhotoFile | null;
  mapping: ColumnMapping;
  design: CardDesign;
}

export default function CardPreview(props: CardProps) {
  switch (props.design.template) {
    case "horizontal-classic":
      return <HorizontalClassic {...props} />;
    case "vertical-modern":
      return <VerticalModern {...props} />;
    case "horizontal-modern":
      return <HorizontalModern {...props} />;
    case "vertical-classic":
    default:
      return <VerticalClassic {...props} />;
  }
}
