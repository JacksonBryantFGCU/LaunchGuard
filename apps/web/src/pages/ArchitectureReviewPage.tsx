import { useOutletContext } from "react-router-dom";
import { ArchitectureWorkspace } from "../components/architecture/ArchitectureWorkspace.js";
import type { ReviewOutletContext } from "./ArchitectureReviewLayout.js";

export function ArchitectureReviewPage() {
  const { scenario } = useOutletContext<ReviewOutletContext>();
  return <ArchitectureWorkspace scenario={scenario} />;
}
