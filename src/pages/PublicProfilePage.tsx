import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, ShieldCheck, UserRound } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { supabase } from "@/integrations/supabase/client";

export function PublicProfilePage() {
  const { userId } = useParams({ from: "/_authenticated/profile/$userId" });

  const profile = useQuery({
    queryKey: ["public-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,bio,gender")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const identity = useQuery({
    queryKey: ["public-profile-identity", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      return {
        role: data?.some((r) => r.role === "admin")
          ? "admin"
          : data?.some((r) => r.role === "moderator")
            ? "moderator"
            : null,
      };
    },
  });

  if (profile.isLoading) {
    return <div className="p-6 text-center text-muted-foreground">جارٍ تحميل الملف الشخصي...</div>;
  }

  if (!profile.data) {
    return (
      <div className="space-y-4 p-6 text-center">
        <UserRound className="mx-auto size-12 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">العضو غير موجود</h1>
        <Link to="/chat">
          <Button variant="outline">العودة للدردشة</Button>
        </Link>
      </div>
    );
  }

  const role = identity.data?.role;
  const avatarRole =
    role === "admin"
      ? "admin"
      : role === "moderator"
        ? "moderator"
        : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Link to="/chat">
        <Button variant="ghost" size="sm">
          <ArrowRight className="me-2 size-4" />
          العودة
        </Button>
      </Link>

      <section className="glass-strong relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -end-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-gradient-to-br from-primary via-fuchsia-400 to-amber-300 p-1.5 shadow-xl">
            <UserAvatar
              name={profile.data.display_name || profile.data.username}
              src={profile.data.avatar_url}
              size="lg"
              role={avatarRole}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h1 className="font-display text-2xl font-black">
                {profile.data.display_name || profile.data.username}
              </h1>

              {role === "admin" ? (
                <Badge className="border-amber-400/40 bg-amber-400/15 text-amber-300">
                  <ShieldCheck className="me-1 size-3" />
                  ADMIN
                </Badge>
              ) : role === "moderator" ? (
                <Badge className="border-sky-400/40 bg-sky-400/15 text-sky-300">
                  MOD
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              @{profile.data.username}
            </p>
          </div>

          <div className="w-full rounded-2xl border bg-secondary/30 p-4 text-start">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              النبذة
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {profile.data.bio || "هذا العضو لم يضف نبذة بعد."}
            </p>
          </div>

          {profile.data.gender ? (
            <div className="w-full rounded-2xl border bg-secondary/20 p-3 text-sm">
              {profile.data.gender === "male" ? "ذكر" : "أنثى"}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
