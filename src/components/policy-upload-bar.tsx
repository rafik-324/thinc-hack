import { useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  describeApply,
  describeApplyError,
  useApplyPolicy,
  usePolicies,
  useUploadPolicy,
  type ApplyResult,
} from "@/lib/policies";
import { usePolicy } from "@/lib/policy-store";
import { POLICY_FILE_ACCEPT, POLICY_FILE_HINT } from "@/lib/policy-file";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyUploadBar() {
  const { data: policies = [] } = usePolicies();
  const upload = useUploadPolicy();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  // The version is suggested automatically (next free vN) but stays editable; no separate name.
  const [edited, setEdited] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(true);
  const { setMode } = usePolicy();
  const applyPolicy = useApplyPolicy();
  const [result, setResult] = useState<ApplyResult | null>(null);

  const runUpdate = (v: string) => {
    setResult(null);
    applyPolicy.mutate(v, {
      onSuccess: (r) => {
        setResult(r);
        setMode(v);
        toast.success(`Policy ${v} applied`, { description: describeApply(r) });
      },
      onError: (e) => toast.error("Policy update failed", { description: describeApplyError(e) }),
    });
  };

  const nextVersion = `v${Math.max(1, ...policies.map((p) => Number(/^v(\d+)$/i.exec(p.version)?.[1] ?? 0))) + 1}`;
  const version = edited ?? nextVersion;
  const setVersion = setEdited;
  const taken = policies.some((p) => p.version === version.trim() && p.has_content);
  const canSubmit =
    !!file && version.trim() && !taken && !upload.isPending && !applyPolicy.isPending;

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
  };

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { version, name: `Policy ${version.trim()}`, file },
      {
        onSuccess: () => {
          // Uploading a policy immediately processes every claim with it and compares to the old version.
          const uploaded = version.trim();
          toast.success(`Policy ${uploaded} uploaded`, { description: "Re-checking every claim…" });
          setMode(uploaded); // switch the top bar to the new version right away
          runUpdate(uploaded);
          setFile(null);
          setEdited(null);
          if (fileRef.current) fileRef.current.value = "";
        },
        onError: (e) => toast.error("Upload failed", { description: String((e as Error).message) }),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/25"
      >
        <span className="eyebrow font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
          Policy upload
        </span>
        {file && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-foreground">
            <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-decision-fast" />
            {file.name}
            <span className="text-muted-foreground">· {formatSize(file.size)}</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {open ? "Collapse" : "Expand"}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 transition-transform duration-300 ease-out",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("overflow-hidden", !open && "invisible")} inert={!open}>
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* Drop area */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                dragging ? "bg-muted/60" : "hover:bg-muted/25",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background",
                  dragging && "border-foreground/40",
                )}
              >
                <Upload
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </span>
              <span className="min-w-0">
                {file ? (
                  <span className="flex items-center gap-1.5 truncate font-mono text-[11px] tabular-nums text-foreground">
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 text-decision-fast"
                    />
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      · {formatSize(file.size)}
                    </span>
                  </span>
                ) : (
                  <span className="block text-[12px] font-medium tracking-normal text-foreground">
                    Drop a policy file or click to browse
                  </span>
                )}
                <span className="block font-mono text-[9px] tracking-[0.04em] text-muted-foreground uppercase">
                  {POLICY_FILE_HINT}
                </span>
              </span>
            </button>

            {/* Fields */}
            <div className="flex flex-col gap-1.5 px-4 py-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                <Input
                  aria-label="Version"
                  placeholder={nextVersion}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="h-7 font-mono text-xs"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs disabled:border disabled:border-border disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-100"
                  disabled={!canSubmit}
                  onClick={submit}
                  title={file ? undefined : "Choose a policy file first"}
                >
                  {upload.isPending
                    ? "Uploading…"
                    : applyPolicy.isPending
                      ? "Running…"
                      : "Upload & apply"}
                </Button>
              </div>
              {!file && !result && !applyPolicy.isPending && !applyPolicy.isError && (
                <span className="text-[11px] text-muted-foreground">
                  Choose a policy file to enable upload.
                </span>
              )}
              {taken && (
                <span className="text-[11px] font-medium text-decision-reject">
                  This version already exists.
                </span>
              )}
              {applyPolicy.isPending && (
                <span className="text-[11px] text-muted-foreground">
                  Re-checking every claim, about half a minute…
                </span>
              )}
              {applyPolicy.isError && (
                <span className="text-[11px] font-medium text-decision-reject">
                  {describeApplyError(applyPolicy.error)}
                </span>
              )}
              {result && (
                <span
                  className="text-[11px] leading-snug text-muted-foreground"
                  title={[
                    result.summary,
                    ...result.citations.map((c) => `${c.target}: ${c.new_quote}`),
                  ]
                    .filter(Boolean)
                    .join("\n")}
                >
                  <span className="font-medium text-foreground">
                    {result.baseline_version} → {result.version}:
                  </span>{" "}
                  {describeApply(result)}
                </span>
              )}
            </div>
          </CardContent>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={POLICY_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
    </Card>
  );
}
