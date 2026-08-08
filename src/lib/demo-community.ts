import type { MessageWithAuthor, Profile } from "@/types";

/**
 * Synthetic demo community data. These are explicitly demo identities and must
 * never be presented as real people. The daily seed changes the visible mix
 * each day without writing fake users/messages into Supabase.
 */
const femaleFirstNames = [
  "نور", "سارة", "ليان", "ريم", "زهراء", "مريم", "آية", "رنا", "حنين", "شهد",
  "جنى", "لينا", "تالا", "ملك", "رغد", "فرح", "يارا", "دانا", "سلمى", "آمنة",
  "رؤى", "بتول", "رُبى", "ميس", "هبة", "لمى", "سُندس", "رُقية", "إسراء", "هند",
  "دعاء", "نغم", "بيان", "جود", "لارا", "ميار", "سارة", "هيا", "نورهان", "رُؤى",
];
const maleFirstNames = ["علي", "محمد", "حسن", "حسين", "عمر", "مصطفى", "ياسر", "كرار", "أحمد", "سيف", "مهند", "باسم", "حيدر", "منتظر", "زيد"];
const familyNames = ["العراقي", "البغدادي", "البصري", "النجفي", "التميمي", "الهاشمي", "العبيدي", "الكعبي", "السامرائي", "الربيعي", "الشامي", "الأنصاري"];
const englishNames = ["Lana", "Maya", "Sara", "Nora", "Layla", "Rania", "Mira", "Dina", "Yara", "Lina", "Emma", "Sofia", "Mia", "Ava", "Olivia", "Leen", "Jana", "Dana", "Noor", "Rita", "Amelia", "Ella", "Zoe"];

const topics = [
  "شلونكم اليوم؟", "شنو الأخبار؟", "أحد جرب المكان الجديد؟ يستاهل؟", "منو بعده صاحي؟ 😂",
  "شنو رأيكم بالحياة بفنلندا؟", "مين يعرف مكان هادي للقهوة؟ ☕", "شلون كان يومكم؟",
  "أحد عنده اقتراح لفيلم حلو؟", "شنو آخر شي ضحككم؟ 😂", "منو يحب الطبخ؟ 🍰",
  "أكو أحد رايح للمدينة اليوم؟", "شنو خطتكم للويكند؟", "أحتاج رأيكم بشغلة صغيرة.",
  "والله الجو اليوم يجنن 😄", "شكراً على المعلومة، فادتني هواي.", "حلوة الفكرة، خلونا نبدأ.",
  "ههههه نفس السؤال جان ببالي 😂", "نورتوا الغرفة ❤️", "أحب هالغرفة، كل مرة ألقى سوالف جديدة.",
  "إذا تعرفون خبر جديد شاركونا.", "تمام، فهمت عليج الآن ❤️", "صباح الخير للجميع ☀️",
  "مساء الخير يا جماعة 🌙", "أحتاج قهوة قبل أي قرار ☕😂", "يا جماعة شنو هذا الحظ 😂",
];
const reactions = ["😂", "🤣", "❤️", "😭", "🥹", "😍", "🔥", "👏", "✨", "🌷", "☕", "🇫🇮", "🇮🇶", "😅", "🙈", "🤍"];
const photoCaptions = [
  "📷 شوفوا هالمنظر، اليوم كان يجنن!",
  "🖼️ صورة من مشواري اليوم 🌷",
  "📸 أحد يحب هالنوع من الأماكن؟",
  "🌅 صورة سريعة قبل لا أرجع للبيت.",
  "☕ قهوة اليوم، لا أحد يسأل عن السكر 😂",
];

function daySeed(): number {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}
function hash(value: number): number {
  let x = value >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}
function pick<T>(items: T[], seed: number): T { return items[hash(seed) % items.length]; }

function profile(id: number, displayName: string, username: string, seed: number): Profile {
  const now = new Date().toISOString();
  return {
    id: `demo-${String(id).padStart(4, "0")}`,
    display_name: displayName,
    username,
    avatar_url: null,
    bio: "حساب تجريبي من مجتمع ديوان",
    status: id % 13 === 0 ? "away" : "online",
    created_at: now,
    updated_at: new Date(now).toISOString(),
  };
}

export function getDailyDemoProfiles(limit = 140): Profile[] {
  const seed = daySeed();
  const result: Profile[] = [];
  let id = 1;
  // Female-heavy mix: roughly 70% of the demo population.
  for (let i = 0; i < 100 && result.length < limit; i++) {
    const first = pick(femaleFirstNames, seed + i * 17);
    const family = pick(familyNames, seed + i * 31);
    result.push(profile(id, `${first} ${family}`, `demo_${id}`, seed + id));
    id++;
  }
  for (let i = 0; i < 30 && result.length < limit; i++) {
    const first = pick(maleFirstNames, seed + i * 43);
    const family = pick(familyNames, seed + i * 59);
    result.push(profile(id, `${first} ${family}`, `demo_${id}`, seed + id));
    id++;
  }
  for (let i = 0; i < 10 && result.length < limit; i++) {
    const first = pick(englishNames, seed + i * 71);
    result.push(profile(id, first, `demo_${id}`, seed + id));
    id++;
  }
  return result;
}

export const DEMO_PROFILES = getDailyDemoProfiles(140);

function demoMessageContent(seed: number): string {
  const roll = hash(seed) % 20;
  if (roll === 0 || roll === 1) return photoCaptions[hash(seed + 4) % photoCaptions.length];
  if (roll < 5) return `${pick(topics, seed)} ${pick(reactions, seed + 9)}`;
  if (roll < 8) return `${pick(reactions, seed + 3)} ${pick(reactions, seed + 8)}`;
  return pick(topics, seed);
}

/** 8,000 varied messages per room/day, generated lazily to avoid a huge bundle or fake DB rows. */
export function getDailyDemoMessages(roomId: string, count = 8000): MessageWithAuthor[] {
  const seed = daySeed() ^ roomId.length;
  const profiles = getDailyDemoProfiles(140);
  const now = Date.now();
  const start = now - 1000 * 60 * 60 * 24;
  return Array.from({ length: count }, (_, index) => {
    const author = profiles[hash(seed + index * 13) % profiles.length];
    return {
      id: `demo-${roomId}-${daySeed()}-${index}`,
      room_id: roomId,
      user_id: author.id,
      content: demoMessageContent(seed + index * 97),
      created_at: new Date(start + index * 10_800).toISOString(),
      reply_to_id: index % 9 === 0 && index > 0 ? `demo-${roomId}-${daySeed()}-${index - 1}` : null,
      edited_at: null,
      is_deleted: false,
      author,
    };
  });
}

export const DEMO_MESSAGES = (roomId: string): MessageWithAuthor[] => getDailyDemoMessages(roomId, 8000);
export function getDemoMembers(limit = 140): Profile[] { return getDailyDemoProfiles(limit); }
