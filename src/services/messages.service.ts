import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aiMembers, buildAiConversation } from "@/data/aiMembers";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;
type AIReplyHandler = (reply: MessageWithAuthor) => void;
const recentAIContent = new Map<string, string[]>();
const scheduledAIByMessage = new Set<string>();
const aiCursorByRoom = new Map<string, number>();
const lastAIReplyAtByRoom = new Map<string, number>();
const AI_ROOM_COOLDOWN_MS = 12000;

export async function fetchMessagePage(roomId: string, before?: string | null): Promise<MessageWithAuthor[]> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  const realRows = error ? [] : (data ?? []).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  if (!before) {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user?.id) {
      const { data: room } = await supabase.from("rooms").select("is_private").eq("id", roomId).maybeSingle();
      if (room?.is_private === true) void (supabase as any).rpc("mark_private_chat_read", { _room_id: roomId });
    }
  }
  return realRows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null, is_deleted: Boolean(m.is_deleted) }));
}

function hashRoom(roomId: string) {
  let hash = 2166136261;
  for (const char of roomId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Math.abs(hash >>> 0);
}

function dialectForCountry(countryCode: string | null | undefined) {
  const value = String(countryCode ?? '').toLowerCase().trim();
  if (value === 'iq' || value.includes('iraq') || value.includes('العراق')) return 'iraqi' as const;
  if (value === 'sa' || value.includes('saudi') || value.includes('السعود')) return 'saudi' as const;
  if (value === 'kw' || value.includes('kuwait') || value.includes('الكويت')) return 'kuwaiti' as const;
  if (value === 'ae' || value.includes('uae') || value.includes('emirat') || value.includes('الإمارات')) return 'emirati' as const;
  if (value === 'qa' || value.includes('qatar') || value.includes('قطر')) return 'qatari' as const;
  if (value === 'bh' || value.includes('bahrain') || value.includes('البحرين')) return 'bahraini' as const;
  if (value === 'om' || value.includes('oman') || value.includes('عمان')) return 'omani' as const;
  return null;
}

async function aiMemberFor(roomId: string, salt: number): Promise<{ member: typeof aiMembers[number]; author: Profile }> {
  const { data: room } = await supabase.from("rooms").select("country_code, slug, name").eq("id", roomId).maybeSingle();
  const dialect = dialectForCountry(room?.country_code) ?? dialectForCountry(`${room?.slug ?? ''} ${room?.name ?? ''}`);
  const pool = dialect ? aiMembers.filter((member) => member.dialect === dialect) : aiMembers;
  const cursor = aiCursorByRoom.get(roomId) ?? 0;
  const start = (hashRoom(roomId) + cursor + salt - 1) % Math.max(pool.length, 1);
  aiCursorByRoom.set(roomId, cursor + 1);
  const member = pool[start] ?? aiMembers[(hashRoom(roomId) + salt) % aiMembers.length]!;
  const author = { id: member.id, display_name: member.name, username: member.id, avatar_url: null, bio: member.personality, status: "online", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Profile;
  return { member, author };
}

const fallbackReplies = ["ههههه إي والله 😂", "أتفق وياك 😄", "لااا شنو هالحچي 😂", "والله سؤال حلو 👀", "حلوة السالفة، كملوا 😄", "ذكرتيني بموقف صار وياي 😂", "منو جربها؟ 👀", "خل نسويها ونشوف 😂"];
function uniqueAIContent(roomId: string, candidate: string, salt: number, source: string) {
  const normalized = candidate.trim().replace(/\s+/g, " ");
  const recent = recentAIContent.get(roomId) ?? [];
  if (normalized && !recent.includes(normalized)) {
    recentAIContent.set(roomId, [...recent, normalized].slice(-10));
    return normalized;
  }
  const seed = Math.abs([...`${roomId}:${source}:${salt}:${recent.length}`].reduce((n, c) => n * 33 + c.charCodeAt(0), 7));
  for (let offset = 0; offset < fallbackReplies.length; offset++) {
    const fallback = fallbackReplies[(seed + offset) % fallbackReplies.length]!;
    if (!recent.includes(fallback)) {
      recentAIContent.set(roomId, [...recent, fallback].slice(-10));
      return fallback;
    }
  }
  return normalized || "إي والله 😄";
}

function fallbackReply(author: Profile, roomId: string, message: string, salt: number, createdAt: number, member: typeof aiMembers[number]): MessageWithAuthor {
  const conversation = buildAiConversation(member, recentAIContent.get(roomId) ?? [], message);
  const content = uniqueAIContent(roomId, conversation.text, salt, message);
  return {
    id: `virtual-message-${roomId}-${createdAt}-${salt}`,
    room_id: roomId,
    user_id: member.id,
    content,
    created_at: new Date(createdAt).toISOString(),
    reply_to_id: null,
    edited_at: null,
    is_deleted: false,
    author,
  } as MessageWithAuthor;
}

async function requestAIRoomReply(roomId: string, message: string, salt: number, createdAt: number, onReply?: AIReplyHandler) {
  const { member, author } = await aiMemberFor(roomId, salt);
  try {
    const recent = (recentAIContent.get(roomId) ?? []).slice(-6);
    const { data, error } = await supabase.functions.invoke("diwan-ai-room", {
      body: { roomId, roomName: roomId, message, language: "ar", persona: `${member.name} — ${member.personality}`, recentReplies: recent, topics: member.topics, instruction: `أنت ${member.name}، شخصية ${member.personality}. شارك في حوار عربي طبيعي وخفيف بلهجة ${member.dialect}. اهتم بمواضيعك: ${member.topics.join(", ")}. لا تكرر كلاماً سابقاً ولا تتحدث كروبوت. لا ترد إلا برد قصير ومناسب للسياق.` },
    });
    if (!error && data?.message && onReply) {
      const content = uniqueAIContent(roomId, String(data.message.content ?? data.text ?? ""), salt, message);
      onReply({ ...data.message, content, author: data.message.author ?? author, is_deleted: Boolean(data.message.is_deleted) } as MessageWithAuthor);
      return;
    }
  } catch { /* local fallback below */ }
  onReply?.(fallbackReply(author, roomId, message, salt, createdAt, member));
}

export function triggerAIRoomReplies(input: { roomId: string; messageId: string; message: string; createdAt: string; onReply?: AIReplyHandler }) {
  if (!input.onReply || !input.message.trim()) return;
  const key = `${input.roomId}:${input.messageId}`;
  if (scheduledAIByMessage.has(key)) return;
  const now = Date.now();
  const lastReplyAt = lastAIReplyAtByRoom.get(input.roomId) ?? 0;
  if (now - lastReplyAt < AI_ROOM_COOLDOWN_MS) return;
  lastAIReplyAtByRoom.set(input.roomId, now);
  scheduledAIByMessage.add(key);
  const delay = 1800 + Math.floor(Math.random() * 2200);
  window.setTimeout(() => {
    void requestAIRoomReply(input.roomId, input.message, 1, Date.now(), input.onReply);
    scheduledAIByMessage.delete(key);
  }, delay);
}

export async function sendMessage(input: { roomId: string; userId: string; content: string; replyToId?: string | null; onAIReply?: AIReplyHandler }) {
  const content = input.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new Error("empty");
  const clientCreatedAt = new Date().toISOString();
  const { data: room, error: roomError } = await supabase.from("rooms").select("is_private").eq("id", input.roomId).maybeSingle();
  if (roomError) throw roomError;
  const { data, error } = await supabase.from("messages").insert({ room_id: input.roomId, user_id: input.userId, content, reply_to_id: input.replyToId ?? null }).select("id,created_at").single();
  if (error) throw error;
  if (typeof window !== "undefined") window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`, String(Date.now()));
  if (room?.is_private === true) return;
  const replyInput = { roomId: input.roomId, messageId: data?.id ?? `${input.userId}:${clientCreatedAt}`, message: content, createdAt: data?.created_at ?? clientCreatedAt };
  if (input.onAIReply) triggerAIRoomReplies({ ...replyInput, onReply: input.onAIReply });
}

export async function editMessage(id: string, content: string) { const { error } = await supabase.from("messages").update({ content: content.trim().slice(0, MAX_MESSAGE_LENGTH), edited_at: new Date().toISOString() }).eq("id", id); if (error) throw error; }
export async function deleteMessage(id: string) { const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", id); if (error) throw error; }
export const messagesQuery = (roomId: string | undefined) => queryOptions({ queryKey: ["messages", roomId], queryFn: () => fetchMessagePage(roomId!), enabled: Boolean(roomId) });
