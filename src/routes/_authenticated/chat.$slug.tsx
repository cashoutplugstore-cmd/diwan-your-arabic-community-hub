import { createFileRoute } from "@tanstack/react-router";
import { ChatRoomPage } from "@/pages/ChatPage";
import { PrivateChatPage } from "@/pages/PrivateChatPage";
import { supabase } from "@/integrations/supabase/client";

const title = "المحادثة | ديوان";
const description = "محادثة خاصة فردية داخل ديوان.";

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
  const [isPrivate, setIsPrivate] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    void supabase.from("rooms").select("is_private").eq("slug", slug).maybeSingle().then(({ data }) => {
      if (active) setIsPrivate(data?.is_private === true);
    });
    return () => { active = false; };
  }, [slug]);

  if (isPrivate === true) return <PrivateChatPage slug={slug} />;
  if (isPrivate === false) return <ChatRoomPage slug={slug} />;
  return null;
}

// Public rooms and private DMs intentionally use separate UIs.
