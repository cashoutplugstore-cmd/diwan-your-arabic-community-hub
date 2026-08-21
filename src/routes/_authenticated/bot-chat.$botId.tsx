import { createFileRoute } from "@tanstack/react-router";
import { BotChatPage } from "@/pages/BotChatPage";

const title = "المحادثة | ديوان";
const description = "محادثة مباشرة داخل ديوان.";

export const Route = createFileRoute("/_authenticated/bot-chat/$botId")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: BotChatPage,
});
