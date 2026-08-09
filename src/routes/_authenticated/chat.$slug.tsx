import { createFileRoute } from "@tanstack/react-router";
import { ChatRoomPage } from "@/pages/ChatPage";

const title = "غرفة المحادثة | ديوان";
const description = "دردشة فورية داخل غرف ديوان مع تحديث لحظي للرسائل.";

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
  return <ChatRoomPage slug={slug} />;
}

// Keep the chat route as the deployment entry point for the current UI.