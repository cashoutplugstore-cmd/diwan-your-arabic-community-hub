# Production deployment trigger

This file intentionally triggers a fresh Vercel Production deployment from `main` after the latest Diwan chat/member identity updates.

- Chat history: real persisted member messages only
- No synthetic ambient message history
- AI replies are ephemeral and only start after a real member message
- Demo identities are never inserted into the real messages table
- Role control remains single and subtle in the room header
- Public staff badges resolve from shared profile and role data, not the current viewer
- Compact chat avatars no longer render a second ADMIN/MOD/عضو pill above the avatar
- Role labels stay beside the message author so the chat bubble remains aligned

Deployment sync marker: 2026-08-10T00:12:00Z
