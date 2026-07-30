"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { MobileMenuProvider } from "@/contexts/MobileMenuContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <MobileMenuProvider openMenu={() => setMobileMenuOpen(true)}>
      <main className="mx-auto flex h-dvh max-w-6xl lg:gap-4 lg:p-4">
        <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </MobileMenuProvider>
  );
}
