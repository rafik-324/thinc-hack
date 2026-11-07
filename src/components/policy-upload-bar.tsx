import { useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePolicies, useUploadPolicy } from "@/lib/policies";
import { cn } from "@/lib/utils";

const ACCEPT = ".txt,.md,.json,.yaml,.yml,.csv";

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
  const [version, setVersion] = useState("");
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);

  const taken = policies.some((p) => p.version === version.trim());
  const canSubmit = !!file && version.trim() && name.trim() && !taken && !upload.isPending;

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { version, name, file },
      {
        onSuccess: () => {
          toast.success(`${name} hochgeladen`);
          setFile(null);
          setVersion("");
          setName("");
          if (fileRef.current) fileRef.current.value = "";
        },
        onError: (e) =>
          toast.error("Upload fehlgeschlagen", { description: String((e as Error).message) }),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Big drop area */}
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
            "flex min-h-64 flex-col items-center justify-center gap-4 p-10 text-center transition-colors lg:border-r lg:border-border",
            dragging ? "bg-muted/60" : "hover:bg-muted/25",
          )}
        >
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background",
              dragging && "border-foreground/40",
            )}
          >
            <Upload aria-hidden="true" className="h-7 w-7 text-muted-foreground" strokeWidth={1.4} />
          </span>
          <span className="space-y-1.5">
            <span className="block text-lg font-medium tracking-normal text-foreground">
              Policy file here
            </span>
            <span className="block text-sm text-muted-foreground">
              Drop it in this field or click to browse
            </span>
          </span>
          {file ? (
            <span className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs tabular-nums text-foreground">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-decision-fast" />
              {file.name}
              <span className="text-muted-foreground">· {formatSize(file.size)}</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
              .txt .md .json .yaml .csv
            </span>
          )}
        </button>

        {/* Fields */}
        <div className="flex flex-col justify-center gap-4 p-6">
          <span className="eyebrow font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
            New policy
          </span>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Version</span>
            <Input
              aria-label="Version"
              placeholder="e.g. v3"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-11 font-mono text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              aria-label="Name"
              placeholder="Policy name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-sm"
            />
          </label>

          {taken && (
            <span className="text-xs font-medium text-decision-reject">
              This version already exists.
            </span>
          )}

          <Button
            size="lg"
            className="mt-1 h-11 w-full text-sm"
            disabled={!canSubmit}
            onClick={submit}
          >
            {upload.isPending ? "Uploading…" : "Upload policy"}
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </CardContent>
    </Card>
  );
}
