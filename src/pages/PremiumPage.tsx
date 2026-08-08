import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { fetchMyPremiumSubscription, requestPremium, type PremiumPlan } from "@/services/premium.service";

const features = ["مظهر VIP مميز داخل ديوان", "شارة VIP بجانب الحساب والملف", "مزايا Premium الجديدة عند إطلاقها", "أولوية في الميزات والتجارب الجديدة"];

export function PremiumPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscription = useQuery({ queryKey: ["premium_subscription", user?.id], enabled: Boolean(user?.id), queryFn: () => fetchMyPremiumSubscription(user!.id) });
  const request = useMutation({
    mutationFn: (plan: PremiumPlan) => requestPremium(user!.id, plan),
    onSuccess: () => { toast.success("تم إرسال طلب VIP. سيتم تفعيل الاشتراك بعد تأكيد الدفع."); void queryClient.invalidateQueries({ queryKey: ["premium_subscription", user?.id] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const current = subscription.data;
  const active = current?.status === "active" && (!current.expires_at || new Date(current.expires_at) > new Date());
  const pending = current?.status === "pending";
  return (
    <div className="diwan-vip-page mx-auto max-w-5xl space-y-6 py-2">
      <section className="diwan-vip-hero glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-10"><div className="diwan-vip-orb" aria-hidden /><div className="relative z-10 max-w-3xl"><Badge className="mb-4 gap-1 rounded-full px-3 py-1"><Crown className="size-3.5" /> ديوان VIP</Badge><h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">اشتراكك، امتيازك.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">قسم VIP مخصص للأعضاء المشتركين فقط، مع مظهر مميز وشارة VIP ومزايا حصرية.</p></div></section>
      {active ? <section className="diwan-vip-status glass rounded-3xl p-6"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div><div><h2 className="font-display text-xl font-bold">اشتراكك فعال ✨</h2><p className="mt-1 text-sm text-muted-foreground">أنت الآن ضمن أعضاء ديوان VIP.</p></div></div></section> : <div className="grid gap-5 md:grid-cols-2"><PlanCard plan="monthly" title="VIP شهري" price="€5.99" subtitle="30 يوم من مزايا VIP" features={features} disabled={pending || request.isPending} onRequest={request.mutate} /><PlanCard plan="yearly" title="VIP سنوي" price="€25.00" subtitle="سنة كاملة من مزايا VIP" features={features} featured disabled={pending || request.isPending} onRequest={request.mutate} /></div>}
      <section className="glass rounded-3xl p-5 text-sm text-muted-foreground"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-primary" /><p>الأسعار الحالية: <strong className="text-foreground">€5.99 للشهر</strong> و<strong className="text-foreground">€25 للسنة</strong>. الدفع الحقيقي سيتم ربطه عبر Stripe بعد فحصك للصفحة.</p></div></section>
    </div>
  );
}
function PlanCard({ plan, title, price, subtitle, features, featured, disabled, onRequest }: { plan: PremiumPlan; title: string; price: string; subtitle: string; features: string[]; featured?: boolean; disabled: boolean; onRequest: (plan: PremiumPlan) => void }) {
  return <article className={`diwan-vip-card glass rounded-3xl p-6 ${featured ? "diwan-vip-card-featured" : ""}`}>{featured ? <Badge className="mb-4">الأفضل قيمة</Badge> : null}<h2 className="font-display text-2xl font-extrabold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p><div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-black">{price}</span><span className="pb-1 text-sm text-muted-foreground">{plan === "monthly" ? "/ شهر" : "/ سنة"}</span></div><ul className="mt-6 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul><Button className="mt-7 h-11 w-full rounded-xl" disabled={disabled} onClick={() => onRequest(plan)}>{disabled ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{disabled ? "طلبك قيد المعالجة" : "اشترك الآن"}</Button></article>;
}
