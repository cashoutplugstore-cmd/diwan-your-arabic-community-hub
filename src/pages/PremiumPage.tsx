import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Coins, Crown, EyeOff, Gift, Globe2, Loader2, Palette, ShieldCheck, Sparkles, UsersRound, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { fetchMyPremiumSubscription, requestPremium, type PremiumPlan } from "@/services/premium.service";

const freeFeatures = [
  "المحادثات والغرف العامة",
  "غرف الدول والمدن",
  "الملف الشخصي والأصدقاء",
  "التنبيهات والبحث",
  "Dark / Light",
];

const vipFeatures = [
  "بدون إعلانات",
  "شارة VIP واسم بتأثير مميز",
  "ثيمات وإطارات بروفايل حصرية",
  "وضع التخفي وإخفاء Online/Read",
  "صور وملفات بجودة أعلى",
  "تثبيت رسائل شخصية",
  "دخول غرف VIP",
];

const proFeatures = [
  "كل مميزات VIP",
  "ترجمة الرسائل فورياً",
  "تلخيص المحادثات واقتراح الردود",
  "إعادة صياغة وتحسين الرسائل بالذكاء الاصطناعي",
  "Avatar وإطار بروفايل متحرك",
  "إحصائيات الحساب ومشاهدات البروفايل",
  "XP وLevels وهدايا رقمية",
  "أولوية في البحث والميزات الجديدة",
];

const communityFeatures = [
  "إنشاء مجتمع خاص متعدد الغرف",
  "Roles وصلاحيات وModerators",
  "دعوات وروابط مخصصة",
  "رسائل ترحيب وقوانين مثبتة",
  "استطلاعات وEvents وإعلانات المجتمع",
  "إحصائيات المجتمع",
  "أدوات متقدمة لمكافحة السبام",
  "شارات وهوية خاصة بالمجتمع",
];

export function PremiumPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscription = useQuery({
    queryKey: ["premium_subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMyPremiumSubscription(user!.id),
  });
  const request = useMutation({
    mutationFn: (plan: PremiumPlan) => requestPremium(user!.id, plan),
    onSuccess: () => {
      toast.success("تم إرسال طلب الاشتراك. سيتم تفعيل الدفع الحقيقي عند ربط Stripe.");
      void queryClient.invalidateQueries({ queryKey: ["premium_subscription", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const current = subscription.data;
  const active = current?.status === "active" && (!current.expires_at || new Date(current.expires_at) > new Date());
  const pending = current?.status === "pending";

  return (
    <div className="diwan-vip-page mx-auto max-w-7xl space-y-6 py-2">
      <section className="diwan-vip-hero glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="diwan-vip-orb" aria-hidden />
        <div className="relative z-10 max-w-4xl">
          <Badge className="mb-4 gap-1 rounded-full px-3 py-1"><Crown className="size-3.5" /> ديوان Premium</Badge>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">اختار مستواك. وخلي ديوان نار 🔥</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            من الاستخدام المجاني إلى VIP وPRO ومجتمعات أصحاب الغرف. كل مستوى مصمم حتى يعطيك قيمة واضحة، مو مجرد إزالة إعلانات.
          </p>
        </div>
      </section>

      {active ? (
        <section className="diwan-vip-status glass rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div>
            <div>
              <h2 className="font-display text-xl font-bold">اشتراكك فعال ✨</h2>
              <p className="mt-1 text-sm text-muted-foreground">أنت الآن ضمن أعضاء ديوان Premium.</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
        <PlanCard title="Free" price="€0" subtitle="ابدأ مجاناً" features={freeFeatures} icon={<Globe2 className="size-5" />} buttonLabel="الحالي للجميع" disabled />
        <PlanCard plan="vip_biweekly" title="VIP" price="€4.99" subtitle="14 يوم من المميزات الحصرية" features={vipFeatures} icon={<Crown className="size-5" />} featured disabled={pending || active || request.isPending} onRequest={request.mutate} />
        <PlanCard plan="pro_monthly" title="PRO" price="€15.99" subtitle="شهر كامل + أدوات AI متقدمة" features={proFeatures} icon={<Zap className="size-5" />} disabled={pending || active || request.isPending} onRequest={request.mutate} />
        <PlanCard plan="community_monthly" title="Community" price="€29.99" subtitle="لأصحاب المجتمعات والغرف" features={communityFeatures} icon={<UsersRound className="size-5" />} disabled={pending || active || request.isPending} onRequest={request.mutate} />
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <FeatureHighlight icon={<Bot className="size-5" />} title="DIWAN AI" text="ترجمة، تلخيص، اقتراح ردود، وإعادة صياغة الرسائل — ضمن طبقة PRO." />
        <FeatureHighlight icon={<Coins className="size-5" />} title="DIWAN COINS — قريباً" text="عملات رقمية للهدايا، Boost للبروفايل والغرف، والإطارات والشارات التجميلية." />
        <FeatureHighlight icon={<Palette className="size-5" />} title="هوية أقوى" text="إطارات، شارات، Avatar متحرك، Status مخصص وثيمات حصرية للمشتركين." />
        <FeatureHighlight icon={<EyeOff className="size-5" />} title="خصوصية متقدمة" text="تحكم أكبر في Online وRead receipts وسجل النشاط والمظهر الذي يظهر للآخرين." />
      </section>

      <section className="glass rounded-3xl p-5 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <p><strong className="text-foreground">الأسعار المعتمدة حالياً:</strong> VIP ‏€4.99 / 14 يوم، PRO ‏€15.99 / شهر، Community ‏€29.99 / شهر. زر الاشتراك حالياً يسجل الطلب بأمان في Supabase، وربط Stripe هو الخطوة التالية للدفع الحقيقي.</p>
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  title,
  price,
  subtitle,
  features,
  icon,
  featured,
  disabled,
  buttonLabel,
  onRequest,
}: {
  plan?: PremiumPlan;
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  icon: React.ReactNode;
  featured?: boolean;
  disabled: boolean;
  buttonLabel?: string;
  onRequest?: (plan: PremiumPlan) => void;
}) {
  return (
    <article className={`diwan-vip-card glass flex h-full flex-col rounded-3xl p-6 ${featured ? "diwan-vip-card-featured" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        {featured ? <Badge>الأكثر شعبية</Badge> : null}
      </div>
      <h2 className="mt-5 font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-black">{price}</span>{plan ? <span className="pb-1 text-sm text-muted-foreground">{plan === "vip_biweekly" ? "/ 14 يوم" : "/ شهر"}</span> : null}</div>
      <ul className="mt-6 flex-1 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul>
      {plan ? <Button className="mt-7 h-11 w-full rounded-xl" disabled={disabled} onClick={() => onRequest?.(plan)}>{disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{disabled ? (buttonLabel ?? "طلبك قيد المعالجة") : "اشترك الآن"}</Button> : <Button variant="outline" className="mt-7 h-11 w-full rounded-xl" disabled>{buttonLabel}</Button>}
    </article>
  );
}

function FeatureHighlight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <section className="glass rounded-3xl p-5"><div className="flex gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div><div><h3 className="font-display font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div></section>;
}
