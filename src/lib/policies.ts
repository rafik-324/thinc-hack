import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readPolicyFile } from "@/lib/policy-file";

export interface PolicyRow {
  id: string;
  version: string;
  name: string;
  file_name: string | null;
  created_at: string;
  /** False for seeded placeholders whose text has not been uploaded yet. */
  has_content: boolean;
}

const db = supabase as unknown as { from: (t: string) => any };

/** All uploaded policies from the database, oldest first. Every policy picker reads this. */
export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async (): Promise<PolicyRow[]> => {
      const { data, error } = await db
        .from("policies")
        .select("id,version,name,file_name,created_at,content")
        .order("created_at");
      if (error) throw error;
      return (data as (Omit<PolicyRow, "has_content"> & { content: string | null })[]).map(
        ({ content, ...row }) => ({ ...row, has_content: !!content?.trim() }),
      );
    },
  });
}

export function useUploadPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { version: string; name: string; file: File }) => {
      const content = await readPolicyFile(input.file);
      const row = { name: input.name.trim(), file_name: input.file.name, content };
      const version = input.version.trim();
      // A seeded placeholder (empty content) is filled once; after that a version is immutable.
      const filled = await db
        .from("policies")
        .update(row)
        .eq("version", version)
        .eq("content", "")
        .select("id");
      if (filled.error) throw filled.error;
      if (filled.data?.length) return;
      const { error } = await db.from("policies").insert({ version, ...row });
      if (error) {
        if (error.code === "23505") throw new Error(`Policy ${version} already has a text.`);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}
