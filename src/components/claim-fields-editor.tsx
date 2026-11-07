import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Fields = Record<string, unknown>;
type Change = {
  id: number;
  field: string;
  old_value: unknown;
  new_value: unknown;
  editor: string;
  created_at: string;
};

const isBoolLike = (v: unknown) =>
  typeof v === "boolean" || (typeof v === "string" && /^(true|false)$/i.test(v));
const show = (v: unknown) => (v === null || v === undefined ? "—" : String(v));
const label = (k: string) => k.replace(/_/g, " ");

/** Fields with a fixed set of values (from the case data) are edited with a dropdown. */
const CHOICES: Record<string, string[]> = {
  case_status: ["open", "closed"],
  claim_type: ["motor_own_damage", "theft"],
  repair_type: ["standard", "ev_high_voltage_battery"],
};

/** Keep an unexpected current value selectable so it is never silently dropped. */
const withCurrent = (options: string[], current: string | undefined) =>
  current && !options.includes(current) ? [current, ...options] : options;

function FieldSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-9 w-full rounded-sm font-mono text-sm">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option} className="font-mono text-sm">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Restore the original JSON type (number, boolean, "True"/"False" text) of an edited value. */
function coerce(original: unknown, text: string): unknown {
  if (typeof original === "number") return Number(text);
  if (typeof original === "boolean") return text.toLowerCase() === "true";
  if (typeof original === "string" && /^(true|false)$/i.test(original)) {
    const t = text.toLowerCase() === "true";
    return original.charAt(0) === original.charAt(0).toUpperCase() ? (t ? "True" : "False") : String(t);
  }
  return text;
}

export function ClaimFieldsEditor({ caseId, section }: { caseId: string; section: "fields" | "history" }) {
  const qc = useQueryClient();
  const fieldsQ = useQuery({
    queryKey: ["claim-fields", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("source_fields")
        .eq("case_id", caseId)
        .single();
      if (error) throw error;
      return (data.source_fields ?? {}) as Fields;
    },
  });
  const historyQ = useQuery({
    queryKey: ["claim-changes", caseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("claim_field_changes")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Change[];
    },
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fieldsQ.data) return;
    setDraft(Object.fromEntries(Object.entries(fieldsQ.data).map(([k, v]) => [k, show(v) === "—" ? "" : String(v)])));
  }, [fieldsQ.data]);

  const original = fieldsQ.data ?? {};
  const changed = Object.keys(draft).filter(
    (k) => k !== "case_id" && String(original[k] ?? "") !== draft[k],
  );

  const save = async () => {
    if (!editor.trim()) {
      toast.error("Bitte deinen Namen angeben.");
      return;
    }
    for (const k of changed) {
      if (typeof original[k] === "number" && !Number.isFinite(Number(draft[k])))
      {
        toast.error(`${label(k)} muss eine Zahl sein.`);
        return;
      }
    }
    const payload = Object.fromEntries(changed.map((k) => [k, coerce(original[k], draft[k] ?? "")]));
    setSaving(true);
    const { error } = await (supabase.rpc as any)("update_claim_fields", {
      p_case_id: caseId,
      p_fields: payload,
      p_editor: editor.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${changed.length} Feld(er) gespeichert.`);
    qc.invalidateQueries({ queryKey: ["claim-fields", caseId] });
    qc.invalidateQueries({ queryKey: ["claim-changes", caseId] });
    qc.invalidateQueries({ queryKey: ["live-claims"] });
  };

  if (section === "fields") return (
        <div className="space-y-3">
          {fieldsQ.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(original).map(([k, v]) => {
              const id = `f-${k}`;
              const wide = k === "claim_summary";
              return (
                <div key={k} className={`space-y-1.5 ${wide ? "col-span-2" : ""}`}>
                  <label htmlFor={id} className="eyebrow block">{label(k)}</label>
                  {CHOICES[k] ? (
                    <FieldSelect
                      id={id}
                      value={draft[k] ?? ""}
                      options={withCurrent(CHOICES[k], draft[k])}
                      onChange={(value) => setDraft({ ...draft, [k]: value })}
                    />
                  ) : isBoolLike(v) ? (
                    <FieldSelect
                      id={id}
                      value={(draft[k] ?? "").toLowerCase()}
                      options={["true", "false"]}
                      onChange={(value) => setDraft({ ...draft, [k]: value })}
                    />
                  ) : (
                    <Input
                      id={id}
                      className="h-9 rounded-sm font-mono text-sm tabular-nums"
                      disabled={k === "case_id"}
                      value={draft[k] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-end gap-2 pt-1">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="f-editor" className="eyebrow block">Edited by</label>
              <Input id="f-editor" className="h-9 rounded-sm" placeholder="Your name" value={editor} onChange={(e) => setEditor(e.target.value)} />
            </div>
            <Button className="h-9 rounded-sm" disabled={!changed.length || saving} onClick={save}>
              {saving ? "Saving…" : `Save ${changed.length || ""}`.trim()}
            </Button>
          </div>
        </div>
  );

  return (
      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium text-foreground">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" strokeWidth={1.5} />
          Change history
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {historyQ.data?.length ?? 0}
          </span>
        </summary>
        <div className="border-t border-border p-3">
          {!historyQ.data?.length ? (
            <p className="text-xs text-muted-foreground">No changes yet.</p>
          ) : (
            <ul className="ml-1 space-y-3 border-l border-border pl-4">
              {historyQ.data.map((c) => (
                <li key={c.id} className="relative space-y-1 text-sm">
                  <span aria-hidden="true" className="absolute top-1.5 -left-[21px] size-1.5 rounded-full bg-foreground" />
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("en-GB")} · {c.editor}
                  </p>
                  <p className="text-foreground">{label(c.field)}</p>
                  <p className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {show(c.old_value)}
                    <ArrowRight aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                    <span className="text-foreground">{show(c.new_value)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
  );
}
