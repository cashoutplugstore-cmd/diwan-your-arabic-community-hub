import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateDirectRoom(targetUserId: string): Promise<string> {
  const { data, error } = await (supabase as any).rpc("get_or_create_direct_room", {
    target_user_id: targetUserId,
  });
  if (error) throw error;
  if (!data) throw new Error("تعذر فتح المحادثة الخاصة");
  return String(data);
}
