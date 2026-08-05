import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

const title = "ديوان | منصة الدردشة والمجتمعات العربية";
const description =
  "ديوان منصة عربية حديثة للدردشة الفورية والغرف والمجتمعات — رسائل لحظية، أصدقاء، وغرف صوتية.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: HomePage,
});
