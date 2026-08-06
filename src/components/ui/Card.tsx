import React from "react";
import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: "none" | "sm" | "default" | "lg";
}

export function Card({
  children,
  className,
  hoverable = true,
  padding = "default",
  ...props
}: CardProps) {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    default: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-[16px] border border-neutral-200 shadow-level-1 transition-all duration-300",
        hoverable && "hover:-translate-y-1 hover:shadow-level-2 hover:border-neutral-300",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
