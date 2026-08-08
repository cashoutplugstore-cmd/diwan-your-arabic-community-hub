import type { MessageWithAuthor, Profile } from "@/types";

/**
 * Seed/demo community data used only to make a fresh installation feel active.
 * These identities are synthetic and must never be treated as real users.
 */
const femaleFirstNames = [
  "نور", "سارة", "ليان", "ريم", "زهراء", "مريم", "آية", "رنا", "حنين", "شهد",
  "جنى", "لينا", "تالا", "ملك", "رغد", "فرح", "يارا", "دانا", "سلمى", "آمنة",
  "رؤى", "بتول", "رُبى", "ميس", "هبة", "لمى", "سُندس", "رُقية", "إسراء", "سارة",
];

const maleFirstNames = [
  "علي", "محمد", "حسن", "حسين", "عمر", "مصطفى", "ياسر", "كرار", "أحمد", "سيف",
];

const familyNames = [
  "العراقي", "البغدادي", "البصري", "النجفي", "التميمي", "الهاشمي", "العبيدي", "الكعبي",
  "السامرائي", "الربيعي", "الشامي", "الأنصاري",
];

const englishNames = [
  "Lana", "Maya", "Sara", "Nora", "Layla", "Rania", "Mira", "Dina", "Yara", "Lina",
  "Emma", "Sofia", "Mia", "Ava", "Olivia", "Leen", "Jana", "Dana", "Noor", "Rita",
];

const messages = [
  "هلااا 🌷 شلونكم اليوم؟",
  "مساء الخير يا جماعة، شنو الأخبار؟",
  "أحد جرب المكان الجديد؟ يستاهل؟",
  "ههههه والله نفس السؤال جان ببالي 😂",
  "نورتوا الغرفة ❤️",
  "أنا جديدة هنا، شنو أكثر غرفة تنصحوني بيها؟",
  "إذا أحد يحتاج مساعدة بالترجمة آني موجودة.",
  "والله الجو اليوم يجنن 😄",
  "منو بعده صاحي؟ 😂",
  "اتفق وياج، هذا أحسن حل.",
  "شنو رأيكم نسوي موضوع عن الحياة بفنلندا؟",
  "حلوة الفكرة، خلونا نبدأ.",
  "ههههه لا عاد، مو لهالدرجة 😅",
  "صباح الخير للجميع ☀️",
  "اليوم عندي مزاج سوالف، احكوا لي شنو صار وياكم.",
  "شكراً على المعلومة، فادتني هواي.",
  "أحب هالغرفة، كل مرة أدخل ألقى سوالف جديدة.",
  "مين يعرف مكان هادي للقهوة؟ ☕",
  "إذا تعرفون خبر جديد شاركونا.",
  "تمام، فهمت عليج الآن ❤️",
];

function profile(id: number, displayName: string, username: string): Profile {
  const now = new Date().toISOString();
  return {
    id: `demo-${String(id).padStart(3, "0")}`,
    display_name: displayName,
    username,
    avatar_url: null,
    bio: "حساب تجريبي من مجتمع ديوان",
    status: id % 7 === 0 ? "away" : "online",
    created_at: now,
    updated_at: now,
  };
}

export const DEMO_PROFILES: Profile[] = (() => {
  const result: Profile[] = [];
  let id = 1;
  for (const first of femaleFirstNames) {
    for (const family of familyNames.slice(0, 3)) {
      const displayName = `${first} ${family}`;
      result.push(profile(id++, displayName, `demo_${id - 1}`));
      if (result.length >= 90) break;
    }
    if (result.length >= 90) break;
  }
  for (const first of maleFirstNames) {
    for (const family of familyNames.slice(0, 3)) {
      const displayName = `${first} ${family}`;
      result.push(profile(id++, displayName, `demo_${id - 1}`));
      if (result.length >= 105) break;
    }
    if (result.length >= 105) break;
  }
  for (const first of englishNames) {
    result.push(profile(id++, first, `demo_${id - 1}`));
    if (result.length >= 120) break;
  }
  return result;
})();

export const DEMO_MESSAGES = (roomId: string): MessageWithAuthor[] => {
  const base = Date.now() - 1000 * 60 * 75;
  return Array.from({ length: 72 }, (_, index) => {
    const author = DEMO_PROFILES[index % DEMO_PROFILES.length];
    const previous = index > 0 ? `demo-message-${index - 1}` : null;
    return {
      id: `demo-message-${index}`,
      room_id: roomId,
      user_id: author.id,
      content: messages[index % messages.length],
      created_at: new Date(base + index * 55_000).toISOString(),
      reply_to_id: index % 6 === 0 ? previous : null,
      edited_at: null,
      is_deleted: false,
      author,
    };
  });
};

export function getDemoMembers(limit = 120): Profile[] {
  return DEMO_PROFILES.slice(0, limit);
}
