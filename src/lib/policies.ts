import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PolicyRow {
  id: string;
  version: string;
  name: string;
  file_name: string | null;
  created_at: string;
}

const db = supabase as unknown as { from: (t: string) => any };

/** All uploaded policies from the database, oldest first. Every policy picker reads this. */
export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async (): Promise<PolicyRow[]> => {
      const { data, error } = await db
        .from("policies")
        .select("id,version,name,file_name,created_at")
        .order("created_at");
      if (error) throw error;
      return data as PolicyRow[];
    },
  });
}

export function useUploadPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { version: string; name: string; file: File }) => {
      const content = await input.file.text();
      const { error } = await db.from("policies").insert({
        version: input.version.trim(),
        name: input.name.trim(),
        file_name: input.file.name,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}
