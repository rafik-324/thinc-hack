import { Link } from "@tanstack/react-router";
import { KeyRound, ShieldAlert, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

export type StaffErrorKind = "unauthenticated" | "forbidden" | "config" | "upstream" | "unknown";

export function classifyStaffError(error: unknown): StaffErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.startsWith("CONFIG:")) return "config";
  if (message.startsWith("FORBIDDEN:")) return "forbidden";
  if (message.startsWith("UPSTREAM:")) return "upstream";
  if (message.includes("Unauthorized")) return "unauthenticated";
  return "unknown";
}

const STATES: Record<
  StaffErrorKind,
  { icon: typeof KeyRound; title: string; body: string; showSignIn: boolean }
> = {
  unauthenticated: {
    icon: KeyRound,
    title: "Sign-in required",
    body: "Der Posteingang eingereichter Fälle ist nur nach Anmeldung mit einem Staff-Konto sichtbar.",
    showSignIn: true,
  },
  forbidden: {
    icon: ShieldAlert,
    title: "No staff access",
    body: "Dieses Konto ist nicht als Versicherungs-Mitarbeiter:in freigeschaltet. Bitte an einen Administrator wenden.",
    showSignIn: false,
  },
  config: {
    icon: Wrench,
    title: "Staff API not configured",
    body: "Die Verbindung zum Claim-System ist noch nicht eingerichtet (STAFF_API_ORIGIN / CLAIM_REVIEWER_KEY fehlen).",
    showSignIn: false,
  },
  upstream: {
    icon: Wrench,
    title: "Claim system unavailable",
    body: "Das angeschlossene Claim-System antwortet gerade nicht. Bitte später erneut versuchen.",
    showSignIn: false,
  },
  unknown: {
    icon: Wrench,
    title: "Something went wrong",
    body: "Die Anfrage ist fehlgeschlagen. Bitte erneut versuchen.",
    showSignIn: false,
  },
};

export function StaffGate({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = classifyStaffError(error);
  const state = STATES[kind];
  const Icon = state.icon;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border">
          <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 text-base font-medium text-foreground">{state.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.body}</p>
        <div className="mt-5 flex justify-center gap-2">
          {state.showSignIn && (
            <Button asChild size="sm" className="rounded-sm text-xs">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm text-xs"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
