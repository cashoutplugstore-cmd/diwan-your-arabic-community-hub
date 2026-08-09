import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, EyeOff, Globe2, Loader2, Palette, ShieldCheck, Sparkles, UsersRound, Zap } from "lucide-react";
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
      toast.success("تم إرسال طلب الاشتراك. الدفع الحقيقي يُفعّل بعد ربط Stripe.");
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
          <Badge className="mb-4 gap-1 rounded-full px-3 py-1"><Crown className="size-3.5" /> ديوان VIP</Badge>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">اختار اشتراكك وخلي ديوان نار 🔥</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            ثلاث خطط واضحة وبسيطة: أسبوعي، شهري، وسنوي. نفس مزايا VIP، والفرق فقط بمدة الاشتراك والسعر.
          </p>
        </div>
      </section>

      {active ? (
        <section className="diwan-vip-status glass rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div>
            <div>
              <h2 className="font-display text-xl font-bold">اشتراكك فعال ✨</h2>
              <p className="mt-1 text-sm text-muted-foreground">أنت الآن ضمن أعضاء ديوان VIP.</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3 md:grid-cols-2">
        <PlanCard plan="weekly" title="VIP أسبوعي" price="€3.99" subtitle="7 أيام من مزايا VIP" features={vipFeatures} icon={<Zap className="size-5" />} disabled={pending || active || request.isPending} onRequest={request.mutate} />
        <PlanCard plan="monthly" title="VIP شهري" price="€5.99" subtitle="شهر كامل من مزايا VIP" features={vipFeatures} icon={<Crown className="size-5" />} featured disabled={pending || active || request.isPending} onRequest={request.mutate} />
        <PlanCard plan="yearly" title="VIP سنوي" price="€35" subtitle="سنة كاملة من مزايا VIP" features={vipFeatures} icon={<Sparkles className="size-5" />} disabled={pending || active || request.isPending} onRequest={request.mutate} />
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <FeatureHighlight icon={<Palette className="size-5" />} title="هوية VIP" text="شارة VIP، تأثيرات الاسم، إطارات وثيمات حصرية للبروفايل." />
        <FeatureHighlight icon={<EyeOff className="size-5" />} title="خصوصية متقدمة" text="تحكم أكبر في Online وRead receipts والمظهر الذي يظهر للآخرين." />
        <FeatureHighlight icon={<UsersRound className="size-5" />} title="غرف VIP" text="دخول إلى الغرف والمزايا المخصصة للأعضاء المشتركين." />
        <FeatureHighlight icon={<Globe2 className="size-5" />} title="مزايا ديوان الأساسية" text="تبقى المحادثات والغرف والأصدقاء والتنبيهات والبحث متاحة للجميع." />
      </section>

      <section className="glass rounded-3xl p-5 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 size-5 shrink-0 text-primary" />
          <p><strong className="text-foreground">الأسعار المعتمدة:</strong> أسبوعي €3.99، شهري €5.99، سنوي €35.00. الطلب يُحفظ حالياً في Supabase، وربط Stripe للدفع الحقيقي هو الخطوة التالية.</p>
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
  onRequest,
}: {
  plan: PremiumPlan;
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  icon: React.ReactNode;
  featured?: boolean;
  disabled: boolean;
  onRequest: (plan: PremiumPlan) => void;
}) {
  return (
    <article className={`diwan-vip-card glass flex h-full flex-col rounded-3xl p-6 ${featured ? "diwan-vip-card-featured" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        {featured ? <Badge>الأكثر شعبية</Badge> : null}
      </div>
      <h2 className="mt-5 font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-black">{price}</span></div>
      <ul className="mt-6 flex-1 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul>
      <Button className="mt-7 h-11 w-full rounded-xl" disabled={disabled} onClick={() => onRequest(plan)}>
        {disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {disabled ? "طلبك قيد المعالجة" : "اشترك الآن"}
      </Button>
    </article>
  );
}

function FeatureHighlight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <section className="glass rounded-3xl p-5"><div className="flex gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div><div><h3 className="font-display font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div></section>;
}
