import type { Profile } from "@/types";
import { createOpenAIResponse } from "@/integrations/supabase/client.server";
import {
  AI_DEMO_LIMITS,
  buildDemoMemberPrompt,
  getPersonaForDemoProfile,
} from "./ai-demo-members";

const roomActivity = new Map<string, { startedAt: number; replies: number; lastReplyAt: number }>();

function canGenerate(roomId: string): boolean {
  const now = Date.now();
  const current = roomActivity.get(roomId);
  if (!current || now - current.startedAt >= 60 * 60 * 1000) {
    roomActivity.set(roomId, { startedAt: now, replies: 0, lastReplyAt: 0 });
    return true;
  }
  return current.replies < AI_DEMO_LIMITS.maxRepliesPerRoomPerHour && now - current.lastReplyAt >= AI_DEMO_LIMITS.minDelayMs;
}

function markGenerated(roomId: string) {
  const current = roomActivity.get(roomId);
  if (!current) return;
  current.replies += 1;
  current.lastReplyAt = Date.now();
}

export async function generateDemoMemberReply(input: {
  roomId: string;
  member: Profile;
  roomTopic: string;
  recentMessages: string[];
}): Promise<string | null> {
  if (!canGenerate(input.roomId)) return null;

  const persona = getPersonaForDemoProfile(input.member);
  const prompt = buildDemoMemberPrompt(persona, input.roomTopic, input.recentMessages);

  const reply = await createOpenAIResponse({
    userText: prompt,
    systemText:
      "أنت محرّك نشاط لأعضاء AI تجريبيين في ديوان. اكتب رسائل قصيرة وطبيعية بالعربية. لا تدّعي أنك إنسان حقيقي. لا تختلق أخباراً أو معلومات حساسة. لا تكرر السياق حرفياً.",
  });

  const cleaned = reply.trim();
  if (!cleaned || cleaned.length > 500) return null;

  markGenerated(input.roomId);
  return cleaned;
}
