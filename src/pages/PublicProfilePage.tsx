import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Clock3, MessageCircle, ShieldCheck, UserMinus, UserPlus, UserRound } from "lucide-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { aiMembers } from "@/data/aiMembers";
import { DEMO_PROFILES } from "@/lib/demo-community";
import { fetchFriendshipBetween, removeFriendship, respondToRequest, sendFriendRequest } from "@/services/friends.service";
import { getOrCreateDirectRoom } from "@/services/direct-messages.service";

export function PublicProfilePage() {
  const params = useParams({ from: "/_authenticated/profile/$userId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = params.userId;

  const aiBot = aiMembers.find((member) => member.id === userId);
  const demoMember = DEMO_PROFILES.find((member) => member.id === userId);
  const bot = aiBot ?? (demoMember ? { id: demoMember.id, name: demoMember.display_name || demoMember.username, avatar: "🤖", personality: "عضو من مجتمع ديوان", topics: ["السوالف", "المجتمع", "الدردشة"] } : null);
  const isSelf = Boolean(user?.id && user.id === userId);

  const profile = useQuery({
    queryKey: ["public-profile", userId],
    enabled: Boolean(userId) && !bot,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const identity = useQuery({
    queryKey: ["public-profile-identity", userId],
    enabled: Boolean(userId) && !bot,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      return { role: data?.some((r) => r.role === "admin") ? "admin" : data?.some((r) => r.role === "moderator") ? "moderator" : null };
    },
  });

  const friendship = useQuery({
    queryKey: ["friendship-between", user?.id, userId],
    enabled: Boolean(user?.id && userId && !bot && !isSelf),
    queryFn: () => fetchFriendshipBetween(user!.id, userId!),
  });

  const refreshFriendship = () => {
    void queryClient.invalidateQueries({ queryKey: ["friendship-between", user?.id, userId] });
    void queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });
  };

  const addFriend = useMutation({ mutationFn: () => sendFriendRequest(user!.id, userId!), onSuccess: refreshFriendship, onError: (error: Error) => toast.error(error.message) });
  const acceptFriend = useMutation({ mutationFn: () => respondToRequest(friendship.data!.id, "accepted"), onSuccess: refreshFriendship, onError: (error: Error) => toast.error(error.message) });
  const removeFriend = useMutation({ mutationFn: () => removeFriendship(friendship.data!.id), onSuccess: refreshFriendship, onError: (error: Error) => toast.error(error.message) });
  const message = useMutation({ mutationFn: () => getOrCreateDirectRoom(userId!), onSuccess: (slug) => void navigate({ to: "/chat/$slug", params: { slug } }), onError: (error: Error) => toast.error(error.message) });

  if (bot) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <Link to="/chat"><Button variant="ghost" size="sm"><ArrowRight className="me-2 size-4" />العودة</Button></Link>
        <section className="glass-strong relative overflow-hidden rounded-3xl p-6">
          <div className="pointer-events-none absolute -end-20 -top-20 size-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="grid size-28 place-items-center rounded-full border-4 border-fuchsia-400/40 bg-secondary text-6xl shadow-xl">{bot.avatar}</div>
            <div><h1 className="font-display text-2xl font-black">{bot.name}</h1><p className="mt-1 text-sm text-muted-foreground">@ai_bot</p></div>
            <Badge variant="secondary">BOT</Badge>
            <div className="w-full rounded-2xl border bg-secondary/30 p-4 text-start"><p className="text-sm leading-6">عضو آلي للمحادثة فقط.</p></div>
            <Button className="w-full gap-2" disabled={!user} onClick={() => void navigate({ to: "/bot-chat/$botId", params: { botId: bot.id } })}><MessageCircle className="size-4" />مراسلة</Button>
          </div>
        </section>
      </div>
    );
  }

  if (profile.isLoading) return <div className="p-6 text-center text-muted-foreground">جارٍ تحميل الملف الشخصي...</div>;
  if (!profile.data || profile.data.id !== userId) return <div className="space-y-4 p-6 text-center"><UserRound className="mx-auto size-12 text-muted-foreground" /><h1 className="font-display text-xl font-bold">العضو غير موجود</h1><Link to="/chat"><Button variant="outline">العودة للدردشة</Button></Link></div>;

  const role = identity.data?.role;
  const avatarRole = role === "admin" ? "admin" : role === "moderator" ? "moderator" : null;
  const displayName = profile.data.display_name || profile.data.username;
  const relation = friendship.data;
  const busy = addFriend.isPending || acceptFriend.isPending || removeFriend.isPending || message.isPending;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Link to="/chat"><Button variant="ghost" size="sm"><ArrowRight className="me-2 size-4" />العودة</Button></Link>
      <section className="glass-strong relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -end-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-gradient-to-br from-primary via-fuchsia-400 to-amber-300 p-1.5 shadow-xl"><UserAvatar name={displayName} src={profile.data.avatar_url} size="lg" role={avatarRole} autoCurrentRole={false} /></div>
          <div><div className="flex flex-wrap items-center justify-center gap-2"><h1 className="font-display text-2xl font-black">{displayName}</h1>{role === "admin" ? <Badge className="border-amber-400/40 bg-amber-400/15 text-amber-300"><ShieldCheck className="me-1 size-3" />ADMIN</Badge> : role === "moderator" ? <Badge className="border-sky-400/40 bg-sky-400/15 text-sky-300">MOD</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">@{profile.data.username}</p></div>
          {!isSelf ? <div className="flex w-full flex-wrap justify-center gap-2">
            {relation?.status === "accepted" ? <Button variant="secondary" className="gap-2" onClick={() => removeFriend.mutate()} disabled={busy}><UserMinus className="size-4" />إزالة الصديق</Button> : relation?.status === "pending" && relation.addressee_id === user?.id ? <Button className="gap-2" onClick={() => acceptFriend.mutate()} disabled={busy}><Check className="size-4" />قبول طلب الصداقة</Button> : relation?.status === "pending" ? <Button variant="outline" className="gap-2" disabled><Clock3 className="size-4" />تم إرسال الطلب</Button> : <Button className="gap-2" onClick={() => addFriend.mutate()} disabled={busy || !user}><UserPlus className="size-4" />إرسال طلب صداقة</Button>}
            <Button variant="outline" className="gap-2" onClick={() => message.mutate()} disabled={busy || !user}><MessageCircle className="size-4" />مراسلة</Button>
          </div> : <Badge variant="secondary">هذا حسابك</Badge>}
          <div className="w-full rounded-2xl border bg-secondary/30 p-4 text-start"><p className="mb-1 text-xs font-semibold text-muted-foreground">النبذة</p><p className="whitespace-pre-wrap text-sm leading-6">{profile.data.bio || "هذا العضو لم يضف نبذة بعد."}</p></div>
        </div>
      </section>
    </div>
  );
}
