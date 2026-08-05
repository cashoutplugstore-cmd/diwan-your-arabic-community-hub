import { createFileRoute } from "@tanstack/react-router";
import { ChatIndexPage } from "@/pages/ChatPage";

const title = "المحادثات | ديوان";
const description = "كل محادثاتك وغرفك في مكان واحد مع تحديث لحظي.";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ChatIndexPage,
});