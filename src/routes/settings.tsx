import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiSettings, useSaveAiKey } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Retakt" },
      { name: "description", content: "Configure the API key the AI models use." },
    ],
  }),
  component: SettingsPage,
});

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  openai_compatible: "OpenAI-compatible",
  disabled: "Disabled",
};

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-normal text-foreground">Settings</h1>
      <Tabs defaultValue="api-key">
        <TabsList>
          <TabsTrigger value="api-key" className="gap-1.5">
            <KeyRound aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
            API key
          </TabsTrigger>
        </TabsList>
        <TabsContent value="api-key" className="mt-4">
          <ApiKeyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-right font-mono text-sm tabular-nums text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

function ApiKeyTab() {
  const settings = useAiSettings();
  const save = useSaveAiKey();
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const data = settings.data;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    save.mutate(key.trim(), {
      onSuccess: (saved) => {
        setKey("");
        setVisible(false);
        if (saved.warning) toast.warning("API key saved", { description: saved.warning });
        else toast.success("API key saved", { description: "Used from the next model call on." });
      },
      onError: (e) => toast.error("API key not saved", { description: (e as Error).message }),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current model</CardTitle>
        </CardHeader>
        <CardContent>
          {settings.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : settings.error ? (
            <p className="text-sm text-decision-reject">{(settings.error as Error).message}</p>
          ) : data ? (
            <>
              <Row label="Provider" value={PROVIDER_LABELS[data.provider] ?? data.provider} />
              <Row label="Model" value={data.model} />
              <Row
                label="API key"
                value={data.key_set ? `set · ends ${data.key_hint}` : "not set"}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Used to read uploaded policies and for the reviewer chat. The key stays on the
                server and is never shown in full.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change API key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ai-api-key" className="text-xs font-medium text-muted-foreground">
                New API key
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ai-api-key"
                  type={visible ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Paste the provider key"
                  className="h-9 rounded-sm font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-sm"
                  aria-label={visible ? "Hide key" : "Show key"}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-8 w-full rounded-sm text-xs"
              disabled={!key.trim() || save.isPending || !!settings.error}
            >
              {save.isPending ? "Checking key with the provider…" : "Save key"}
            </Button>
            {save.isError && (
              <p className="flex items-start gap-1.5 text-xs text-decision-reject">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {(save.error as Error).message}
              </p>
            )}
            {save.data && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-decision-fast"
                />
                Saved{save.data.persisted ? " and kept after a server restart" : ""}.
                {save.data.warning ? ` ${save.data.warning}` : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The key is checked with the provider before it is saved. It takes effect immediately
              for policy uploads and the chat.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
