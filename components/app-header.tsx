import Link from "next/link";
import { AudioWaveform } from "lucide-react";
import { SessionBar } from "@/components/session-bar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AudioWaveform className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Pulsar Search Console</span>
        </Link>
        <SessionBar />
      </div>
    </header>
  );
}
