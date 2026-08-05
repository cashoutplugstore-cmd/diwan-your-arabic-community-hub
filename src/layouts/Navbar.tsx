import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, LogOut, Moon, Search, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useTheme } from "@/contexts/theme-context";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="glass-strong sticky top-0 z-40 border-b">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Link to="/" className="min-w-0" aria-label={t.brand}>
          <BrandLogo label={t.brand} />
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label={t.nav.search}>
            <Link to="/search">
              <Search className="size-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={t.common.language}
          >
            <Globe className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t.common.theme}>
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="ms-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <UserAvatar name={user?.email ?? "?"} size="sm" status="online" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="size-4" /> {t.nav.profile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4" /> {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t.nav.login}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">{t.nav.register}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}