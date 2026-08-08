import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateDemoMemberReply } from "@/lib/ai-demo-engine.server";
import { getDailyDemoProfiles } from "@/lib/demo-community";

const processedMessages = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function pruneProcessed(now: number) {
  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > DEDUPE_WINDOW_MS) processedMessages.delete(key);
  }
}

export const Route = createFileRoute("/api/ai-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            messageId?: unknown;
            roomId?: unknown;
            content?: unknown;
            roomTopic?: unknown;
          };

          const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
          const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
          const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
          const roomTopic = typeof body.roomTopic === "string" ? body.roomTopic.trim().slice(0, 300) : "نقاش عام";

          if (!messageId || !roomId || !content) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const now = Date.now();
          pruneProcessed(now);
          if (processedMessages.has(messageId)) {
            return Response.json({ ok: true, duplicate: true });
          }
          processedMessages.set(messageId, now);

          const profiles = getDailyDemoProfiles(120);
          const member = profiles[Math.abs(hash(roomId + messageId)) % profiles.length];
          const reply = await generateDemoMemberReply({
            roomId,
            member,
            roomTopic,
            recentMessages: [content],
          });

          if (!reply) return Response.json({ ok: true, generated: false });

          // Broadcast only: AI demo messages remain synthetic and are not written as fake users to the DB.
          // This lets every connected room participant see the same generated activity.
          const channel = supabaseAdmin.channel(`room-messages-${roomId}`);
          await channel.httpSend("ai-demo-message", {
            id: `ai-demo-${messageId}`,
            room_id: roomId,
            user_id: member.id,
            content: reply,
            created_at: new Date().toISOString(),
            reply_to_id: null,
            edited_at: null,
            is_deleted: false,
            author: member,
          });
          await supabaseAdmin.removeChannel(channel);

          return Response.json({ ok: true, generated: true });
        } catch (error) {
          console.error("[AI Demo] generation failed", error);
          return Response.json({ ok: false, generated: false }, { status: 500 });
        }
      },
    },
  },
});

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}
