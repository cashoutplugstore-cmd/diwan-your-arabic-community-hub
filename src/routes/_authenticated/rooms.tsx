import { createFileRoute } from "@tanstack/react-router";
import { RoomsPage } from "@/pages/RoomsPage";

const title = "الغرف | ديوان";
const description = "تصفّح غرف ديوان العامة والخاصة، أنشئ غرفتك وادعُ أصدقاءك.";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RoomsPage,
});
