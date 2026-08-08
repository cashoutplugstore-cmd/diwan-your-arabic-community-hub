import type { MessageWithAuthor, Profile } from "@/types";

/** Synthetic demo community data. These accounts are explicitly demo/AI identities, never real people. */
const femaleFirstNames = ["نور", "سارة", "ليان", "ريم", "زهراء", "مريم", "آية", "رنا", "حنين", "شهد", "جنى", "لينا", "تالا", "ملك", "رغد", "فرح", "يارا", "دانا", "سلمى", "آمنة", "رؤى", "بتول", "رُبى", "ميس", "هبة", "لمى", "سندس", "رقية", "إسراء", "هند"];
const maleFirstNames = ["علي", "محمد", "حسن", "حسين", "عمر", "مصطفى", "ياسر", "كرار", "أحمد", "سيف", "مهند", "باسم"];
const familyNames = ["العراقي", "البغدادي", "البصري", "النجفي", "التميمي", "الهاشمي", "العبيدي", "الكعبي", "السامرائي", "الربيعي", "الشامي", "الأنصاري"];
const englishNames = ["Lana", "Maya", "Sara", "Nora", "Layla", "Rania", "Mira", "Dina", "Yara", "Lina", "Emma", "Sofia", "Mia", "Ava", "Olivia", "Leen", "Jana", "Dana", "Noor", "Rita"];
const topics = ["شلونكم اليوم؟", "شنو الأخبار؟", "أحد جرب المكان الجديد؟", "منو بعده صاحي؟ 😂", "شنو رأيكم بالحياة بفنلندا؟", "مين يعرف مكان هادي للقهوة؟ ☕", "شلون كان يومكم؟", "أحد عنده اقتراح لفيلم حلو؟", "شنو آخر شي ضحككم؟ 😂", "منو يحب الطبخ؟ 🍰", "شنو خطتكم للويكند؟", "أحتاج رأيكم بشغلة صغيرة.", "والله الجو اليوم يجنن 😄", "شكراً على المعلومة، فادتني هواي.", "حلوة الفكرة، خلونا نبدأ.", "ههههه نفس السؤال جان ببالي 😂", "نورتوا الغرفة ❤️", "أحب هالغرفة، كل مرة ألقى سوالف جديدة.", "إذا تعرفون خبر جديد شاركونا.", "صباح الخير للجميع ☀️", "مساء الخير يا جماعة 🌙"];
const reactions = ["😂", "🤣", "❤️", "😭", "🥹", "😍", "🔥", "👏", "✨", "🌷", "☕", "🇫🇮", "🇮🇶", "😅", "🙈", "🤍"];

export type DemoPersona = {
  role: "social" | "helpful" | "funny" | "local" | "conversation-starter";
  style: "iraqi" | "modern-arabic" | "english-mix";
  interests: string[];
  tone: string;
};

const personaTemplates: DemoPersona[] = [
  { role: "social", style: "iraqi", interests: ["سوالف", "أصدقاء", "يوميات"], tone: "ودود وخفيف" },
  { role: "helpful", style: "modern-arabic", interests: ["نصائح", "فنلندا", "خدمات"], tone: "مفيد وهادئ" },
  { role: "funny", style: "iraqi", interests: ["ميمز", "أفلام", "مواقف"], tone: "مرح بدون إزعاج" },
  { role: "local", style: "english-mix", interests: ["هلسنكي", "فنلندا", "قهوة"], tone: "محلي واجتماعي" },
  { role: "conversation-starter", style: "iraqi", interests: ["أسئلة", "نقاش", "مجتمع"], tone: "يشجع الحوار" },
];

