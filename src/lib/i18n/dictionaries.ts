export type Dictionary = {
  brand: string;
  tagline: string;
  nav: Record<"home"|"rooms"|"chat"|"friends"|"profile"|"settings"|"notifications"|"search"|"admin"|"login"|"register"|"logout", string>;
  home: {
    heroTitle: string;
    heroSubtitle: string;
    cta: string;
    ctaSecondary: string;
    featuresTitle: string;
    features: { title: string; desc: string }[];
  };
  auth: Record<"loginTitle"|"loginSubtitle"|"registerTitle"|"registerSubtitle"|"email"|"password"|"username"|"displayName"|"submitLogin"|"submitRegister"|"google"|"noAccount"|"hasAccount"|"checkEmail", string>;
  common: Record<"loading"|"send"|"save"|"cancel"|"create"|"join"|"leave"|"searchPlaceholder"|"messagePlaceholder"|"empty"|"error"|"language"|"theme"|"dark"|"light", string>;
};

export const ar: Dictionary = {
  brand: "ديوان",
  tagline: "مجتمعك العربي للدردشة والغرف الصوتية",
  nav: {
    home: "الرئيسية",
    rooms: "الغرف",
    chat: "المحادثة",
    friends: "الأصدقاء",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    notifications: "الإشعارات",
    search: "البحث",
    admin: "لوحة التحكم",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
  },
  home: {
    heroTitle: "ديوانك الرقمي، بلغتك",
    heroSubtitle:
      "غرف نقاش، رسائل فورية، أصدقاء ومجتمعات — منصة عربية حديثة مبنية للسرعة والخصوصية.",
    cta: "ابدأ الآن مجاناً",
    ctaSecondary: "استكشف الغرف",
    featuresTitle: "كل ما يحتاجه مجتمعك",
    features: [
      { title: "دردشة فورية", desc: "رسائل لحظية في غرف عامة وخاصة بدون تأخير." },
      { title: "غرف ومجتمعات", desc: "أنشئ غرفة لموضوعك وادعُ أصدقاءك إليها." },
      { title: "أصدقاء وخصوصية", desc: "طلبات صداقة، حظر، ورسائل خاصة محمية." },
      { title: "غرف صوتية", desc: "بنية جاهزة للصوت والفيديو ومساعد ذكي." },
    ],
  },
  auth: {
    loginTitle: "أهلاً بعودتك",
    loginSubtitle: "سجّل الدخول لمتابعة محادثاتك",
    registerTitle: "انضم إلى ديوان",
    registerSubtitle: "أنشئ حسابك في أقل من دقيقة",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    username: "اسم المستخدم",
    displayName: "الاسم الظاهر",
    submitLogin: "دخول",
    submitRegister: "إنشاء الحساب",
    google: "المتابعة عبر Google",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    checkEmail: "تحقق من بريدك الإلكتروني لتأكيد الحساب.",
  },
  common: {
    loading: "جارٍ التحميل...",
    send: "إرسال",
    save: "حفظ",
    cancel: "إلغاء",
    create: "إنشاء",
    join: "انضمام",
    leave: "مغادرة",
    searchPlaceholder: "ابحث عن أشخاص أو غرف...",
    messagePlaceholder: "اكتب رسالة...",
    empty: "لا يوجد شيء هنا بعد",
    error: "حدث خطأ ما",
    language: "اللغة",
    theme: "المظهر",
    dark: "داكن",
    light: "فاتح",
  },
};

export const en: Dictionary = {
  brand: "Diwan",
  tagline: "Your Arabic-first community chat platform",
  nav: {
    home: "Home",
    rooms: "Rooms",
    chat: "Chat",
    friends: "Friends",
    profile: "Profile",
    settings: "Settings",
    notifications: "Notifications",
    search: "Search",
    admin: "Admin",
    login: "Sign in",
    register: "Sign up",
    logout: "Sign out",
  },
  home: {
    heroTitle: "Your digital diwan, in your language",
    heroSubtitle:
      "Rooms, instant messaging, friends and communities — a modern Arabic-first platform built for speed and privacy.",
    cta: "Get started free",
    ctaSecondary: "Explore rooms",
    featuresTitle: "Everything your community needs",
    features: [
      { title: "Realtime chat", desc: "Instant messages in public and private rooms." },
      { title: "Rooms & communities", desc: "Create a room for your topic and invite friends." },
      { title: "Friends & privacy", desc: "Requests, blocking and protected private messages." },
      { title: "Voice rooms", desc: "Architecture ready for voice, video and an AI assistant." },
    ],
  },
  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to continue your conversations",
    registerTitle: "Join Diwan",
    registerSubtitle: "Create your account in under a minute",
    email: "Email",
    password: "Password",
    username: "Username",
    displayName: "Display name",
    submitLogin: "Sign in",
    submitRegister: "Create account",
    google: "Continue with Google",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    checkEmail: "Check your email to confirm your account.",
  },
  common: {
    loading: "Loading...",
    send: "Send",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    join: "Join",
    leave: "Leave",
    searchPlaceholder: "Search people or rooms...",
    messagePlaceholder: "Write a message...",
    empty: "Nothing here yet",
    error: "Something went wrong",
    language: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
  },
};

export type Locale = "ar" | "en";
export const dictionaries: Record<Locale, Dictionary> = { ar, en };