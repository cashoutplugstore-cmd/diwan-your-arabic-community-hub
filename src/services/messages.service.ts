import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_PROFILES } from "@/lib/demo-community";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

type AIReplyHandler = (reply: MessageWithAuthor) => void;

/** Only real member messages are loaded as persistent conversation history. */
export async function fetchMessagePage(roomId: string, before?: string | null): Promise<MessageWithAuthor[]> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  const realRows = (error ? [] : (data ?? [])).filter((m) => !String(m.user_id).startsWith("demo-")).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return realRows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null, is_deleted: Boolean(m.is_deleted) }));
}

function aiAuthorFor(roomId: string, salt = 0) {
  const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, (2166136261 ^ salt) >>> 0);
  return DEMO_PROFILES[hash % DEMO_PROFILES.length]!;
}

const fallbackReplies = [
  "ههههه إي والله 😂", "أتفق وياك، هاي السالفة تستاهل نحچي بيها 😄", "صحيح! منو عنده تجربة ثانية؟ 👀",
  "والله سؤال حلو، خل نشوف رأي البقية 🌷", "أنا أشوف الموضوع يعتمد على الشخص والظرف.",
  "ههههه نفس الشي صار وياي قبل 😂", "حلوة الفكرة! كملوا، أريد أسمع أكثر ❤️",
  "إذا أحد يعرف مكان زين لا يبخل علينا ☕", "اليوم الغرفة شكلها راح تصير سوالف 😄", "شنو رأيكم نسويها بهالشكل؟ 👌",
];

function fallbackReply(author: Profile, roomId: string, source: string, salt: number): MessageWithAuthor {
  const index = Math.abs([...`${roomId}:${source}:${salt}`].reduce((n, c) => n * 33 + c.charCodeAt(0), 7)) % fallbackReplies.length;
  const now = Date.now() + salt * 1400;
  return { id: `ai-fallback-${roomId}-${now}`, room_id: roomId, user_id: author.id, content: fallbackReplies[index]!, created_at: new Date(now).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}

async function requestAIRoomReply(roomId: string, message: string, salt: number, onReply?: AIReplyHandler) {
  const author = aiAuthorFor(roomId, salt);
  try {
    const { data, error } = await supabase.functions.invoke("diwan-ai-room", {
      body: {
        roomId, roomName: roomId, message, language: "ar",
        persona: author.display_name || author.username || "عضو من ديوان",
        instruction: "رد كعضو طبيعي في غرفة عربية. لا تكرر نفس الصياغة. استخدم لهجة عراقية/عربية خفيفة حسب السياق، وتجنب الإطالة والرسائل الرسمية. لا تدّعي أنك إنسان حقيقي؛ هذا حساب AI مجتمعي.",
      },
    });
    if (!error && data?.text && onReply) {
      const now = Date.now() + salt * 1400;
      onReply({ id: `ai-live-${roomId}-${now}-${salt}`, room_id: roomId, user_id: author.id, content: String(data.text).trim(), created_at: new Date(now).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author });
      return;
    }
  } catch {
    // AI is optional; use a local varied fallback so the room never feels dead.
  }
  onReply?.(fallbackReply(author, roomId, message, salt));
}

export async function sendMessage(input: { roomId: string; userId: string; content: string; replyToId?: string | null; onAIReply?: AIReplyHandler }) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const { error } = await supabase.from("messages").insert({ room_id: input.roomId, user_id: input.userId, content, reply_to_id: input.replyToId ?? null });
  if (error) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));

  // Wake a rotating group of AI community members after a real message.
  void requestAIRoomReply(input.roomId, content, 1, input.onAIReply);
  if (input.onAIReply && typeof window !== "undefined") {
    const secondDelay = 2600 + Math.floor(Math.random() * 2200);
    window.setTimeout(() => void requestAIRoomReply(input.roomId, content, 2, input.onAIReply), secondDelay);
    if (Math.random() > 0.55) {
      const thirdDelay = secondDelay + 3000 + Math.floor(Math.random() * 3000);
      window.setTimeout(() => void requestAIRoomReply(input.roomId, content, 3, input.onAIReply), thirdDelay);
    }
  }
}

export async function editMessage(id: string, content: string) {
  const { error } = await supabase.from("messages").update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
  if (error) throw error;
}

export const messagesQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["messages", roomId], queryFn: () => fetchMessagePage(roomId!), enabled: Boolean(roomId) });
