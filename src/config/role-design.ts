export const ROLE_DESIGN = {
  global_owner: { label: "Global Owner", icon: "👑👑", tone: "amber", scope: "platform", rank: 1000 },
  global_admin: { label: "Global Admin", icon: "💠", tone: "rose", scope: "platform", rank: 900 },
  owner: { label: "Room Owner", icon: "👑", tone: "amber", scope: "room", rank: 800 },
  admin: { label: "Room Admin", icon: "🌹👑", tone: "rose", scope: "room", rank: 700 },
  moderator: { label: "Moderator", icon: "🛡️", tone: "sky", scope: "room", rank: 600 },
  vip: { label: "VIP", icon: "💎", tone: "fuchsia", scope: "benefit", rank: 200 },
  speaker: { label: "Speaker", icon: "🎙️", tone: "emerald", scope: "presence", rank: 100 },
  member: { label: "Member", icon: "👤", tone: "slate", scope: "room", rank: 0 },
} as const;

export type RoleDesignKey = keyof typeof ROLE_DESIGN;
