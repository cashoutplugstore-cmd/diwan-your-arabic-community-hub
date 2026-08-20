export type AICountry = 'iraq' | 'saudi' | 'uae' | 'kuwait' | 'qatar' | 'bahrain' | 'oman';
export type AIGender = 'female' | 'male';
export type AIVoiceStyle = 'female-soft' | 'female-bright' | 'male-calm' | 'male-energetic';

export type AIMember = {
  id: string;
  name: string;
  gender: AIGender;
  country: AICountry;
  dialect: string;
  avatar: string;
  personality: string;
  topics: string[];
  voiceStyle: AIVoiceStyle;
  isVirtual: true;
};

type CharacterSeed = [string, AIGender, string, string, string[], AIVoiceStyle];

const COUNTRY_CONFIG: Record<AICountry, { dialect: string; topics: string[]; female: string[]; male: string[] }> = {
  iraq: {
    dialect: 'عراقي',
    topics: ['كرة القدم', 'الألعاب', 'الأكل', 'السفر', 'الموسيقى', 'الأفلام'],
    female: ['زهراء', 'نور', 'رنا', 'مريم', 'سارة', 'شهد', 'آية', 'بتول'],
    male: ['علي', 'حيدر', 'مصطفى', 'حسين', 'كرار', 'أحمد', 'سيف'],
  },
  saudi: {
    dialect: 'سعودي',
    topics: ['الكورة', 'السيارات', 'السفر', 'الألعاب', 'المطاعم', 'الأفلام'],
    female: ['نورة', 'جود', 'العنود', 'ريم', 'لينا', 'هيا', 'غلا', 'دانة'],
    male: ['سعود', 'راكان', 'فهد', 'نايف', 'تركي', 'عبدالله', 'مشعل'],
  },
  uae: {
    dialect: 'إماراتي',
    topics: ['السيارات', 'السفر', 'القهوة', 'الألعاب', 'الرياضة', 'المطاعم'],
    female: ['ميرة', 'شيخة', 'موزة', 'حصة', 'دانة', 'شما', 'ميثاء', 'عائشة'],
    male: ['حمد', 'راشد', 'خالد', 'سالم', 'سيف', 'ماجد', 'حسين'],
  },
  kuwait: {
    dialect: 'كويتي',
    topics: ['المسلسلات', 'الأكل', 'السفر', 'الألعاب', 'الرياضة', 'الموسيقى'],
    female: ['نوف', 'لولوة', 'شهد', 'جنى', 'دانة', 'غلا', 'ريما', 'سارة'],
    male: ['فواز', 'مشاري', 'عبدالعزيز', 'بدر', 'يوسف', 'فيصل', 'ناصر'],
  },
  qatar: {
    dialect: 'قطري',
    topics: ['الكورة', 'السيارات', 'السفر', 'القهوة', 'الألعاب', 'الأخبار'],
    female: ['الجوهرة', 'دانة', 'لولوة', 'ريم', 'مها', 'شيخة', 'نوف', 'أروى'],
    male: ['محمد', 'جاسم', 'راشد', 'سالم', 'خليفة', 'ناصر', 'تميم'],
  },
  bahrain: {
    dialect: 'بحريني',
    topics: ['البحر', 'الأكل', 'الموسيقى', 'السفر', 'الألعاب', 'الرياضة'],
    female: ['فاطمة', 'زهراء', 'نور', 'مريم', 'دانة', 'ليان', 'هند', 'روان'],
    male: ['علي', 'حسن', 'يوسف', 'محمد', 'سلمان', 'جاسم', 'حمد'],
  },
  oman: {
    dialect: 'عُماني',
    topics: ['السفر', 'البحر', 'التراث', 'القهوة', 'الرياضة', 'الألعاب'],
    female: ['مريم', 'أمل', 'أروى', 'مزون', 'خولة', 'عالية', 'نورة', 'بشرى'],
    male: ['سالم', 'حمد', 'خالد', 'مازن', 'هيثم', 'راشد', 'ناصر'],
  },
};

const PERSONALITIES = [
  'اجتماعي ويحب فتح مواضيع جديدة',
  'هادئ ويعطي ردودًا مختصرة ومفيدة',
  'مرح ويحب المزاح الخفيف',
  'فضولي ويسأل أسئلة متابعة',
  'محب للنقاش ويشرح وجهة نظره',
  'مهتم بالألعاب والتقنية',
  'مهتم بالرياضة والمنافسات',
  'يحب السفر وتجارب الأماكن',
  'مهتم بالأفلام والمسلسلات',
  'يحب الأكل وتجربة المطاعم',
  'يميل للنقاشات اليومية الخفيفة',
  'متحمس للموسيقى والثقافة',
  'يحب مساعدة الآخرين بالمعلومات',
  'خفيف دم وسريع البديهة',
  'هادئ ويحب الاستماع قبل الرد',
];

const AVATARS = ['🌟', '✨', '🌙', '🌸', '🦋', '🌷', '💫', '☕', '🎮', '⚽', '🎧', '🚗', '📚', '🌴', '🔥'];

const countryKeys = Object.keys(COUNTRY_CONFIG) as AICountry[];

