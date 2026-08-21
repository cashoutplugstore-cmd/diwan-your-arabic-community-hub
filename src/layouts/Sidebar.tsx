import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { myPrivateChatUnreadCountQuery } from "@/services/private-chats.service";
import { useI18n } from "@/contexts/i18n-context";
import { primaryNav, secondaryNav } from "./nav-items";

export function Sidebar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const unread = useQuery(myPrivateChatUnreadCountQuery(user?.id));

  return (
    <aside className="sticky top-[73px] hidden h-[calc(100dvh-73px)] w-60 shrink-0 overflow-y-auto scrollbar-slim border-e px-3 py-5 lg:block">
      <nav className="space-y-1" aria-label={t.nav.home}>
        {primaryNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
          >
            <span className="relative shrink-0">
              <item.icon className="size-4" aria-hidden />
              {item.to === "/chat" && (unread.data ?? 0) > 0 ? (
                <span className="absolute -end-2 -top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-black text-primary-foreground">
                  {(unread.data ?? 0) > 99 ? "99+" : unread.data}
                </span>
              ) : null}
            </span>
            <span className="truncate">{item.label(t)}</span>
          </Link>
        ))}
      </nav>

      <div className="my-4 border-t" />

      <Link
        to="/premium"
        className="mb-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary/15 hover:shadow-md"
      >
        <Crown className="size-5 shrink-0" aria-hidden />
        <span>VIP والاشتراكات</span>
      </Link>

      <nav className="space-y-1">
        {secondaryNav
          .filter((item) => item.to !== "/premium")
          .map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label(t)}</span>
            </Link>
          ))}
      </nav>
    </aside>
  );
}

// VIP navigation is intentionally prominent and placed above profile/settings.
