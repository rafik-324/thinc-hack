import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { REVIEWER_API } from "@/lib/policies";

/** What the backend reports about the AI model; the key itself never reaches the browser. */
export interface AiSettings {
  provider: string;
  model: string;
  base_url: string;
  key_set: boolean;
  /** Last four characters, e.g. "…f0f5". */
  key_hint: string;
}

export interface AiKeySaved extends AiSettings {
  saved: boolean;
  persisted: boolean;
  warning: string | null;
}

async function call<T>(init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${REVIEWER_API}/api/settings/ai`, init);
  } catch {
    throw new Error(
      `Backend not reachable at ${REVIEWER_API}. Start it with: python3 -m backend --ui-origin ${window.location.origin}`,
    );
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `Backend error ${res.status}`);
  return body;
}

const KEY = ["settings", "ai"];

export function useAiSettings() {
  return useQuery({ queryKey: KEY, queryFn: () => call<AiSettings>(), retry: false });
}

export function useSaveAiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      call<AiKeySaved>({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      }),
    onSuccess: (saved) => qc.setQueryData(KEY, saved),
  });
}
