import { Link } from "@tanstack/react-router";
import { useI18n } from "@/contexts/i18n-context";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t px-4 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {t.brand} — {t.tagline}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/rooms" className="hover:text-foreground">
            {t.nav.rooms}
          </Link>
          <Link to="/search" className="hover:text-foreground">
            {t.nav.search}
          </Link>
          <Link to="/settings" className="hover:text-foreground">
            {t.nav.settings}
          </Link>
        </div>
      </div>
    </footer>
  );
}