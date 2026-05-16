import { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../../_lib/cn";

type Tone = "default" | "primary";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  default:
    "bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm",
  primary: "bg-primary text-on-primary rounded-xl p-xl shadow-lg",
};

export function Card({ children, tone = "default", className, ...props }: CardProps) {
  return (
    <div className={cn(toneClasses[tone], className)} {...props}>
      {children}
    </div>
  );
}
