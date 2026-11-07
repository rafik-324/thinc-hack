import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolicies, useUploadPolicy } from "@/lib/policies";

export function PolicyUploadBar() {
  const { data: policies = [] } = usePolicies();
  const upload = useUploadPolicy();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [name, setName] = useState("");

  const taken = policies.some((p) => p.version === version.trim());
  const canSubmit = !!file && version.trim() && name.trim() && !taken && !upload.isPending;

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
        onError: (e) => toast.error("Upload fehlgeschlagen", { description: String((e as Error).message) }),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <span className="eyebrow pl-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
        New policy
      </span>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.json,.yaml,.yml,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
        }}
      />
      <Button variant="outline" size="sm" className="h-8" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" /> {file ? file.name : "Choose file"}
      </Button>
      <Input
        aria-label="Version"
        placeholder="Version, e.g. v3"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        className="h-8 w-36 font-mono text-xs"
      />
      <Input
        aria-label="Name"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-56 text-xs"
      />
      {taken && <span className="text-xs text-decision-reject">Version exists</span>}
      <Button size="sm" className="ml-auto h-8" disabled={!canSubmit} onClick={submit}>
        {upload.isPending ? "Uploading…" : "Upload policy"}
      </Button>
    </div>
  );
}
