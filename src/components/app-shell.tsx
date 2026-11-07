import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePolicy } from "@/lib/policy-store";
import type { VersionMode } from "@/lib/policy-data";

const VERSION_LABELS: Record<VersionMode, string> = {
  v1: "Policy v1",
  v2: "Policy v2",
  compare: "v1 vs v2",
};

function TopBar() {
  const { mode, setMode } = usePolicy();
  const [pending, setPending] = useState<VersionMode>(mode);
  const dirty = pending !== mode;

  useEffect(() => setPending(mode), [mode]);

  const apply = () => {
    setMode(pending);
    toast.success(`${VERSION_LABELS[pending]} aktualisiert`, {
      description: "25 Claims wurden neu geprüft.",
    });
  };

  return (
    <div className="fixed left-3 right-3 top-3 z-30 flex h-12 items-center justify-between rounded-full border border-border bg-card px-4">
      <Link to="/" className="flex items-center gap-2 pl-1">
        <span aria-hidden="true" className="size-2 rounded-full bg-contrast" />
        <span className="text-sm font-medium tracking-normal text-foreground">
          Policy Replay
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <span className="eyebrow hidden sm:block">Policy Version</span>
        <Select value={pending} onValueChange={(value) => setPending(value as VersionMode)}>
          <SelectTrigger
            aria-label="Policy version"
            className="h-8 w-32 rounded-sm font-mono tabular-nums text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VERSION_LABELS) as VersionMode[]).map((version) => (
              <SelectItem key={version} value={version} className="font-mono text-xs">
                {VERSION_LABELS[version]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="relative rounded-sm text-xs" onClick={apply}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Update
          {dirty && (
            <span aria-hidden="true" className="absolute -right-1 -top-1 size-1.5 rounded-full bg-contrast" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <aside className="fixed bottom-3 left-3 top-[72px] z-20 flex w-96 flex-col rounded-lg border border-border bg-card" />

      <div className="pl-[408px] pt-[72px]">
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
