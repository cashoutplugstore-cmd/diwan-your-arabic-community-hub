import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  try {
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: auth, error: authError } = await callerClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    const sourceMessageId = typeof body?.sourceMessageId === "string" ? body.sourceMessageId : "";
    if (!roomId || !sourceMessageId)
      return json({ error: "roomId and sourceMessageId are required" }, 400);

    const { data: room } = await callerClient
      .from("rooms")
      .select("id,is_private,name,country_code")
      .eq("id", roomId)
      .maybeSingle();
    if (!room || room.is_private) return json({ error: "room_access_denied" }, 403);

    const { data: claim, error: claimError } = await admin
      .from("ai_response_events")
      .insert({ source_message_id: sourceMessageId, room_id: roomId, status: "processing" })
      .select("source_message_id")
      .maybeSingle();
    if (claimError?.code === "23505") return json({ duplicate: true }, 200);
    if (claimError || !claim) return json({ error: "orchestration_claim_failed" }, 409);

    const { data: source } = await admin
      .from("messages")
      .select("id,content,user_id,created_at")
      .eq("id", sourceMessageId)
      .eq("room_id", roomId)
      .maybeSingle();
    if (!source) return json({ error: "source_message_not_found" }, 404);

    const { data: bot } = await admin
      .from("ai_bots")
      .select("id,auth_user_id,username,display_name,persona,topics,enabled")
      .eq("enabled", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!bot) return json({ error: "no_ai_bot_available" }, 503);

    const { data: contextRows } = await admin
      .from("messages")
      .select("content,user_id,created_at")
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(8);
    const context = (contextRows ?? [])
      .reverse()
      .map((m) => String(m.content).slice(0, 500))
      .join("\n");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    let text = "";
    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5-mini",
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: `أنت ${bot.display_name}، بوت ذكاء اصطناعي معلن داخل ديوان. لا تنتحل شخصية إنسان. الغرفة: ${String(room.name ?? room.id).slice(0, 120)}. تحدث بالعربية بشكل طبيعي وقصير. السياق المأخوذ من الخادم فقط:\n${context}`,
                },
              ],
            },
            {
              role: "user",
              content: [{ type: "input_text", text: String(source.content).slice(0, 2000) }],
            },
          ],
          max_output_tokens: 180,
        }),
      });
      const result = await response.json();
      if (response.ok) text = String(result?.output_text ?? "").trim();
    }
    if (!text) text = "إي والله 😄 خل نشوف شنو رأي البقية.";

    const { data: saved, error: saveError } = await admin
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: bot.auth_user_id,
        content: text,
        reply_to_id: sourceMessageId,
      })
      .select("id,room_id,user_id,content,created_at,reply_to_id,edited_at,is_deleted")
      .single();
    if (saveError) throw saveError;
    await admin
      .from("ai_response_events")
      .update({
        status: "completed",
        bot_user_id: bot.auth_user_id,
        response_message_id: saved.id,
        completed_at: new Date().toISOString(),
      })
      .eq("source_message_id", sourceMessageId);
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", bot.auth_user_id)
      .maybeSingle();
    return json({ duplicate: false, message: { ...saved, author: profile } });
  } catch {
    return json({ error: "ai_request_failed" }, 500);
  }
});
