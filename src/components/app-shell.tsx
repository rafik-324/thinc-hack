import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Gauge } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePolicy } from "@/lib/policy-store";
import type { VersionMode } from "@/lib/policy-data";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Claims Queue", url: "/queue", icon: ClipboardList },
  { title: "Policy Impact", url: "/policy-impact", icon: Gauge },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, setMode } = usePolicy();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const pageName = NAV_ITEMS.find((item) => item.url === currentPath)?.title
    ?? (currentPath.startsWith("/claims/") ? "Claim Detail" : "Policy Replay");

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border bg-card">
        <div className="space-y-2 px-5 py-5">
          <span className="text-lg font-medium tracking-normal text-foreground">Policy Replay</span>
          <p className="eyebrow">CLAIMS REVIEW</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-foreground" />}
                <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-5 py-4">
          <p className="font-mono tabular-nums text-xs text-muted-foreground">Policy v1 · v2 preview</p>
        </div>
      </aside>

      <div className="pl-56">
        <header className="sticky top-0 z-10 flex h-[65px] items-center justify-between border-b border-border bg-background px-6">
          <span className="eyebrow">{pageName}</span>
          <div className="flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => value && setMode(value as VersionMode)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="v1" className="rounded-sm font-mono tabular-nums text-xs data-[state=on]:bg-foreground data-[state=on]:text-background">v1</ToggleGroupItem>
              <ToggleGroupItem value="v2" className="rounded-sm font-mono tabular-nums text-xs data-[state=on]:bg-foreground data-[state=on]:text-background">v2</ToggleGroupItem>
              <ToggleGroupItem value="compare" className="rounded-sm font-mono tabular-nums text-xs data-[state=on]:bg-foreground data-[state=on]:text-background">Compare</ToggleGroupItem>
            </ToggleGroup>
            <Badge variant="outline" className="eyebrow rounded-sm border-contrast/40 text-contrast">
              V2 PREVIEW
            </Badge>
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
