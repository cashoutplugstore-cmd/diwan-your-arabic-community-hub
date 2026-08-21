export type Dialect = "iraqi" | "saudi" | "kuwaiti" | "emirati" | "qatari" | "bahraini" | "omani";
export type AIMember = {
  id: string;
  name: string;
  gender: "female" | "male";
  avatar: string;
  personality: string;
  topics: string[];
  dialect: Dialect;
  voiceStyle?: "female-soft" | "female-bright" | "male-calm" | "male-energetic";
};

const dialectData: Record<Dialect, { names: string[]; phrases: string[] }> = {
  iraqi: {
    names: [
      "زهراء",
      "رُبى",
      "بتول",
      "شهد",
      "كوثر",
      "فرح",
      "حيدر",
      "كرار",
      "مرتضى",
      "سجاد",
      "قاسم",
      "ضرغام",
      "حسين",
      "مهدي",
      "وسام",
    ],
    phrases: ["شلونكم", "شنو رأيكم", "هسه", "والله", "إي والله", "خل نسولف", "شكو ماكو"],
  },
  saudi: {
    names: [
      "الجوهرة",
      "العنود",
      "مشاعل",
      "غلا",
      "أريام",
      "تالا",
      "راكان",
      "نايف",
      "تركي",
      "وليد",
      "بندر",
      "مشاري",
      "متعب",
      "عبدالعزيز",
      "زياد",
    ],
    phrases: ["وش علومكم", "وش رايكم", "يا جماعة", "الحين", "والله", "خلونا نسولف", "وش السالفة"],
  },
  kuwaiti: {
    names: [
      "لولوة",
      "حصة",
      "الجود",
      "دانة",
      "شوق",
      "ريما",
      "بدر",
      "مشعل",
      "فيصل",
      "نواف",
      "يعقوب",
      "عبدالرحمن",
      "فهدان",
      "صالح",
      "جابر",
    ],
    phrases: ["شلونكم", "شنو رايكم", "يا الربع", "الحين", "والله", "خلنا نسولف", "شنو السالفة"],
  },
  emirati: {
    names: [
      "اليازية",
      "شمسة",
      "موزة",
      "مهرة",
      "عوشة",
      "بدور",
      "زايد",
      "سيف",
      "حمدان",
      "راشدون",
      "خليفة",
      "طحنون",
      "سلطان",
      "نهيان",
      "مرشد",
    ],
    phrases: ["شو الأخبار", "شو رايكم", "يا جماعة", "الحين", "والله", "خلونا نسولف", "شو السالفة"],
  },
  qatari: {
    names: [
      "لولوة",
      "الجوهرة",
      "العنود",
      "مياسة",
      "دانة",
      "حصّة",
      "جاسم",
      "تميم",
      "سعود",
      "مشعل",
      "حمد",
      "فهد",
      "راشد",
      "نواف",
      "غانم",
    ],
    phrases: ["شخباركم", "شنو رايكم", "يا الربع", "الحين", "والله", "خلنا نسولف", "شنو السالفة"],
  },
  bahraini: {
    names: [
      "حور",
      "زهراء",
      "كوثر",
      "نرجس",
      "أفنان",
      "طيبة",
      "جاسم",
      "باقر",
      "مهدي",
      "عليان",
      "سلمان",
      "يوسفان",
      "هاشم",
      "رضا",
      "صادق",
    ],
    phrases: ["شخباركم", "وش رايكم", "يا جماعة", "الحين", "والله", "خلنا نسولف", "شنو السالفة"],
  },
  omani: {
    names: [
      "مزون",
      "خولة",
      "أروى",
      "أثير",
      "غالية",
      "مها",
      "حمود",
      "مازن",
      "خميس",
      "بركات",
      "سالمون",
      "هلال",
      "سهيل",
      "سيفان",
      "عدي",
    ],
    phrases: ["شخباركم", "وش رايكم", "يا الربع", "الحين", "والله", "خلونا نسولف", "شو السالفة"],
  },
};

