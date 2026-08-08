import { createFileRoute } from "@tanstack/react-router";
import { DiwanAIPage } from "@/pages/DiwanAIPage";

const title = "ديوان AI | ديوان";
const description = "مساعد ديوان الذكي باللغة العربية.";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DiwanAIPage,
});
