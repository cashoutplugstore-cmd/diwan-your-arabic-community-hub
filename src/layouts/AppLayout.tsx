import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { VoiceRoomDock } from "@/components/voice/VoiceRoomDock";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh hero-surface">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 lg:pb-10">{children}</main>
      </div>
      <VoiceRoomDock />
      <MobileNav />
    </div>
  );
}
