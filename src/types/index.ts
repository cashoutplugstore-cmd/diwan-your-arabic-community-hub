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