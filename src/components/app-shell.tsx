import { Link } from "@tanstack/react-router";
import { History, LayoutGrid, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
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
import { usePolicy } from "@/lib/policy-context";
import type { VersionMode } from "@/lib/policy-data";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Overview", tab: "overview", icon: LayoutGrid },
  { title: "Update", tab: "update", icon: RefreshCw },
  { title: "History", tab: "history", icon: History },
] as const;

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
        <span aria-hidden="true" className="size-2 rounded-full bg-contrast shadow-[0_0_10px_var(--contrast)]" />
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
  const [collapsed, setCollapsed] = useState(false);
  const { tab, setTab } = usePolicy();

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <aside
        className={cn(
          "fixed bottom-3 left-3 top-[72px] z-20 flex flex-col rounded-lg border border-border bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div className={cn("flex items-center py-4", collapsed ? "justify-center px-2" : "justify-between px-5")}>
          {!collapsed && (
            <div className="space-y-1">
              <span className="text-lg font-medium tracking-normal text-foreground">Policy Replay</span>
              <p className="eyebrow">CLAIMS REVIEW</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
            className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
          </button>
        </div>
        <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2" : "px-3")}>
          {NAV_ITEMS.map((item) => {
            const active = tab === item.tab;
            return (
              <button
                type="button"
                key={item.tab}
                onClick={() => setTab(item.tab)}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-sm py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-foreground" />}
                <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && item.title}
              </button>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="border-t border-border px-5 py-4">
            <p className="font-mono tabular-nums text-xs text-muted-foreground">Policy v1 · v2 preview</p>
          </div>
        )}
      </aside>

      <div className={cn("pt-[72px] transition-all duration-200", collapsed ? "pl-[88px]" : "pl-[248px]")}>
        <main className="px-3 pb-3">{children}</main>
      </div>
    </div>
  );
}
