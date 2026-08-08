import type { MessageWithAuthor, Profile } from "@/types";

/** Synthetic demo community data. Never represents real people. */
const femaleFirstNames = ["نور", "سارة", "ليان", "ريم", "زهراء", "مريم", "آية", "رنا", "حنين", "شهد", "جنى", "لينا", "تالا", "ملك", "رغد", "فرح", "يارا", "دانا", "سلمى", "آمنة", "رؤى", "بتول", "رُبى", "ميس", "هبة", "لمى", "سندس", "رقية", "إسراء", "هند"];
const maleFirstNames = ["علي", "محمد", "حسن", "حسين", "عمر", "مصطفى", "ياسر", "كرار", "أحمد", "سيف", "مهند", "باسم"];
const familyNames = ["العراقي", "البغدادي", "البصري", "النجفي", "التميمي", "الهاشمي", "العبيدي", "الكعبي", "السامرائي", "الربيعي", "الشامي", "الأنصاري"];
const englishNames = ["Lana", "Maya", "Sara", "Nora", "Layla", "Rania", "Mira", "Dina", "Yara", "Lina", "Emma", "Sofia", "Mia", "Ava", "Olivia", "Leen", "Jana", "Dana", "Noor", "Rita"];
const topics = ["شلونكم اليوم؟", "شنو الأخبار؟", "أحد جرب المكان الجديد؟", "منو بعده صاحي؟ 😂", "شنو رأيكم بالحياة بفنلندا؟", "مين يعرف مكان هادي للقهوة؟ ☕", "شلون كان يومكم؟", "أحد عنده اقتراح لفيلم حلو؟", "شنو آخر شي ضحككم؟ 😂", "منو يحب الطبخ؟ 🍰", "شنو خطتكم للويكند؟", "أحتاج رأيكم بشغلة صغيرة.", "والله الجو اليوم يجنن 😄", "شكراً على المعلومة، فادتني هواي.", "حلوة الفكرة، خلونا نبدأ.", "ههههه نفس السؤال جان ببالي 😂", "نورتوا الغرفة ❤️", "أحب هالغرفة، كل مرة ألقى سوالف جديدة.", "إذا تعرفون خبر جديد شاركونا.", "صباح الخير للجميع ☀️", "مساء الخير يا جماعة 🌙"];
const reactions = ["😂", "🤣", "❤️", "😭", "🥹", "😍", "🔥", "👏", "✨", "🌷", "☕", "🇫🇮", "🇮🇶", "😅", "🙈", "🤍"];

function daySeed(): number { const d = new Date(); const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; let h = 2166136261; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619); return h >>> 0; }
function hash(value: number): number { let x = value >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; }
function pick<T>(items: T[], seed: number): T { return items[hash(seed) % items.length]; }
function profile(id: number, displayName: string): Profile { const now = new Date().toISOString(); return { id: `demo-${String(id).padStart(4, "0")}`, display_name: displayName, username: `demo_${id}`, avatar_url: null, bio: "حساب تجريبي من مجتمع ديوان", status: "online", created_at: now, updated_at: now }; }

export function getDailyDemoProfiles(limit = 120): Profile[] {
  const seed = daySeed(); const result: Profile[] = []; let id = 1;
  for (let i = 0; i < 84; i++) { const p = profile(id, `${pick(femaleFirstNames, seed + i * 17)} ${pick(familyNames, seed + i * 31)}`); result.push(p); id++; }
  for (let i = 0; i < 24; i++) { const p = profile(id, `${pick(maleFirstNames, seed + i * 43)} ${pick(familyNames, seed + i * 59)}`); result.push(p); id++; }
  for (let i = 0; i < 12; i++) { result.push(profile(id, pick(englishNames, seed + i * 71))); id++; }
  return result.slice(0, limit);
}

export const DEMO_PROFILES = getDailyDemoProfiles(120);

function demoMessageContent(seed: number): string {
  const roll = hash(seed) % 10;
  if (roll < 3) return `${pick(topics, seed)} ${pick(reactions, seed + 9)}`;
  if (roll < 5) return `${pick(reactions, seed + 3)} ${pick(reactions, seed + 8)}`;
  return pick(topics, seed);
}

/** Small initial feed for performance; activity is generated on demand instead of rendering thousands of rows. */
export function getDailyDemoMessages(roomId: string, count = 36): MessageWithAuthor[] {
  const seed = daySeed() ^ roomId.length; const profiles = getDailyDemoProfiles(120); const now = Date.now(); const start = now - 1000 * 60 * 70;
  return Array.from({ length: count }, (_, index) => { const author = profiles[hash(seed + index * 13) % profiles.length]; return { id: `demo-${roomId}-${daySeed()}-${index}`, room_id: roomId, user_id: author.id, content: demoMessageContent(seed + index * 97), created_at: new Date(start + index * 120000).toISOString(), reply_to_id: null, edited_at: null, is_deleted: false, author }; });
}

export const DEMO_MESSAGES = (roomId: string): MessageWithAuthor[] => getDailyDemoMessages(roomId, 36);
export function getDemoMembers(limit = 120): Profile[] { return getDailyDemoProfiles(limit); }
