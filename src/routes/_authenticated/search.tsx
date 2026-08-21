import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/pages/SearchPage";

const title = "البحث | ديوان";
const description = "ابحث عن أعضاء وغرف داخل ديوان وأضفهم إلى أصدقائك.";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SearchPage,
});
