import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  History,
  Inbox,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { describeApply, describeApplyError, useApplyPolicy, usePolicies } from "@/lib/policies";
import { cn } from "@/lib/utils";
import { TaktileLogo } from "@/components/taktile-logo";

const NAV_ITEMS = [
  { title: "Overview", to: "/queue", icon: LayoutGrid },
  { title: "Policy Update", to: "/update", icon: RefreshCw },
  { title: "History", to: "/history", icon: History },
] as const;

function TopBar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const { mode, setMode, dataSource } = usePolicy();
  const { data: allPolicies = [] } = usePolicies();
  // Only versions that really exist with an uploaded text; empty placeholders are hidden.
  const policies = allPolicies.filter((p) => p.has_content);
  const labelOf = (v: string) => policies.find((p) => p.version === v)?.name ?? `Policy ${v}`;
  const [pending, setPending] = useState<VersionMode>(mode);
  const dirty = pending !== mode;

  useEffect(() => setPending(mode), [mode]);

  // Never point at a version that does not exist: fall back to the newest uploaded one.
  const versions = policies.map((p) => p.version);
  const versionKey = versions.join("|");
  // On first load pick the newest uploaded version (just v1 while it is the only policy). Never
  // correct the selection later: right after an upload the list is still reloading and would
  // otherwise throw the user back to the old version.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || !versionKey) return;
    const list = versionKey.split("|");
    setMode(list[list.length - 1] ?? "v1");
    initialised.current = true;
  }, [versionKey, setMode]);

  const applyPolicy = useApplyPolicy();

  const apply = () => {
    // v1 is the baseline every claim was decided with; test data has no backend.
    if (pending === "v1" || dataSource === "demo") {
      setMode(pending);
      toast.success(`${labelOf(pending)} active`);
      return;
    }
    applyPolicy.mutate(pending, {
      onSuccess: (result) => {
        setMode(pending);
        toast.success(`${labelOf(pending)} applied`, { description: describeApply(result) });
      },
      onError: (e) => toast.error("Policy update failed", { description: describeApplyError(e) }),
    });
  };

  return (
    <header className="fixed left-3 right-3 top-3 z-30 flex h-12 items-center justify-between rounded-full border border-border bg-card px-2 sm:px-4">
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground md:hidden"
        >
          {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>
        <Link to="/" aria-label="Retakt home" className="flex shrink-0 items-center gap-2 pl-1">
          <TaktileLogo className="size-5 text-foreground" />
          <span aria-hidden="true" className="mx-1.5 hidden h-4 w-px bg-foreground/20 sm:block" />
          <span className="hidden text-sm font-medium tracking-normal text-foreground sm:inline">
            Retakt
          </span>
        </Link>
      </div>

      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <span className="eyebrow hidden sm:block">Policy Version</span>
        <Select value={pending} onValueChange={(value) => setPending(value as VersionMode)}>
          <SelectTrigger
            aria-label="Policy version"
            className="h-8 w-[4.5rem] rounded-sm font-mono tabular-nums text-xs sm:w-32"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version} value={version} className="font-mono text-xs">
                {/* The phone trigger only fits the version itself. */}
                <span className="sm:hidden">{version}</span>
                <span className="hidden sm:inline">{labelOf(version)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          title="Change policy"
          className="relative rounded-sm text-xs max-sm:w-8 max-sm:px-0"
          onClick={apply}
          disabled={applyPolicy.isPending}
        >
          <ArrowRightLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">
            {applyPolicy.isPending ? "Running engine…" : "Change policy"}
          </span>
          {dirty && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 size-1.5 rounded-full bg-contrast"
            />
          )}
        </Button>
        <Link
          to="/submitted"
          aria-label="Submitted claims"
          title="Submitted claims"
          activeOptions={{ includeSearch: false }}
          activeProps={{ className: "bg-accent text-foreground" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Inbox size={18} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [atEdge, setAtEdge] = useState({ top: true, bottom: false });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const update = () => {
      const top = scroller.scrollTop <= 1;
      const bottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      setAtEdge((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-dots">
      <TopBar onMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen} />

      {/* Phones: the sidebar becomes a menu under the top bar. */}
      {menuOpen && (
        <nav
          aria-label="Main"
          className="fixed left-3 right-3 top-[72px] z-30 space-y-1 rounded-lg border border-border bg-background p-2 shadow-2xl md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium",
                pathname.startsWith(item.to)
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
              {item.title}
            </Link>
          ))}
          <Link
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-sm border-t border-border px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/settings")
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings size={16} strokeWidth={1.5} className="shrink-0" />
            Settings
          </Link>
        </nav>
      )}

      <aside
        className={cn(
          "fixed bottom-3 left-3 top-[72px] z-20 hidden flex-col rounded-lg border border-border bg-card transition-all duration-200 md:flex",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div
          className={cn(
            "flex items-center py-4",
            collapsed ? "justify-center px-2" : "justify-between px-5",
          )}
        >
          {!collapsed && <p className="eyebrow">Claims review</p>}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.5} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.5} />
            )}
          </button>
        </div>
        <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2" : "px-3")}>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                to={item.to}
                key={item.to}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-sm py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 bg-foreground"
                  />
                )}
                <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && item.title}
              </Link>
            );
          })}
        </nav>
        {/* Settings sit at the very bottom of the sidebar. */}
        <div className={cn("border-t border-border py-2", collapsed ? "px-2" : "px-3")}>
          <Link
            to="/settings"
            aria-label="Settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            title="Settings"
            className={cn(
              "relative flex w-full items-center gap-3 rounded-sm py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              pathname.startsWith("/settings")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {pathname.startsWith("/settings") && (
              <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-foreground" />
            )}
            <Settings size={16} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && "Settings"}
          </Link>
        </div>
      </aside>

      <div
        className={cn(
          "overflow-x-clip pt-[72px] transition-all duration-200",
          collapsed ? "md:pl-[88px]" : "md:pl-[248px]",
        )}
      >
        <main
          id="app-scroll"
          ref={scrollRef}
          data-at-top={atEdge.top}
          data-at-bottom={atEdge.bottom}
          className="h-[calc(100vh-72px)] overflow-y-auto px-3 pb-8 md:pr-14"
        >
          <div ref={contentRef}>{children}</div>
        </main>
      </div>
    </div>
  );
}