function makeCharacters(): AIMember[] {
  const result: AIMember[] = [];
  let index = 0;

  for (const country of countryKeys) {
    const config = COUNTRY_CONFIG[country];
    const names: Array<[string, AIGender]> = [
      ...config.female.map((name) => [name, 'female'] as [string, AIGender]),
      ...config.male.map((name) => [name, 'male'] as [string, AIGender]),
    ];

    for (let slot = 0; slot < 15; slot += 1) {
      const [name, gender] = names[slot % names.length];
      const personality = PERSONALITIES[(index + slot) % PERSONALITIES.length];
      const voiceStyle: AIVoiceStyle = gender === 'female'
        ? (slot % 2 === 0 ? 'female-bright' : 'female-soft')
        : (slot % 2 === 0 ? 'male-energetic' : 'male-calm');

      result.push({
        id: `ai-${country}-${String(slot + 1).padStart(2, '0')}`,
        name: `${name} ${slot + 1}`,
        gender,
        country,
        dialect: config.dialect,
        avatar: AVATARS[(index + slot) % AVATARS.length],
        personality,
        topics: [config.topics[slot % config.topics.length], config.topics[(slot + 2) % config.topics.length]],
        voiceStyle,
        isVirtual: true,
      });
      index += 1;
    }
  }

  return result;
}

/** 105 virtual characters: 15 per allowed country. */
export const aiMembers: AIMember[] = makeCharacters();

const DIALECT_PHRASES: Record<AICountry, string[]> = {
  iraq: ['شنو رأيكم', 'شكو ماكو', 'والله خوش موضوع', 'خل نحچي', 'منو جرب'],
  saudi: ['وش رايكم', 'علومكم', 'خلونا نسولف', 'من جرّب', 'والله موضوع حلو'],
  uae: ['شو رايكم', 'علومكم', 'خلونا نحچي', 'منو جرّب', 'والله موضوع حلو'],
  kuwait: ['شنو رايكم', 'شلونكم', 'خل نسولف', 'منو جرّب', 'والله سالفة حلوة'],
  qatar: ['وش رايكم', 'علومكم', 'خلنا نسولف', 'منو جرّب', 'موضوع حلو'],
  bahrain: ['شنو رايكم', 'شخباركم', 'خلنا نسولف', 'منو جرّب', 'السالفة حلوة'],
  oman: ['شو رايكم', 'كيفكم', 'خلنا نسولف', 'منو جرّب', 'موضوع جميل'],
};

const STOP_WORDS = new Set(['من', 'شنو', 'شو', 'وش', 'شلون', 'كيف', 'ليش', 'هذا', 'هاي', 'هذي', 'انا', 'اني', 'انت', 'هو', 'هي', 'على', 'الى', 'في', 'و', 'يا', 'ما', 'لا', 'اي', 'راي', 'رأي']);

function normalize(text: string) {
  return text.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[؟?!.,،؛:()[\]{}]/g, ' ');
}

function detectCountry(roomId: string): AICountry {
  const value = normalize(roomId);
  if (/iraq|العراق|عراق/.test(value)) return 'iraq';
  if (/saudi|saudi-arabia|السعودية|سعودي/.test(value)) return 'saudi';
  if (/uae|emirates|united-arab-emirates|الإمارات|امارات|إمارات/.test(value)) return 'uae';
  if (/kuwait|الكويت|كويت/.test(value)) return 'kuwait';
  if (/qatar|قطر|قطري/.test(value)) return 'qatar';
  if (/bahrain|البحرين|بحريني/.test(value)) return 'bahrain';
  if (/oman|عمان|عُمان|عماني|عُماني/.test(value)) return 'oman';
  return 'iraq';
}

function findKeyword(messages: string[]) {
  const words = normalize(messages.slice(-10).join(' ')).split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  return words.at(-1) ?? '';
}

function pickTopic(member: AIMember, messages: string[]) {
  const context = normalize(messages.slice(-10).join(' '));
  const match = member.topics.find((topic) => context.includes(normalize(topic)));
  return match ?? member.topics[Math.floor(Math.random() * member.topics.length)];
}

export function buildAiConversation(member: AIMember, recentMessages: string[] = [], directMessage = '') {
  const context = [...recentMessages.slice(-10), directMessage].filter(Boolean);
  const topic = pickTopic(member, context);
  const keyword = findKeyword(context);
  const phrase = DIALECT_PHRASES[member.country];

  if (directMessage.trim()) {
    if (keyword) {
      const starters = [
        `${phrase[0]}؟ موضوع ${keyword} شدني، شنو رأيك؟`,
        `${phrase[1]} 😄 خصوصًا ${keyword}، عندك تجربة وياه؟`,
        `${phrase[2]}، ${keyword} يستاهل النقاش والله.`,
      ];
      return { topic, text: starters[Math.floor(Math.random() * starters.length)] };
    }
    return { topic, text: `${phrase[3]}، شنو رأيك بـ${topic}؟` };
  }

  const openers = [
    `${phrase[0]} بـ${topic}؟`,
    `${phrase[4]} عن ${topic} اليوم؟`,
    `${phrase[3]}، منو عنده تجربة ويا ${topic}؟`,
  ];
  return { topic, text: openers[Math.floor(Math.random() * openers.length)] };
}

export function getAiMemberForRoom(roomId: string, members: AIMember[] = aiMembers) {
  const country = detectCountry(roomId);
  const pool = members.filter((member) => member.country === country);
  if (!pool.length) return members[0] ?? null;
  let hash = 0;
  for (const char of roomId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return pool[Math.abs(hash) % pool.length];
}

export function getAiMembersForRoom(roomId: string, count = 4) {
  const country = detectCountry(roomId);
  const pool = aiMembers.filter((member) => member.country === country);
  if (!pool.length) return [];

  let hash = 0;
  for (const char of roomId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const start = Math.abs(hash) % pool.length;
  const result: AIMember[] = [];
  for (let offset = 0; offset < Math.min(count, pool.length); offset += 1) {
    result.push(pool[(start + offset) % pool.length]);
  }
  return result;
}

export function getAiMembersByCountry(country: AICountry) {
  return aiMembers.filter((member) => member.country === country);
}