function daySeed(): number { const d = new Date(); const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; let h = 2166136261; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619); return h >>> 0; }
function hash(value: number): number { let x = value >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; }
function pick<T>(items: T[], seed: number): T { return items[hash(seed) % items.length]; }
function profile(id: number, displayName: string): Profile { const now = new Date().toISOString(); return { id: `demo-${String(id).padStart(4, "0")}`, display_name: displayName, username: `demo_${id}`, avatar_url: null, bio: "عضو تجريبي مدعوم بالذكاء الاصطناعي في مجتمع ديوان", status: "online", created_at: now, updated_at: now }; }

export function getDemoPersona(id: string | number): DemoPersona {
  const numericId = typeof id === "number" ? id : Number(String(id).replace(/\D/g, "")) || 0;
  return personaTemplates[hash(numericId + 701) % personaTemplates.length];
}

export function getDailyDemoProfiles(limit = 120): Profile[] {
  const seed = daySeed(); const result: Profile[] = []; let id = 1;
  for (let i = 0; i < 84; i++) { result.push(profile(id, `${pick(femaleFirstNames, seed + i * 17)} ${pick(familyNames, seed + i * 31)}`)); id++; }
  for (let i = 0; i < 24; i++) { result.push(profile(id, `${pick(maleFirstNames, seed + i * 43)} ${pick(familyNames, seed + i * 59)}`)); id++; }
  for (let i = 0; i < 12; i++) { result.push(profile(id, pick(englishNames, seed + i * 71))); id++; }
  return result.slice(0, limit);
}

export const DEMO_PROFILES = getDailyDemoProfiles(120);

function demoMessageContent(seed: number, authorId?: string): string {
  const persona = authorId ? getDemoPersona(authorId) : personaTemplates[hash(seed) % personaTemplates.length];
  const roll = hash(seed) % 12;
  if (persona.role === "helpful" && roll < 4) return pick(["إذا تحتاجون مساعدة بشغلة بفنلندا خبروني.", "خلونا نفيد بعض بالمعلومات بدل ما نخلي أحد يحتار.", "إذا أحد يعرف معلومة أدق يصححلي 👍"], seed);
  if (persona.role === "funny" && roll < 4) return pick(["ههههه لا تخلوني أبدأ 😂", "هاي تحتاج قهوة أول شي ☕😂", "أني دخلت بس حتى أشوف شنو السالفة 🤣"], seed);
  if (persona.role === "local" && roll < 4) return pick(["هلسنكي اليوم هادئة بشكل غريب 😄", "أكو أحد يعرف مكان قهوة زين قريب؟ ☕", "Finnish weather doing its thing again 😂🇫🇮"], seed);
  if (persona.role === "conversation-starter" && roll < 5) return pick(["خل نسوي سؤال اليوم: شنو أكثر شي تحبوه بفنلندا؟", "أريد أسمع آراءكم بهالموضوع 👀", "منو عنده تجربة مختلفة؟ شاركونا."], seed);
  if (roll < 3) return `${pick(topics, seed)} ${pick(reactions, seed + 9)}`;
  if (roll < 5) return `${pick(reactions, seed + 3)} ${pick(reactions, seed + 8)}`;
  return pick(topics, seed);
}

/** Small initial feed for performance; activity is generated on demand instead of rendering thousands of rows. */
export function getDailyDemoMessages(roomId: string, count = 36): MessageWithAuthor[] {
  const seed = daySeed() ^ roomId.length; const profiles = getDailyDemoProfiles(120); const now = Date.now(); const start = now - 1000 * 60 * 70;
  return Array.from({ length: count }, (_, index) => { const author = profiles[hash(seed + index * 13) % profiles.length]; return { id: `demo-${roomId}-${daySeed()}-${index}`, room_id: roomId, user_id: author.id, content: demoMessageContent(seed + index * 97, author.id), created_at: new Date(start + index * 120000).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author }; });
}

export const DEMO_MESSAGES = (roomId: string): MessageWithAuthor[] => getDailyDemoMessages(roomId, 36);
export function getDemoMembers(limit = 120): Profile[] { return getDailyDemoProfiles(limit); }
