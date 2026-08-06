"use client";

import React from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export function Button({
  variant = "primary",
  size = "default",
  children,
  className,
  icon,
  iconPosition = "right",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[#111111] text-white hover:bg-neutral-800 shadow-level-1 hover:shadow-level-2 hover:-translate-y-[2px] rounded-[12px]",
    secondary:
      "bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-level-1 hover:shadow-level-2 hover:-translate-y-[2px] rounded-[12px]",
    outline:
      "bg-transparent text-neutral-900 border border-neutral-200 hover:bg-neutral-100 rounded-[12px]",
    ghost:
      "bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs font-medium gap-1.5",
    default: "h-12 px-7 text-sm font-semibold gap-2",
    lg: "h-14 px-8 text-base font-semibold gap-2.5",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon && iconPosition === "left" && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === "right" && <span className="inline-flex shrink-0">{icon}</span>}
    </button>
  );
}
