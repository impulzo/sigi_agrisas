import { cn } from "../../../_lib/cn";

type Size = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: Size;
  fallbackInitials?: string;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8 text-label-sm",
  md: "h-10 w-10 text-label-lg",
  lg: "h-14 w-14 text-title-md",
};

export function Avatar({
  src,
  alt,
  size = "md",
  fallbackInitials,
  className,
}: AvatarProps) {
  const base = cn(
    "rounded-full overflow-hidden border border-outline-variant inline-flex items-center justify-center bg-surface-container-high text-on-surface-variant font-medium uppercase",
    sizeClasses[size],
    className,
  );

  if (src) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span className={base} aria-label={alt} role="img">
      {fallbackInitials ?? "?"}
    </span>
  );
}
