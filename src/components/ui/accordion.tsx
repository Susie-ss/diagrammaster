"use client";

import { useState, createContext, useContext, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// ======================== Accordion Context ========================
interface AccordionCtx {
  openItems: Set<string>;
  toggle: (val: string) => void;
}

const AccordionCtx = createContext<AccordionCtx>({ openItems: new Set(), toggle: () => {} });

// ======================== Accordion ========================
export function Accordion({
  children,
  defaultValue = [],
  className = "",
}: {
  children: ReactNode;
  defaultValue?: string[];
  className?: string;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultValue));
  const toggle = (val: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };
  return (
    <AccordionCtx.Provider value={{ openItems, toggle }}>
      <div className={`space-y-2 ${className}`}>{children}</div>
    </AccordionCtx.Provider>
  );
}

// ======================== AccordionItem ========================
export function AccordionItem({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ======================== AccordionTrigger ========================
export function AccordionTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { openItems, toggle } = useContext(AccordionCtx);
  const open = openItems.has(value);
  return (
    <button
      onClick={() => toggle(value)}
      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
    >
      <span>{children}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

// ======================== AccordionContent ========================
export function AccordionContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { openItems } = useContext(AccordionCtx);
  const open = openItems.has(value);
  return (
    <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
      <div className={`px-3 pb-3 pt-1 ${className}`}>{children}</div>
    </div>
  );
}
