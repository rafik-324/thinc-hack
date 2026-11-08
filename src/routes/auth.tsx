import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaktileLogo } from "@/components/taktile-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Retakt" },
      { name: "description", content: "Sign in with your insurer staff account." },
      { property: "og:title", content: "Sign in — Retakt" },
      { property: "og:description", content: "Sign in with your insurer staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/submitted" });
      } else {
        setChecking(false);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const signIn = async () => {
    if (!email.trim() || !password) {
      toast.error("Bitte E-Mail und Passwort angeben.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("Anmeldung fehlgeschlagen.", { description: error.message });
      return;
    }
    navigate({ to: "/submitted" });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <TaktileLogo className="size-5 text-foreground" />
          <span className="text-sm font-medium text-foreground">Retakt</span>
        </div>
        <p className="eyebrow mt-6">Staff sign-in</p>
        <h1 className="mt-1 text-xl font-medium tracking-tight text-foreground">
          Submitted claims
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Der Posteingang eingereichter Fälle ist nur für Versicherungs-Mitarbeiter:innen
          freigeschaltet.
        </p>

        {checking ? (
          <p className="mt-6 text-sm text-muted-foreground">Checking session…</p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground">
                E-Mail
              </Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                className="h-9 rounded-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground">
                Passwort
              </Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                className="h-9 rounded-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-9 w-full rounded-sm bg-primary text-xs text-primary-foreground"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Zurück zur <Link to="/queue" className="text-foreground underline underline-offset-2">Übersicht</Link>.
        </p>
      </div>
    </div>
  );
}
