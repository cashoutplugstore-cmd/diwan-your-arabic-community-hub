import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, EyeOff, Globe2, Loader2, Palette, ShieldCheck, Sparkles, UsersRound, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { fetchMyPremiumSubscription, startPremiumCheckout, type PremiumPlan } from "@/services/premium.service";

const vipFeatures = ["بدون إعلانات", "شارة VIP واسم بتأثير مميز", "ثيمات وإطارات بروفايل حصرية", "وضع التخفي وإخفاء Online/Read", "صور وملفات بجودة أعلى", "تثبيت رسائل شخصية", "دخول غرف VIP"];
const proFeatures = [...vipFeatures, "Diwan AI ومزايا اجتماعية متقدمة", "أولوية في المزايا الجديدة"];
const communityFeatures = [...proFeatures, "أدوات إدارة المجتمع", "مزايا للغرف والمجتمعات"];

export function PremiumPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscription = useQuery({ queryKey: ["premium_subscription", user?.id], enabled: Boolean(user?.id), queryFn: () => fetchMyPremiumSubscription(user!.id) });
  const checkout = useMutation({ mutationFn: (plan: PremiumPlan) => startPremiumCheckout(user!.id, plan, user!.email), onError: (error: Error) => toast.error(error.message), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["premium_subscription", user?.id] }) });
  const current = subscription.data;
  const active = current?.status === "active" && (!current.expires_at || new Date(current.expires_at) > new Date());
  const pending = current?.status === "pending";
  return <div className="diwan-vip-page mx-auto max-w-7xl space-y-6 py-2">
    <section className="diwan-vip-hero glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-10"><div className="diwan-vip-orb" aria-hidden /><div className="relative z-10 max-w-4xl"><Badge className="mb-4 gap-1 rounded-full px-3 py-1"><Crown className="size-3.5" /> ديوان Premium</Badge><h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">اختار اشتراكك وخلي ديوان نار 🔥</h1><p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">دفع آمن عبر Stripe، وتفعيل الاشتراك تلقائياً بعد نجاح الدفع.</p></div></section>
    {active ? <section className="diwan-vip-status glass rounded-3xl p-6"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div><div><h2 className="font-display text-xl font-bold">اشتراكك فعال ✨</h2><p className="mt-1 text-sm text-muted-foreground">أنت الآن ضمن أعضاء ديوان Premium.</p></div></div></section> : null}
    <div className="grid gap-5 lg:grid-cols-3 md:grid-cols-2">
      <PlanCard plan="vip" title="VIP" price="€4.99" subtitle="كل أسبوعين" features={vipFeatures} icon={<Zap className="size-5" />} disabled={pending || active || checkout.isPending} onCheckout={checkout.mutate} />
      <PlanCard plan="pro" title="PRO" price="€15.99" subtitle="كل شهر" features={proFeatures} icon={<Crown className="size-5" />} featured disabled={pending || active || checkout.isPending} onCheckout={checkout.mutate} />
      <PlanCard plan="community" title="Community" price="€29.99" subtitle="كل شهر" features={communityFeatures} icon={<Sparkles className="size-5" />} disabled={pending || active || checkout.isPending} onCheckout={checkout.mutate} />
    </div>
    <section className="grid gap-5 md:grid-cols-2"><FeatureHighlight icon={<Palette className="size-5" />} title="هوية Premium" text="شارة وتأثيرات وثيمات حصرية للبروفايل." /><FeatureHighlight icon={<EyeOff className="size-5" />} title="خصوصية متقدمة" text="تحكم أكبر في Online وRead receipts." /><FeatureHighlight icon={<UsersRound className="size-5" />} title="مزايا المجتمع" text="مزايا مخصصة للمشتركين والغرف والمجتمعات." /><FeatureHighlight icon={<Globe2 className="size-5" />} title="دفع آمن" text="تتم عملية الدفع في Stripe ولا نخزن بيانات البطاقة داخل ديوان." /></section>
  </div>;
}
function PlanCard({ plan, title, price, subtitle, features, icon, featured, disabled, onCheckout }: { plan: PremiumPlan; title: string; price: string; subtitle: string; features: string[]; icon: React.ReactNode; featured?: boolean; disabled: boolean; onCheckout: (plan: PremiumPlan) => void }) {
  return <article className={`diwan-vip-card glass flex h-full flex-col rounded-3xl p-6 ${featured ? "diwan-vip-card-featured" : ""}`}><div className="flex items-center justify-between gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>{featured ? <Badge>الأكثر شعبية</Badge> : null}</div><h2 className="mt-5 font-display text-2xl font-extrabold">{title}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{subtitle}</p><div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-black">{price}</span></div><ul className="mt-6 flex-1 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul><Button className="mt-7 h-11 w-full rounded-xl" disabled={disabled} onClick={() => onCheckout(plan)}>{disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{disabled ? "قيد المعالجة" : "اشترك الآن"}</Button></article>;
}
function FeatureHighlight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <section className="glass rounded-3xl p-5"><div className="flex gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div><div><h3 className="font-display font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div></section>; }
