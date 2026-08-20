import type { MessageWithAuthor, Profile } from "@/types";
import { DEMO_PROFILES } from "@/lib/demo-community";
import { aiMembers, buildAiConversation, type AIMember } from "@/data/aiMembers";

const roomPools: Record<string, string[]> = {
  iraq: ["شلونكم أهل العراق ❤️🇮🇶", "منو بعده يحب الشاي بالهيل؟ ☕", "شنو أحلى أكلة عراقية برأيكم؟", "والله مشتاق للسوالف العراقية 😂"],
  saudi: ["وش علومكم يا جماعة؟ 🇸🇦", "وش رايكم بطلعة الويكند؟", "وش آخر شي جربتوه؟", "من يعرف مكان حلو للتمشية؟"],
  kuwait: ["شلونكم يا الربع؟ 🇰🇼", "شنو رايكم بهالسالفة؟", "منو مجرب المكان هذا؟", "والله سوالفكم تضحك 😂"],
  uae: ["شو الأخبار يا جماعة؟ 🇦🇪", "شو رايكم بهالموضوع؟", "حد يعرف مكان حلو للويكند؟", "والله سوالفكم حلوة اليوم 😄"],
  qatar: ["شخباركم يا الربع؟ 🇶🇦", "شنو رايكم بهالسالفة؟", "منو مجرب المكان هذا؟", "اليوم الجو يبيله طلعة 😄"],
  bahrain: ["شخباركم يا جماعة؟ 🇧🇭", "وش رايكم بهالموضوع؟", "منو يعرف مكان زين؟", "السوالف اليوم غير 😂"],
  oman: ["شخباركم يا الربع؟ 🇴🇲", "وش رايكم بهالسالفة؟", "حد يعرف مكان زين للويكند؟", "اليوم الجو حلو للسوالف 😄"],
  students: ["منو عنده امتحان هالأسبوع؟ 📚", "أحد يعرف مصادر زينة للدراسة؟", "وين أحصل مكتبة هادئة؟", "خلصتوا واجباتكم؟ 😅"],
  friends: ["شنو مسوين اليوم؟ 😄", "منو يريد سوالف؟ 😂", "أحد عنده فيلم حلو؟ 🎬", "شنو آخر شي فرحكم؟ ❤️"],
  general: ["شلونكم اليوم؟ 🌷", "أحد صاحي بهالوقت؟ 😂", "وين أحصل قهوة زينة؟ ☕", "شنو خطتكم للويكند؟", "أحد جرب مطعم جديد؟"],
};

const roomDialects: Record<string, AIMember["dialect"]> = { iraq: "iraqi", saudi: "saudi", kuwait: "kuwaiti", uae: "emirati", qatar: "qatari", bahrain: "bahraini", oman: "omani" };
const greetings = ["هلا والله، نورتوا الغرفة 🌷", "يا هلا بالجميع ❤️", "أهلاً وسهلاً يا جماعة 😊", "نورتوا، شخباركم اليوم؟"];
const followUps = ["إي والله، وش رايكم؟ 😄", "ههههه مضبوط 😂", "اتفق وياك، كمل السالفة", "زين! منو عنده تجربة ثانية؟", "حلوة السالفة 😄"];
const recentlyReplied = new Map<string, number>();
const recentlyAmbient = new Map<string, number>();
const memberCursor = new Map<string, number>();
const recentAiTexts = new Map<string, string[]>();

