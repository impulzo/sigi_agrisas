import { cn } from "../../../_lib/cn";
import { Spinner } from "../../atoms/Spinner/Spinner";

interface PageLoadingProps {
  className?: string;
}

export function PageLoading({ className }: PageLoadingProps) {
  return (
    <div className={cn("flex h-[60vh] items-center justify-center", className)}>
      <Spinner size="lg" />
    </div>
  );
}
