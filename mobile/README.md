# Diwan Mobile

Android-first mobile client for Diwan, sharing the existing Supabase backend with the web app.

## Architecture

- Expo + React Native + TypeScript
- Expo Router for navigation
- Supabase Auth / Database / Realtime / Storage
- Arabic-first RTL UI
- Web and mobile remain separate clients over the same backend

## Environment

Create `mobile/.env` with:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Never put a Supabase service-role key in the mobile app.

## Next steps

1. Verify Expo Android build.
2. Reuse the existing auth/profile data model.
3. Add Rooms + Chat screens and realtime subscriptions.
4. Add push notifications.
5. Add VIP/PRO entitlement reads from the existing backend.
