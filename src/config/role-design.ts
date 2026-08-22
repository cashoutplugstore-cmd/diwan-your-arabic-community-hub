export const ROLE_DESIGN = {
  global_admin: { label: "Global Admin", icon: "👑👑", tone: "rose", scope: "platform", rank: 100 },
  owner: { label: "Room Owner", icon: "👑", tone: "amber", scope: "room", rank: 90 },
  admin: { label: "Room Admin", icon: "🌹👑", tone: "rose", scope: "room", rank: 80 },
  moderator: { label: "Moderator", icon: "🛡️", tone: "sky", scope: "room", rank: 60 },
  vip: { label: "VIP", icon: "💎", tone: "fuchsia", scope: "benefit", rank: 20 },
  speaker: { label: "Speaker", icon: "🎙️", tone: "emerald", scope: "presence", rank: 10 },
  member: { label: "Member", icon: "👤", tone: "slate", scope: "room", rank: 0 },
} as const;

export type RoleDesignKey = keyof typeof ROLE_DESIGN;
