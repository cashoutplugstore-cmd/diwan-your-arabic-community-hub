import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";
import { aiMembers, buildAiConversation } from "@/data/aiMembers";

const roomPools: Record<string, string[]> = {
  helsinki: ["شلون المواصلات اليوم؟ 🚋", "أحد يعرف كوفي هادي بهلسنكي؟ ☕", "الجو اليوم غريب 😂", "مين رايح للسنتر اليوم؟", "أحد جرب مكان جديد للأكل؟ 🍜"],
  finland: ["شنو أخباركم بفنلندا؟ 🇫🇮", "الشتاء بعده بعيد لو لا؟ 😂", "أحد يعرف مكان حلو للويكند؟", "شنو أفضل مدينة للمعيشة برأيكم؟", "أحد عنده تجربة ويا الدراسة هنا؟ 📚"],
  iraq: ["شلونكم أهل العراق ❤️🇮🇶", "اشتقت للأكل العراقي 😂", "منو بعده يحب الشاي بالهيل؟ ☕", "شنو أحلى أكلة عراقية برأيكم؟"],
  students: ["منو عنده امتحان هالأسبوع؟ 📚", "أحد يعرف مصادر زينة للدراسة؟", "وين أحصل مكتبة هادئة؟", "خلصتوا واجباتكم؟ 😅"],
  friends: ["شنو مسوين اليوم؟ 😄", "منو يريد سوالف؟ 😂", "أحد عنده فيلم حلو؟ 🎬", "شنو آخر شي فرحكم؟ ❤️", "منو يحب القهوة؟ ☕"],
  general: ["شلونكم اليوم؟ 🌷", "أحد صاحي بهالوقت؟ 😂", "وين أحصل قهوة زينة؟ ☕", "والله اليوم الجو حلو 😄", "منو عنده اقتراح لفيلم؟ 🎬", "شنو خطتكم للويكند؟", "أحد جرب مطعم جديد؟", "اشتقت للسوالف هنا 😄"],
};
const greetings = ["هلا والله 🌷 نورتينا!", "هلااا، نورت الغرفة ❤️", "أهلاً وسهلاً! شلونج؟", "يا هلا، نورتينا بينا 😊", "أهلاً بيج! شنو أخبارج اليوم؟"];
const followUps = ["إي والله 😄 شنو رأيك؟", "ههههه مضبوط 😂", "اتفق وياك، كمل السالفة 🌷", "زين! منو عنده تجربة ثانية؟", "حلوة السالفة 😄", "ذكرتيني بموقف صار وياي 😂"];
const recentlyReplied = new Map<string, number>();
const recentlyAmbient = new Map<string, number>();
const memberCursor = new Map<string, number>();
function roomKey(roomId: string): string { const value = roomId.toLowerCase(); if (/helsinki|هلسنكي/.test(value)) return "helsinki"; if (/finland|فنلندا/.test(value)) return "finland"; if (/iraq|العراق|عراق/.test(value)) return "iraq"; if (/student|طلاب|دراسة|جامعة/.test(value)) return "students"; if (/friend|تعرف|سوالف/.test(value)) return "friends"; return "general"; }
function authorFor(roomId: string, salt = 0): Profile { const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, (2166136261 ^ salt) >>> 0); return DEMO_PROFILES[hash % DEMO_PROFILES.length]!; }
function aiAuthor(roomId: string, salt = 0) { const cursor = memberCursor.get(roomId) ?? 0; const member = aiMembers[(cursor + salt) % aiMembers.length]!; memberCursor.set(roomId, cursor + 1); const fallback = authorFor(roomId, cursor + salt); return { member, author: { ...fallback, id: fallback.id ?? `demo-${roomId}-${cursor + salt}`, display_name: member.name, username: member.name.toLowerCase() } as Profile }; }
function makeMessage(roomId: string, author: Profile, text: string, at: number, prefix: string): MessageWithAuthor { return { id: `${prefix}-${roomId}-${at}-${author.id}`, room_id: roomId, user_id: author.id!, content: text, created_at: new Date(at).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author }; }
export function getActiveDemoMembers(limit = 48): Profile[] {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const seed = [...pathname].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  const roomCount = Math.max(4, Math.min(limit, 4 + (seed % Math.max(1, Math.min(limit - 3, 13)))));
  return DEMO_PROFILES.slice(0, roomCount).map((profile) => ({ ...profile, status: "online", updated_at: new Date().toISOString() }));
}
export function buildDemoEntryMessages(roomId: string): MessageWithAuthor[] { const now = Date.now(); const pool = roomPools[roomKey(roomId)] ?? roomPools["general"]!; return [0, 1, 2].map((index) => { const { member, author } = aiAuthor(roomId, now + index); const seed = pool[(now + index) % pool.length]!; const text = index === 0 ? greetings[(now + index) % greetings.length]! : buildAiConversation(member, [seed]).text || seed; return makeMessage(roomId, author, text, now + 900 + index * 1800, "room-entry"); }); }
export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null { const now = Date.now(); if (now - (recentlyReplied.get(roomId) ?? 0) < 4_000) return null; recentlyReplied.set(roomId, now); const { member, author } = aiAuthor(roomId); const isGreeting = /(^|\s)(سلام|هلا|هلو|مرحبا|هاي|hello|hi)(\s|!|！|$)/iu.test(realMessage); const generated = isGreeting ? greetings[Math.floor(Math.random() * greetings.length)]! : buildAiConversation(member, [realMessage]).text || followUps[Math.floor(Math.random() * followUps.length)]!; return makeMessage(roomId, author, generated, now + 1600, "ai-live"); }
export function buildDemoAmbientMessage(roomId: string): MessageWithAuthor | null { if (typeof window === "undefined") return null; const now = Date.now(); const realAt = Number(window.localStorage.getItem(`diwan:last-real-message:${roomId}`) || 0); if (!realAt || now - realAt < 2500) return null; const lastAiAt = Number(window.localStorage.getItem(`diwan:last-ai-message:${roomId}`) || 0); if (now - lastAiAt < 6_000) return null; if (now - (recentlyAmbient.get(roomId) ?? 0) < 6_000) return null; recentlyAmbient.set(roomId, now); window.localStorage.setItem(`diwan:last-ai-message:${roomId}`, String(now)); const { member, author } = aiAuthor(roomId, Math.floor(realAt / 1000)); const previous = JSON.parse(window.localStorage.getItem(`diwan:ai-context:${roomId}`) || "[]") as string[]; const pool = roomPools[roomKey(roomId)] ?? roomPools["general"]!; const text = buildAiConversation(member, [...previous, pool[Math.floor(Math.random() * pool.length)]!]).text || "إي والله 😄"; const context = [...previous, text].slice(-6); window.localStorage.setItem(`diwan:ai-context:${roomId}`, JSON.stringify(context)); return makeMessage(roomId, author, text, now + 900, "ai-ambient"); }
