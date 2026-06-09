"use client";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({ orientation = "horizontal", className = "" }: SeparatorProps) {
  if (orientation === "vertical") {
    return <div className={`shrink-0 w-px bg-gray-300 ${className}`} />;
  }
  return <div className={`shrink-0 h-px w-full bg-gray-300 ${className}`} />;
}