const topics = [
  "القهوة",
  "السفر",
  "الموسيقى",
  "الأفلام",
  "المسلسلات",
  "الرياضة",
  "الألعاب",
  "الأكل",
  "السيارات",
  "الدراسة",
  "العمل",
  "الضحك",
  "الويكند",
  "التقنية",
];
const personalities = [
  "اجتماعي ومرح",
  "هادئ وفضولي",
  "سريع البديهة",
  "محب للنقاش",
  "خفيف دم",
  "يحب مساعدة الآخرين",
  "فضولي ويطرح أسئلة",
];
const avatars = [
  "🌸",
  "✨",
  "🦋",
  "🌷",
  "💗",
  "😎",
  "🔥",
  "🌙",
  "⭐",
  "🎧",
  "☕",
  "🎮",
  "🏆",
  "🌿",
  "💫",
];

export const aiMembers: AIMember[] = (
  Object.entries(dialectData) as [Dialect, (typeof dialectData)[Dialect]][]
).flatMap(([dialect, data]) =>
  data.names.map((name, index) => ({
    id: `virtual-${dialect}-${index + 1}`,
    name,
    gender: index < 6 ? "female" : "male",
    avatar: avatars[index],
    personality: personalities[index % personalities.length],
    topics: [
      topics[index % topics.length],
      topics[(index + 4) % topics.length],
      topics[(index + 8) % topics.length],
    ],
    dialect,
    voiceStyle:
      index < 6
        ? index % 2
          ? "female-soft"
          : "female-bright"
        : index % 2
          ? "male-calm"
          : "male-energetic",
  })),
);

const stopWords = new Set([
  "من",
  "شنو",
  "شلون",
  "كيف",
  "ليش",
  "هذا",
  "هاي",
  "هذي",
  "وش",
  "شو",
  "اني",
  "انت",
  "هو",
  "هي",
  "على",
  "الى",
  "في",
  "و",
  "يا",
  "ما",
  "لا",
  "اي",
  "الحين",
]);
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[؟?!.,،؛:()[\]{}]/g, " ");
}
function pickTopic(member: AIMember, context: string[]) {
  const value = normalize(context.slice(-8).join(" "));
  return (
    member.topics.find((topic) => value.includes(normalize(topic))) ??
    member.topics[Math.floor(Math.random() * member.topics.length)]
  );
}
function findKeyword(context: string[]) {
  return (
    normalize(context.slice(-6).join(" "))
      .split(/\s+/)
      .findLast((word) => word.length > 2 && !stopWords.has(word)) ?? ""
  );
}

export function buildAiConversation(
  member: AIMember,
  recentMessages: string[] = [],
  directMessage = "",
) {
  const context = [...recentMessages.slice(-8), directMessage].filter(Boolean);
  const topic = pickTopic(member, context);
  const keyword = findKeyword(context);
  const phrases = dialectData[member.dialect].phrases;
  const p = phrases[Math.floor(Math.random() * phrases.length)];
  if (directMessage.trim()) {
    if (
      /شلون|كيف|شنو رأيك|رايك|وش رايك|وش رايكم|شو رايك|تعتقد|تتوقع/.test(normalize(directMessage))
    )
      return { topic, text: `${p}، عن هالموضوع أنا أميل لـ${topic}. وإنت شرايك؟` };
    if (keyword) return { topic, text: `${p} 😂 موضوع ${keyword} شدني، كمل وش صار؟` };
  }
  const starters = [
    `${p} يا جماعة، شرايكم بـ${topic}؟`,
    `على طاري ${topic}، منو عنده تجربة؟`,
    `يا جماعة عندي فضول: شنو أفضل شي بـ${topic}؟`,
    `خلونا نغيّر السالفة شوي 😄 شنو رأيكم بـ${topic}؟`,
  ];
  return { topic, text: starters[Math.floor(Math.random() * starters.length)] };
}

export function getAiMemberForRoom(roomId: string, members: AIMember[] = aiMembers) {
  if (!members.length) return null;
  let hash = 0;
  for (const char of roomId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return members[Math.abs(hash) % members.length];
}
export function getAiMembersForRoom(roomId: string, count = 8) {
  const primary = getAiMemberForRoom(roomId);
  if (!primary) return [];
  const sameDialect = aiMembers.filter(
    (member) => member.dialect === primary.dialect && member.id !== primary.id,
  );
  return [primary, ...sameDialect].slice(0, Math.max(1, Math.min(count, sameDialect.length + 1)));
}
