import { Crown, Gem, Medal, Sparkles, Trophy, Zap, Shield, Star } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import "@/features/premium/diwan-premium.css";

type Props = {
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  status?: string;
};

const achievements = [
  { icon: Trophy, label: "أول عضو", tone: "text-amber-400" },
  { icon: Zap, label: "نشاط عالي", tone: "text-sky-400" },
  { icon: Medal, label: "عضو مميز", tone: "text-violet-400" },
  { icon: Gem, label: "VIP", tone: "text-fuchsia-400" },
  { icon: Shield, label: "موثوق", tone: "text-emerald-400" },
  { icon: Star, label: "نجم الغرفة", tone: "text-yellow-300" },
];

export function ProfileIdentityCard({ name, username, avatarUrl, bio, status = "متاح الآن 🟢" }: Props) {
  const xp = 680;
  const nextLevel = 1000;
  const progress = Math.round((xp / nextLevel) * 100);

  return (
    <section className="dw-premium-card relative overflow-hidden p-5 shadow-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="relative shrink-0 rounded-full p-1 ring-2 ring-fuchsia-400/60 ring-offset-2 ring-offset-background">
          <UserAvatar name={name || username} src={avatarUrl} size="lg" />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg"><Crown className="h-3.5 w-3.5" /></span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-black">{name || username}</h2>
            <span className="dw-role-badge dw-role-badge--vip"><Sparkles className="h-3 w-3" /> VIP</span>
          </div>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">@{username}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><span className="inline-flex max-w-full items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{status}</span><span className="dw-role-badge"><span className="dw-status-dot" /> مجتمع نشط</span></div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{bio || "جاهز للسوالف ✨"}</p>
        </div>
      </div>
      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">المستوى 7 · VIP</span><span className="text-muted-foreground">{xp} / {nextLevel} XP</span></div>
        <div className="dw-xp-track"><div className="dw-xp-fill" style={{ width: `${progress}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>320 XP متبقية</span><span>Level 8</span></div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {achievements.map(({ icon: Icon, label, tone }) => <div key={label} title={label} className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2 text-center transition-transform hover:-translate-y-0.5"><Icon className={`h-4 w-4 ${tone}`} /><span className="truncate text-[10px] text-muted-foreground">{label}</span></div>)}
      </div>
    </section>
  );
}
