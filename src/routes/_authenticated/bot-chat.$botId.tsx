import { createFileRoute } from "@tanstack/react-router";
import { BotChatPage } from "@/pages/BotChatPage";

const title = "محادثة البوت | ديوان";
const description = "محادثة خاصة مع أحد بوتات ديوان.";

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
