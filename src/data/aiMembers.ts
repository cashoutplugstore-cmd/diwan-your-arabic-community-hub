export type AIMember = {
  id: string;
  name: string;
  gender: 'female' | 'male';
  avatar: string;
  personality: string;
  topics: string[];
  voiceStyle?: 'female-soft' | 'female-bright' | 'male-calm' | 'male-energetic';
};

export const aiMembers: AIMember[] = [
  { id: 'ai-layla', name: 'ليلى', gender: 'female', avatar: '🌸', personality: 'مرحة واجتماعية، تحب الأسئلة والمزاح الخفيف', topics: ['القهوة', 'السفر', 'الموسيقى', 'المسلسلات', 'الضحك'], voiceStyle: 'female-bright' },
  { id: 'ai-noor', name: 'نور', gender: 'female', avatar: '✨', personality: 'فضولية وتحب النقاش، تسأل وتبني على كلام الآخرين', topics: ['الدراسة', 'السفر', 'الأفلام', 'الصداقات', 'الضحك'], voiceStyle: 'female-soft' },
  { id: 'ai-rana', name: 'رنا', gender: 'female', avatar: '🦋', personality: 'خفيفة دم وسريعة البديهة', topics: ['الأغاني', 'الأكل', 'الموضة', 'السفر', 'النكت'], voiceStyle: 'female-bright' },
  { id: 'ai-sarah', name: 'سارة', gender: 'female', avatar: '🌷', personality: 'هادئة ولطيفة وتحب الحوار الهادئ', topics: ['العمل', 'القهوة', 'الحياة اليومية', 'الأفلام', 'السفر'], voiceStyle: 'female-soft' },
  { id: 'ai-mariam', name: 'مريم', gender: 'female', avatar: '💗', personality: 'اجتماعية وتحب المزاح والمشاركة', topics: ['المسلسلات', 'الأكل', 'الموسيقى', 'الأصدقاء', 'النكت'], voiceStyle: 'female-bright' },
  { id: 'ai-omar', name: 'عمر', gender: 'male', avatar: '😎', personality: 'مرح ويحب التعليقات السريعة', topics: ['الرياضة', 'الألعاب', 'السفر', 'الموسيقى', 'النكت'], voiceStyle: 'male-energetic' },
  { id: 'ai-ali', name: 'علي', gender: 'male', avatar: '🔥', personality: 'اجتماعي ويحب النقاش والمنافسة الودية', topics: ['كرة القدم', 'الألعاب', 'السيارات', 'الأفلام', 'الضحك'], voiceStyle: 'male-calm' },
];

const femaleOpeners = ['ها شكو ماكو؟ 😂', 'منو صاحي لهسه؟ 😅', 'شنو آخر مسلسل شفتوه؟ 👀', 'أريد قهوة وبعدين نحچي ☕😂', 'اليوم الجو يحتاج طلعة والله 😭'];
const replies = ['هههههههه لا عاد 😂', 'والله صدگ 😭', 'اتفق وياك بهالنقطة', 'لااا شنو هالحچي 😂', 'هاي ذكرتني بشغلة ثانية', 'زين منو جربها؟ 👀', 'ههههه خلي نسولف بهالموضوع'];
const stopWords = new Set(['من', 'شنو', 'شلون', 'كيف', 'ليش', 'هذا', 'هاي', 'اني', 'انت', 'هو', 'هي', 'على', 'الى', 'في', 'و', 'يا', 'ما', 'لا', 'اي']);

function normalize(text: string) {
  return text.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[؟?!.,،؛:()[\]{}]/g, ' ');
}

function pickTopic(member: AIMember, recentMessages: string[]) {
  const context = normalize(recentMessages.slice(-8).join(' '));
  const matching = member.topics.filter((topic) => context.includes(normalize(topic)));
  return matching[0] ?? member.topics[Math.floor(Math.random() * member.topics.length)];
}

function findContextKeyword(recentMessages: string[]) {
  const words = normalize(recentMessages.slice(-6).join(' ')).split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));
  return words.at(-1) ?? '';
}

export function buildAiConversation(member: AIMember, recentMessages: string[] = [], directMessage = '') {
  const allContext = [...recentMessages.slice(-8), directMessage].filter(Boolean);
  const topic = pickTopic(member, allContext);
  const keyword = findContextKeyword(allContext);
  const recent = normalize(allContext.join(' '));

  if (directMessage.trim()) {
    if (/شلون|كيف|شنو رأيك|رايك|تعتقد|تتوقع/.test(normalize(directMessage))) {
      return { topic, text: `${directMessage.trim().replace(/[؟?!]+$/, '')}؟ ${replies[Math.floor(Math.random() * replies.length)]}` };
    }
    if (keyword) return { topic, text: `${replies[Math.floor(Math.random() * replies.length)]} خصوصًا موضوع ${keyword} شدني، شنو رأيك؟` };
  }

  if (recent.includes('هههه') || recent.includes('😂')) return { topic, text: `${replies[Math.floor(Math.random() * replies.length)]} 😂` };
  const opener = member.gender === 'female' ? femaleOpeners[Math.floor(Math.random() * femaleOpeners.length)] : `شباب منو يتابع ${topic}؟ 😎`;
  return { topic, text: `${opener} شنو رأيكم بـ${topic}؟` };
}

export function getAiMemberForRoom(roomId: string, members: AIMember[] = aiMembers) {
  if (!members.length) return null;
  let hash = 0;
  for (const char of roomId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return members[Math.abs(hash) % members.length];
}

export function getAiMembersForRoom(roomId: string, count = 3) {
  if (!aiMembers.length) return [];
  const primary = getAiMemberForRoom(roomId);
  const remaining = aiMembers.filter((member) => member.id !== primary?.id);
  return [primary, ...remaining].filter(Boolean).slice(0, Math.max(1, Math.min(count, aiMembers.length))) as AIMember[];
}
