import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChatRoomPage } from "@/pages/ChatPage";
import { PrivateChatPage } from "@/pages/PrivateChatPage";
import { PrivateChatEntrance } from "@/components/chat/PrivateChatEntrance";
import { PublicRoomEntrance } from "@/components/chat/PublicRoomEntrance";
import { AmbientAIRoomActivity } from "@/components/chat/AmbientAIRoomActivity";
import { supabase } from "@/integrations/supabase/client";

const title = "المحادثة | ديوان";
const description = "محادثة داخل ديوان.";

export const Route = createFileRoute("/_authenticated/chat/$slug")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ChatRoomRoute,
});

function ChatRoomRoute() {
  const { slug } = Route.useParams();
  const [room, setRoom] = React.useState<{ id: string; is_private: boolean } | null>(null);

  React.useEffect(() => {
    let active = true;
    void supabase.from("rooms").select("id,is_private").eq("slug", slug).maybeSingle().then(({ data }) => {
      if (active) setRoom(data ? { id: data.id, is_private: data.is_private === true } : null);
    });
    return () => { active = false; };
  }, [slug]);

  if (!room) return null;
  if (room.is_private) {
    return (
      <PrivateChatEntrance key={slug} slug={slug}>
        <PrivateChatPage slug={slug} />
      </PrivateChatEntrance>
    );
  }

  return (
    <PublicRoomEntrance key={slug} slug={slug}>
      <ChatRoomPage slug={slug} />
      <React.Suspense fallback={null}>
        <AmbientAIRoomActivity roomId={room.id} />
      </React.Suspense>
    </PublicRoomEntrance>
  );
}

// Public rooms and private DMs intentionally use separate entrance experiences.
