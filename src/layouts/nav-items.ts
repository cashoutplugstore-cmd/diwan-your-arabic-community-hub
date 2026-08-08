import { Bell, Compass, Crown, Home, MessagesSquare, Search, Settings, Shield, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NavItem = { to: string; label: (t: Dictionary) => string; icon: LucideIcon };

export const primaryNav: NavItem[] = [
  { to: "/", label: (t) => t.nav.home, icon: Home },
  { to: "/rooms", label: (t) => t.nav.rooms, icon: Compass },
  { to: "/chat", label: (t) => t.nav.chat, icon: MessagesSquare },
  { to: "/friends", label: (t) => t.nav.friends, icon: Users },
  { to: "/notifications", label: (t) => t.nav.notifications, icon: Bell },
];

export const secondaryNav: NavItem[] = [
  { to: "/premium", label: () => "VIP والاشتراكات", icon: Crown },
  { to: "/search", label: (t) => t.nav.search, icon: Search },
  { to: "/profile", label: (t) => t.nav.profile, icon: User },
  { to: "/settings", label: (t) => t.nav.settings, icon: Settings },
  { to: "/admin", label: (t) => t.nav.admin, icon: Shield },
];

export const mobileNav: NavItem[] = [
  { to: "/rooms", label: (t) => t.nav.rooms, icon: Compass },
  { to: "/chat", label: (t) => t.nav.chat, icon: MessagesSquare },
  { to: "/friends", label: (t) => t.nav.friends, icon: Users },
  { to: "/notifications", label: (t) => t.nav.notifications, icon: Bell },
  { to: "/profile", label: (t) => t.nav.profile, icon: User },
];