export type AIMember = {
  id: string;
  name: string;
  gender: 'female' | 'male';
  avatar: string;
  personality: string;
  topics: string[];
};

export const aiMembers: AIMember[] = [
  { id: 'ai-layla', name: 'ليلى', gender: 'female', avatar: '🌸', personality: 'مرحة واجتماعية', topics: ['القهوة', 'السفر', 'الموسيقى', 'المسلسلات', 'الضحك'] },
  { id: 'ai-noor', name: 'نور', gender: 'female', avatar: '✨', personality: 'فضولية وتحب النقاش', topics: ['الدراسة', 'السفر', 'الأفلام', 'الصداقات', 'الضحك'] },
  { id: 'ai-rana', name: 'رنا', gender: 'female', avatar: '🦋', personality: 'خفيفة دم', topics: ['الأغاني', 'الأكل', 'الموضة', 'السفر', 'النكت'] },
  { id: 'ai-sarah', name: 'سارة', gender: 'female', avatar: '🌷', personality: 'هادئة ولطيفة', topics: ['العمل', 'القهوة', 'الحياة اليومية', 'الأفلام', 'السفر'] },
  { id: 'ai-mariam', name: 'مريم', gender: 'female', avatar: '💗', personality: 'اجتماعية وتحب المزاح', topics: ['المسلسلات', 'الأكل', 'الموسيقى', 'الأصدقاء', 'النكت'] },
  { id: 'ai-omar', name: 'عمر', gender: 'male', avatar: '😎', personality: 'مرح ويحب التعليقات', topics: ['الرياضة', 'الألعاب', 'السفر', 'الموسيقى', 'النكت'] },
  { id: 'ai-ali', name: 'علي', gender: 'male', avatar: '🔥', personality: 'اجتماعي', topics: ['كرة القدم', 'الألعاب', 'السيارات', 'الأفلام', 'الضحك'] },
];

const femaleOpeners = ['ها شكو ماكو؟ 😂', 'منو صاحي لهسه؟ 😅', 'بنات شنو آخر مسلسل شفتوه؟ 👀', 'أريد قهوة وبعدين نحچي ☕😂', 'اليوم الجو يحتاج طلعة والله 😭'];
const replies = ['هههههههه لا عاد 😂', 'والله صدگ 😭', 'اتفق وياج 100%', 'لاااا شنو هالحچي 😂', 'ذكرتيني بموقف صار وياي', 'زين منو جربها؟ 👀', 'ههههه خلي نسولف بهالموضوع'];

export function buildAiConversation(member: AIMember, recentMessages: string[] = []) {
  const topic = member.topics[Math.floor(Math.random() * member.topics.length)];
  const opener = member.gender === 'female' ? femaleOpeners[Math.floor(Math.random() * femaleOpeners.length)] : `شباب منو يتابع ${topic}؟ 😎`;
  const context = recentMessages.slice(-3).join(' ').toLowerCase();
  const contextual = context.includes('مسلسل') || context.includes('سفر') || context.includes('قهوة') || context.includes('ضحك');
  const text = contextual ? replies[Math.floor(Math.random() * replies.length)] : `${opener} شنو رأيكم بـ${topic}؟`;
  return { topic, text };
}
