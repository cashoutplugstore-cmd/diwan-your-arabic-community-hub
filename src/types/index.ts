import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Room = Tables<"rooms">;
export type RoomMember = Tables<"room_members">;
export type Message = Tables<"messages">;
export type Friendship = Tables<"friendships">;
export type Notification = Tables<"notifications">;
export type UserRole = Tables<"user_roles">;

export type MessageWithAuthor = Message & { author: Profile | null };
export type RoomWithMeta = Room & { member_count: number; is_member: boolean };

export type RoomStats = {
  room_id: string;
  member_count: number;
  message_count: number;
  last_message_at: string | null;
};

export type RoomWithStats = Room & {
  member_count: number;
  message_count: number;
  last_message_at: string | null;
};

export type CommunityRegion = "arab" | "europe";

export type CountryNode = {
  country: string;
  cities: RoomWithStats[];
  member_count: number;
  message_count: number;
};

export type RegionNode = {
  region: CommunityRegion;
  countries: CountryNode[];
  room_count: number;
  member_count: number;
};