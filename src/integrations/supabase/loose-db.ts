import { supabase } from "@/integrations/supabase/client";

/**
 * Loosely typed access for tables that are not part of the generated types yet
 * (optional/legacy features). Queries degrade gracefully when the table is absent.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const looseDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};
