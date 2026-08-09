import type { MessageWithAuthor, Profile } from "@/types";

/** Synthetic demo community data. Members are separate from real accounts. */
const names = ["نور العراقي", "سارة البغدادي", "ليان الشامي", "ريم التميمي", "زهراء البصري", "مريم الهاشمي", "آية العبيدي", "رنا الكعبي", "حنين النجفي", "شهد الربيعي", "جنى الأنصاري", "علي العراقي", "محمد البغدادي", "حسن التميمي", "حسين الكعبي", "عمر الهاشمي", "مصطفى العبيدي", "ياسر الشامي", "كرار البصري", "أحمد النجفي", "Lana", "Maya", "Sara", "Nora", "Layla", "Rania", "Mira", "Dina", "Yara", "Lina"];
const topics = ["شلونكم اليوم؟", "شنو الأخبار؟", "أحد جرب المكان الجديد؟", "منو بعده صاحي؟ 😂", "شنو رأيكم بالحياة بفنلندا؟", "مين يعرف مكان هادي للقهوة؟ ☕", "شلون كان يومكم؟", "أحد عنده اقتراح لفيلم حلو؟", "شنو آخر شي ضحككم؟ 😂", "شنو خطتكم للويكند؟", "أحتاج رأيكم بشغلة صغيرة.", "والله الجو اليوم يجنن 😄", "شكراً على المعلومة، فادتني هواي.", "حلوة الفكرة، خلونا نبدأ.", "ههههه نفس السؤال جان ببالي 😂", "نورتوا الغرفة ❤️", "إذا تعرفون خبر جديد شاركونا."];

function profile(id: number, displayName: string): Profile { const now = new Date().toISOString(); return { id: `demo-${String(id).padStart(4, "0")}`, display_name: displayName, username: `demo_${id}`, avatar_url: null, bio: "حساب تجريبي من مجتمع ديوان", status: "online", created_at: now, updated_at: now }; }

export const DEMO_PROFILES: Profile[] = names.map((name, i) => profile(i + 1, name));
export function getDailyDemoProfiles(limit = 120): Profile[] { return DEMO_PROFILES.slice(0, limit); }

/** No fake history: real members start the conversation; AI may reply afterward. */
export function getDailyDemoMessages(_roomId: string, _count = 0): MessageWithAuthor[] { return []; }
export const DEMO_MESSAGES = (_roomId: string): MessageWithAuthor[] => [];
export function getDemoMembers(limit = 120): Profile[] { return getDailyDemoProfiles(limit); }
export function getDemoTopic(seed: number): string { return topics[Math.abs(seed) % topics.length]!; }
