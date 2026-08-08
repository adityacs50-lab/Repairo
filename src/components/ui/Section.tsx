import React from "react";
import { cn } from "@/lib/cn";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  id?: string;
  spacing?: "default" | "tight" | "loose";
}

export function Section({
  children,
  className,
  id,
  spacing = "default",
  ...props
}: SectionProps) {
  const spacingClasses = {
    tight: "py-12 md:py-16",
    default: "py-16 md:py-24",
    loose: "py-24 md:py-32",
  };

  return (
    <section
      id={id}
      className={cn("relative w-full overflow-hidden", spacingClasses[spacing], className)}
      {...props}
    >
      {children}
    </section>
  );
}
