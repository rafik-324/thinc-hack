// Client-side function middleware: attaches the current Supabase session as a
// bearer token so requireSupabaseAuth server functions can verify the caller.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return next();
    return next({
      sendContext: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  },
);
