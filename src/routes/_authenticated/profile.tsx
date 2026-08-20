import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/ProfilePage";

const title = "الملف الشخصي | ديوان";
const description = "حدّث اسمك الظاهر وصورتك ونبذتك في ديوان.";

function ProfileRoute() {
  const { pathname } = useLocation();

  // /profile is the signed-in user's own profile.
  // /profile/$userId is a nested public-profile route, so render its child
  // instead of the user's own ProfilePage.
  if (pathname === "/profile" || pathname === "/profile/") {
    return <ProfilePage />;
  }

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProfileRoute,
});
