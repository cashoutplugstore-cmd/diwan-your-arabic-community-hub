# Diwan Engineering Audit — 2026-08-22

## Scope
Initial stability/code audit of the main Diwan application, followed by a small hardening patch on an isolated branch.

## Confirmed architecture
- React 19 + Vite + TypeScript
- TanStack Router / React Query
- Supabase client/Auth/Realtime/Edge Functions
- Tailwind CSS 4
- Dedicated services for rooms, profiles, friends, direct messages, roles and moderation
- AI room members and AI room activity are implemented as a separate virtual-member layer

## Findings

### 1. Room creation had an unchecked second write
`createRoom()` inserted the room and then inserted the owner into `room_members`, but ignored the error from the second insert. This could leave an apparently-created room without its owner membership if the membership write failed.

**Status:** fixed on branch `audit/diwan-stability-2026-08-22`.

### 2. Member/profile routing is structurally correct
`MembersPanel` uses `/profile/$userId` with the row's actual `id`, and the route resolves to `PublicProfilePage`. The public profile page separately handles real profiles and virtual AI members.

**Status:** no blind change made; requires runtime reproduction if the reported symptom still occurs.

### 3. Recent history shows repeated fixes around room AI/member behavior
Recent commits include removal of legacy synthetic member/message activity, bot-spam prevention, current AI identity filtering, and coordinated ambient AI activity.

**Risk:** future AI-room changes should preserve the separation between real users, presence-only users, and virtual AI members.

## Next engineering pass
1. Reproduce the profile-click issue in the browser.
2. Audit Supabase RLS policies for rooms, room_members, profiles and messages.
3. Trace private DM creation/read/write permissions end-to-end.
4. Run typecheck/lint/build in a real checkout/CI environment.
5. Add regression tests for profile routing and room membership invariants.
6. Review AI ambient activity for rate limits, lifecycle cleanup and accidental activation in private rooms.
