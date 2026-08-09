import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_PROFILES } from "@/lib/demo-community";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;

type AIReplyHandler = (reply: MessageWithAuthor) => void;
const recentAIContent = new Map<string, string[]>();
const scheduledAIByMessage = new Set<string>();

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

function uniqueAIContent(roomId: string, candidate: string, salt: number, source: string) {
  const normalized = candidate.trim().replace(/\s+/g, " ");
  const recent = recentAIContent.get(roomId) ?? [];
  if (normalized && !recent.includes(normalized)) {
    recentAIContent.set(roomId, [...recent, normalized].slice(-6));
    return normalized;
  }
  const seed = Math.abs([...`${roomId}:${source}:${salt}:${recent.length}`].reduce((n, c) => n * 33 + c.charCodeAt(0), 7));
  for (let offset = 0; offset < fallbackReplies.length; offset += 1) {
    const fallback = fallbackReplies[(seed + offset) % fallbackReplies.length]!;
    if (!recent.includes(fallback)) {
      recentAIContent.set(roomId, [...recent, fallback].slice(-6));
      return fallback;
    }
  }
  return normalized || "إي والله 😄";
}

function fallbackReply(author: Profile, roomId: string, source: string, salt: number, createdAt: number): MessageWithAuthor {
  const content = uniqueAIContent(roomId, "", salt, source);
  return { id: `ai-fallback-${roomId}-${createdAt}-${salt}`, room_id: roomId, user_id: author.id, content, created_at: new Date(createdAt).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author };
}

async function requestAIRoomReply(roomId: string, message: string, salt: number, createdAt: number, onReply?: AIReplyHandler) {
  const author = aiAuthorFor(roomId, salt);
  try {
    const recent = (recentAIContent.get(roomId) ?? []).slice(-4);
    const { data, error } = await supabase.functions.invoke("diwan-ai-room", {
      body: {
        roomId, roomName: roomId, message, language: "ar",
        persona: author.display_name || author.username || "عضو من ديوان",
        recentReplies: recent,
        instruction: `رد كعضو مجتمعي عربي بشكل طبيعي ومختصر. لا تكرر أي رد سابق. استخدم أسلوباً مختلفاً عن الأعضاء الآخرين، ولهجة عراقية/عربية خفيفة حسب السياق، ولا تجعل كل رد يبدأ أو ينتهي بنفس الطريقة. ${salt > 1 ? "هذا رد متابعة؛ أضف فكرة أو سؤالاً جديداً بدل إعادة كلام الرسالة السابقة." : "ابدأ برد مستقل ومناسب لسياق الرسالة."}`,
      },
    });
    if (!error && data?.text && onReply) {
      const content = uniqueAIContent(roomId, String(data.text), salt, message);
      onReply({ id: `ai-live-${roomId}-${createdAt}-${salt}`, room_id: roomId, user_id: author.id, content, created_at: new Date(createdAt).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author });
      return;
    }
  } catch {
    // AI is optional; use a local varied fallback so the room never feels dead.
  }
  onReply?.(fallbackReply(author, roomId, message, salt, createdAt));
}

/** Schedule natural community reactions for one real message. */
export function triggerAIRoomReplies(input: { roomId: string; messageId: string; message: string; createdAt: string; onReply?: AIReplyHandler }) {
  if (!input.onReply || !input.message.trim()) return;
  const key = `${input.roomId}:${input.messageId}`;
  if (scheduledAIByMessage.has(key)) return;
  scheduledAIByMessage.add(key);

  const base = new Date(input.createdAt).getTime();
  const firstDelay = 1800 + Math.floor(Math.random() * 1200);
  const secondDelay = 4300 + Math.floor(Math.random() * 1700);

  void requestAIRoomReply(input.roomId, input.message, 1, base + firstDelay, input.onReply);
  if (typeof window !== "undefined") {
    window.setTimeout(() => void requestAIRoomReply(input.roomId, input.message, 2, base + secondDelay, input.onReply), secondDelay);
  } else {
    void requestAIRoomReply(input.roomId, input.message, 2, base + secondDelay, input.onReply);
  }
}

export async function sendMessage(input: { roomId: string; userId: string; content: string; replyToId?: string | null; onAIReply?: AIReplyHandler }) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const clientCreatedAt = new Date().toISOString();
  const { data, error } = await supabase.from("messages").insert({ room_id: input.roomId, user_id: input.userId, content, reply_to_id: input.replyToId ?? null }).select("id,created_at").single();
  if (error) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));

  const messageId = data?.id ?? `${input.userId}:${clientCreatedAt}`;
  const createdAt = data?.created_at ?? clientCreatedAt;
  triggerAIRoomReplies({ roomId: input.roomId, messageId, message: content, createdAt, onReply: input.onAIReply });
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
