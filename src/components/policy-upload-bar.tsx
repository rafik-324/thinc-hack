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
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_340px]">
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
            "flex min-h-[112px] flex-col items-center justify-center gap-1.5 p-4 text-center transition-colors lg:border-r lg:border-border",
            dragging ? "bg-muted/60" : "hover:bg-muted/25",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background",
              dragging && "border-foreground/40",
            )}
          >
            <Upload aria-hidden="true" className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </span>
          <span className="space-y-0.5">
            <span className="block text-[13px] font-medium tracking-normal text-foreground">
              Policy file here
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Drop it in this field or click to browse
            </span>
          </span>
          {file ? (
            <span className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground">
              <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-decision-fast" />
              {file.name}
              <span className="text-muted-foreground">· {formatSize(file.size)}</span>
            </span>
          ) : (
            <span className="font-mono text-[9px] tracking-[0.04em] text-muted-foreground uppercase">
              .txt .md .json .yaml .csv
            </span>
          )}
        </button>

        {/* Fields */}
        <div className="flex flex-col justify-center gap-2 p-4">
          <span className="eyebrow font-mono text-[9px] uppercase tracking-[0.04em] text-muted-foreground">
            New policy
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Version"
              placeholder="Version, e.g. v3"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-8 font-mono text-xs"
            />
            <Input
              aria-label="Name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {taken && (
            <span className="text-[11px] font-medium text-decision-reject">
              This version already exists.
            </span>
          )}
          <Button size="sm" className="h-8 w-full text-xs" disabled={!canSubmit} onClick={submit}>
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
