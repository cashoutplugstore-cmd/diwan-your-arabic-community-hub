import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";

const title = "تسجيل الدخول | ديوان";
const description = "سجّل الدخول إلى ديوان لمتابعة محادثاتك وغرفك ومجتمعاتك.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => <AuthPage mode="login" />,
});