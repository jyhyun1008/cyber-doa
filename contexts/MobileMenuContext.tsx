"use client";

import { createContext, useContext } from "react";

const MobileMenuContext = createContext<{ openMenu: () => void } | null>(null);

export function MobileMenuProvider({
  openMenu,
  children,
}: {
  openMenu: () => void;
  children: React.ReactNode;
}) {
  return <MobileMenuContext.Provider value={{ openMenu }}>{children}</MobileMenuContext.Provider>;
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) throw new Error("useMobileMenu must be used within MobileMenuProvider");
  return ctx;
}
