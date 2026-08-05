import { Link } from "@tanstack/react-router";
import { useI18n } from "@/contexts/i18n-context";
import { mobileNav } from "./nav-items";

export function MobileNav() {
  const { t } = useI18n();

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
          <item.icon className="size-5" aria-hidden />
          <span className="truncate px-1">{item.label(t)}</span>
        </Link>
      ))}
    </nav>
  );
}