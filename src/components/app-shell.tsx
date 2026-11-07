import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Gauge, Scale } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-base font-medium tracking-normal text-foreground">Policy Replay</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground">Claims review prototype</p>
        </div>
      </aside>

      <div className="pl-56">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
          <span className="text-sm font-medium text-muted-foreground">Policy Replay</span>
          <div className="flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => value && setMode(value as VersionMode)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="v1">v1</ToggleGroupItem>
              <ToggleGroupItem value="v2">v2</ToggleGroupItem>
              <ToggleGroupItem value="compare">Compare</ToggleGroupItem>
            </ToggleGroup>
            <Badge variant="secondary" className="border border-decision-specialist/30 bg-decision-specialist/10 text-decision-specialist">
              Preview
            </Badge>
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