function roomKey(roomId: string): string {
  const value = roomId.toLowerCase();
  if (/iraq|العراق|عراق/.test(value)) return "iraq";
  if (/saudi|السعودية|سعودي/.test(value)) return "saudi";
  if (/kuwait|الكويت|كويتي/.test(value)) return "kuwait";
  if (/uae|emirates|الإمارات|الامارات|إمارات/.test(value)) return "uae";
  if (/qatar|قطر|قطري/.test(value)) return "qatar";
  if (/bahrain|البحرين|بحريني/.test(value)) return "bahrain";
  if (/oman|عمان|عُمان|عماني/.test(value)) return "oman";
  if (/student|طلاب|دراسة|جامعة/.test(value)) return "students";
  if (/friend|تعرف|سوالف/.test(value)) return "friends";
  return "general";
}
function authorFor(roomId: string, salt = 0): Profile { const hash = [...roomId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, (2166136261 ^ salt) >>> 0); return DEMO_PROFILES[hash % DEMO_PROFILES.length]!; }
function pickRoomMembers(roomId: string, count = 12) { const dialect = roomDialects[roomKey(roomId)]; const pool = dialect ? aiMembers.filter((member) => member.dialect === dialect) : aiMembers; return pool.length ? pool.slice(0, Math.min(count, pool.length)) : aiMembers.slice(0, count); }
function aiAuthor(roomId: string, salt = 0) { const pool = pickRoomMembers(roomId, 15); const cursor = memberCursor.get(roomId) ?? 0; const member = pool[(cursor + salt) % pool.length]!; memberCursor.set(roomId, cursor + 1); const fallback = authorFor(roomId, cursor + salt); return { member, author: { ...fallback, id: `virtual-${member.id}`, display_name: member.name, username: member.name.toLowerCase() } as Profile }; }
function makeMessage(roomId: string, author: Profile, text: string, at: number, prefix: string): MessageWithAuthor { return { id: `${prefix}-${roomId}-${at}-${author.id}`, room_id: roomId, user_id: author.id!, content: text, created_at: new Date(at).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author }; }
function normalize(text: string) { return text.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[؟?!.,،؛:()[\]{}]/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(text: string) { return new Set(normalize(text).split(" ").filter((word) => word.length > 2)); }
function similarity(a: string, b: string) { const aa = tokens(a); const bb = tokens(b); if (!aa.size || !bb.size) return 0; let common = 0; aa.forEach((word) => { if (bb.has(word)) common++; }); return common / Math.max(1, Math.min(aa.size, bb.size)); }
function rememberAiText(roomId: string, text: string) { const next = [...(recentAiTexts.get(roomId) ?? []), text].slice(-24); recentAiTexts.set(roomId, next); }
function isTooSimilar(roomId: string, text: string) { return (recentAiTexts.get(roomId) ?? []).some((previous) => normalize(previous) === normalize(text) || similarity(previous, text) >= 0.72); }
function uniqueAiText(roomId: string, member: AIMember, context: string[], fallbackPool: string[]) { for (let attempt = 0; attempt < 8; attempt++) { const seed = fallbackPool[(attempt + Math.floor(Math.random() * fallbackPool.length)) % fallbackPool.length]!; const generated = buildAiConversation(member, [...context, seed]).text || seed; if (!isTooSimilar(roomId, generated)) { rememberAiText(roomId, generated); return generated; } } const fallback = fallbackPool.find((text) => !isTooSimilar(roomId, text)) ?? fallbackPool[Math.floor(Math.random() * fallbackPool.length)]!; rememberAiText(roomId, fallback); return fallback; }

export function getActiveDemoMembers(limit = 48): Profile[] { const pathname = typeof window === "undefined" ? "" : window.location.pathname; const seed = [...pathname].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261); const roomCount = Math.max(4, Math.min(limit, 4 + (seed % Math.max(1, Math.min(limit - 3, 13))))); return DEMO_PROFILES.slice(0, roomCount).map((profile) => ({ ...profile, status: "online", updated_at: new Date().toISOString() })); }

export function buildDemoEntryMessages(roomId: string): MessageWithAuthor[] { const now = Date.now(); const pool = roomPools[roomKey(roomId)] ?? roomPools.general!; return [0, 1, 2].map((index) => { const { member, author } = aiAuthor(roomId, index); const seed = pool[(now + index) % pool.length]!; const text = index === 0 ? greetings[(now + index) % greetings.length]! : uniqueAiText(roomId, member, [seed], pool); return makeMessage(roomId, author, text, now + 900 + index * 1800, "room-entry"); }); }

export function buildDemoReply(roomId: string, realMessage: string): MessageWithAuthor | null { const now = Date.now(); if (now - (recentlyReplied.get(roomId) ?? 0) < 5_000) return null; recentlyReplied.set(roomId, now); const { member, author } = aiAuthor(roomId); const pool = roomPools[roomKey(roomId)] ?? roomPools.general!; const generated = uniqueAiText(roomId, member, [realMessage], [...pool, ...followUps]); return makeMessage(roomId, author, generated, now + 1600, "ai-live"); }

export function buildDemoAmbientMessage(roomId: string): MessageWithAuthor | null { if (typeof window === "undefined") return null; const now = Date.now(); const realAt = Number(window.localStorage.getItem(`diwan:last-real-message:${roomId}`) || 0); if (!realAt || now - realAt < 3000) return null; const lastAiAt = Number(window.localStorage.getItem(`diwan:last-ai-message:${roomId}`) || 0); if (now - lastAiAt < 12_000) return null; if (now - (recentlyAmbient.get(roomId) ?? 0) < 12_000) return null; recentlyAmbient.set(roomId, now); window.localStorage.setItem(`diwan:last-ai-message:${roomId}`, String(now)); const { member, author } = aiAuthor(roomId, Math.floor(realAt / 1000)); const previous = JSON.parse(window.localStorage.getItem(`diwan:ai-context:${roomId}`) || "[]") as string[]; const pool = roomPools[roomKey(roomId)] ?? roomPools.general!; const text = uniqueAiText(roomId, member, previous, pool); window.localStorage.setItem(`diwan:ai-context:${roomId}`, JSON.stringify([...previous, text].slice(-12))); return makeMessage(roomId, author, text, now + 900, "ai-ambient"); }
