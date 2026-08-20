import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { myPrivateChatUnreadCountQuery } from "@/services/private-chats.service";
import { mobileNav } from "./nav-items";

export function MobileNav() {
  const { t } = useI18n();
  const { user } = useAuth();
  const unread = useQuery(myPrivateChatUnreadCountQuery(user?.id));

  return (
    <nav
      aria-label={t.nav.home}
      className="glass-strong fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {mobileNav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
        >
          <span className="relative"><item.icon className="size-5" aria-hidden />{item.to === "/chat" && (unread.data ?? 0) > 0 ? <span className="absolute -end-2 -top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-black text-primary-foreground">{(unread.data ?? 0) > 99 ? "99+" : unread.data}</span> : null}</span>
          <span className="truncate px-1">{item.label(t)}</span>
        </Link>
      ))}
    </nav>
  );
}
