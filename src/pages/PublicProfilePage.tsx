import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { aiMembers } from "@/data/aiMembers";
import { DEMO_PROFILES } from "@/lib/demo-community";

function getProfileIdFromUrl(fallback: string | undefined) {
  if (typeof window === "undefined") return fallback;
  const match = window.location.pathname.match(/\/profile\/([^/?#]+)/u);
  if (!match?.[1]) return fallback;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export function PublicProfilePage() {
  const params = useParams({ from: "/_authenticated/profile/$userId" });
  const userId = getProfileIdFromUrl(params.userId);
  const aiBot = aiMembers.find((member) => member.id === userId);
  const demoMember = DEMO_PROFILES.find((member) => member.id === userId);
  const bot = aiBot ?? (demoMember ? { id: demoMember.id, name: demoMember.display_name || demoMember.username, avatar: "🤖", personality: "عضو من مجتمع ديوان", topics: ["السوالف", "المجتمع", "الدردشة"] } : null);
  const profile = useQuery({ queryKey: ["public-profile", userId], enabled: Boolean(userId) && !bot, queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", userId!).maybeSingle(); if (error) throw error; return data; } });
  const identity = useQuery({ queryKey: ["public-profile-identity", userId], enabled: Boolean(userId) && !bot, queryFn: async () => { const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!); return { role: data?.some((r) => r.role === "admin") ? "admin" : data?.some((r) => r.role === "moderator") ? "moderator" : null }; } });
  if (bot) return <div className="mx-auto w-full max-w-2xl space-y-5"><Link to="/chat"><Button variant="ghost" size="sm"><ArrowRight className="me-2 size-4" />العودة</Button></Link><section className="glass-strong relative overflow-hidden rounded-3xl p-6"><div className="pointer-events-none absolute -end-20 -top-20 size-56 rounded-full bg-fuchsia-400/10 blur-3xl" /><div className="relative flex flex-col items-center gap-4 text-center"><div className="grid size-28 place-items-center rounded-full border-4 border-fuchsia-400/40 bg-secondary text-6xl shadow-xl">{bot.avatar}</div><div><h1 className="font-display text-2xl font-black">{bot.name}</h1><p className="mt-1 text-sm text-muted-foreground">@{bot.id}</p></div><Badge variant="secondary">عضو</Badge><div className="w-full rounded-2xl border bg-secondary/30 p-4 text-start"><p className="mb-1 text-xs font-semibold text-muted-foreground">النبذة</p><p className="text-sm leading-6">{bot.personality} · يحب {bot.topics.slice(0, 3).join("، ")}.</p></div></div></section></div>;
  if (profile.isLoading) return <div className="p-6 text-center text-muted-foreground">جارٍ تحميل الملف الشخصي...</div>;
  if (!profile.data || profile.data.id !== userId) return <div className="space-y-4 p-6 text-center"><UserRound className="mx-auto size-12 text-muted-foreground" /><h1 className="font-display text-xl font-bold">العضو غير موجود</h1><Link to="/chat"><Button variant="outline">العودة للدردشة</Button></Link></div>;
  const role = identity.data?.role;
  const avatarRole = role === "admin" ? "admin" : role === "moderator" ? "moderator" : null;
  const displayName = profile.data.display_name || profile.data.username;
  return <div className="mx-auto w-full max-w-2xl space-y-5"><Link to="/chat"><Button variant="ghost" size="sm"><ArrowRight className="me-2 size-4" />العودة</Button></Link><section className="glass-strong relative overflow-hidden rounded-3xl p-6"><div className="pointer-events-none absolute -end-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" /><div className="relative flex flex-col items-center gap-4 text-center"><div className="rounded-full bg-gradient-to-br from-primary via-fuchsia-400 to-amber-300 p-1.5 shadow-xl"><UserAvatar name={displayName} src={profile.data.avatar_url} size="lg" role={avatarRole} autoCurrentRole={false} /></div><div><div className="flex flex-wrap items-center justify-center gap-2"><h1 className="font-display text-2xl font-black">{displayName}</h1>{role === "admin" ? <Badge className="border-amber-400/40 bg-amber-400/15 text-amber-300"><ShieldCheck className="me-1 size-3" />ADMIN</Badge> : role === "moderator" ? <Badge className="border-sky-400/40 bg-sky-400/15 text-sky-300">MOD</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">@{profile.data.username}</p></div><div className="w-full rounded-2xl border bg-secondary/30 p-4 text-start"><p className="mb-1 text-xs font-semibold text-muted-foreground">النبذة</p><p className="whitespace-pre-wrap text-sm leading-6">{profile.data.bio || "هذا العضو لم يضف نبذة بعد."}</p></div></div></section></div>;
}
