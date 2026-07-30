"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import CalendarView from "./CalendarView";

export default function CalendarShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="mx-auto flex h-dvh max-w-6xl lg:gap-4 lg:p-4">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="min-w-0 flex-1">
        <CalendarView onOpenMenu={() => setMobileMenuOpen(true)} />
      </div>
    </main>
  );
}
