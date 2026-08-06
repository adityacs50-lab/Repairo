import React from "react";
import { cn } from "@/lib/cn";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
}

export function Heading({
  level = 2,
  children,
  className,
  eyebrow,
  ...props
}: HeadingProps) {
  const Component = `h${level}` as React.ElementType;

  const styles = {
    1: "text-4xl sm:text-5xl lg:text-[72px] font-extrabold tracking-[-0.05em] leading-[0.95] text-neutral-900",
    2: "text-3xl sm:text-4xl lg:text-[48px] font-bold tracking-[-0.03em] leading-[1.1] text-neutral-900",
    3: "text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900",
    4: "text-lg font-semibold tracking-tight text-neutral-900",
  };

  return (
    <div className="space-y-3">
      {eyebrow && (
        <span className="text-xs font-mono font-semibold tracking-[0.08em] uppercase text-neutral-500 block">
          {eyebrow}
        </span>
      )}
      <Component className={cn(styles[level], className)} {...props}>
        {children}
      </Component>
    </div>
  );
}
