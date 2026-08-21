import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, Flame, Globe2, MessagesSquare, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardGridSkeleton } from "@/components/shared/Loaders";
import { useI18n } from "@/contexts/i18n-context";
import { relativeTime } from "@/lib/time";
import { buildCommunityTree, roomsWithStatsQuery } from "@/services/rooms.service";
import type { RoomWithStats } from "@/types";

function countryFlag(country?: string | null): string {
  const value = (country ?? "").trim().toLowerCase();
  const flags: Record<string, string> = {
    العراق: "🇮🇶",
    iraq: "🇮🇶",
    فنلندا: "🇫🇮",
    finland: "🇫🇮",
    السويد: "🇸🇪",
    sweden: "🇸🇪",
    النرويج: "🇳🇴",
    norway: "🇳🇴",
    الدنمارك: "🇩🇰",
    denmark: "🇩🇰",
    ألمانيا: "🇩🇪",
    germany: "🇩🇪",
    فرنسا: "🇫🇷",
    france: "🇫🇷",
    بريطانيا: "🇬🇧",
    "المملكة المتحدة": "🇬🇧",
    uk: "🇬🇧",
    "united kingdom": "🇬🇧",
    هولندا: "🇳🇱",
    netherlands: "🇳🇱",
    بلجيكا: "🇧🇪",
    belgium: "🇧🇪",
    النمسا: "🇦🇹",
    austria: "🇦🇹",
    سويسرا: "🇨🇭",
    switzerland: "🇨🇭",
    إسبانيا: "🇪🇸",
    spain: "🇪🇸",
    إيطاليا: "🇮🇹",
    italy: "🇮🇹",
    "الولايات المتحدة": "🇺🇸",
    أمريكا: "🇺🇸",
    usa: "🇺🇸",
    "united states": "🇺🇸",
    كندا: "🇨🇦",
    canada: "🇨🇦",
    أستراليا: "🇦🇺",
    australia: "🇦🇺",
    تركيا: "🇹🇷",
    turkey: "🇹🇷",
    مصر: "🇪🇬",
    egypt: "🇪🇬",
    السعودية: "🇸🇦",
    "saudi arabia": "🇸🇦",
    الإمارات: "🇦🇪",
    uae: "🇦🇪",
    الكويت: "🇰🇼",
    kuwait: "🇰🇼",
    قطر: "🇶🇦",
    qatar: "🇶🇦",
    البحرين: "🇧🇭",
    bahrain: "🇧🇭",
    عمان: "🇴🇲",
    oman: "🇴🇲",
    الأردن: "🇯🇴",
    jordan: "🇯🇴",
    لبنان: "🇱🇧",
    lebanon: "🇱🇧",
    سوريا: "🇸🇾",
    syria: "🇸🇾",
    فلسطين: "🇵🇸",
    palestine: "🇵🇸",
    المغرب: "🇲🇦",
    morocco: "🇲🇦",
    الجزائر: "🇩🇿",
    algeria: "🇩🇿",
    تونس: "🇹🇳",
    tunisia: "🇹🇳",
    ليبيا: "🇱🇾",
    libya: "🇱🇾",
    اليمن: "🇾🇪",
    yemen: "🇾🇪",
    السودان: "🇸🇩",
    sudan: "🇸🇩",
  };
  return flags[value] ?? "🌍";
}

function RoomCard({ room }: { room: RoomWithStats }) {
  const { t, locale } = useI18n();
  const isActive = room.last_message_at
    ? Date.now() - new Date(room.last_message_at).getTime() < 60 * 60 * 1000
    : false;
  return (
    <Link
      to="/chat/$slug"
      params={{ slug: room.slug }}
      className="glass group flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 text-xl"
          aria-hidden
        >
          {countryFlag(room.country)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold">{room.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {countryFlag(room.country)} {room.city ?? room.country ?? "—"}
          </span>
        </span>
        {isActive ? (
          <Badge className="shrink-0 gap-1 bg-success/15 text-success" variant="secondary">
            <Flame className="size-3" aria-hidden /> {t.communities.active}
          </Badge>
        ) : null}
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {room.description ?? "—"}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {room.member_count} {t.communities.members}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessagesSquare className="size-3.5" aria-hidden /> {room.message_count}
        </span>
        <span className="ms-auto">
          {relativeTime(room.last_message_at ?? room.last_activity_at, locale)}
        </span>
      </div>
    </Link>
  );
}

export function CommunityBrowser() {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const rooms = useQuery(roomsWithStatsQuery());
  const tree = useMemo(() => buildCommunityTree(rooms.data ?? []), [rooms.data]);
  const allRooms = rooms.data ?? [];
  const countryCount = tree[0]?.countries.length ?? 0;
  const search = term.trim().toLowerCase();
  const searchResults = useMemo(
    () =>
      !search
        ? []
        : allRooms.filter((room) =>
            [room.name, room.country, room.city, room.description].some((value) =>
              (value ?? "").toLowerCase().includes(search),
            ),
          ),
    [allRooms, search],
  );
  if (rooms.isLoading) return <CardGridSkeleton />;
  return (
    <div className="space-y-5" dir="rtl">
      <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -start-10 -top-12 size-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Globe2 className="size-3.5" aria-hidden />
              {t.communities.arab}
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight">الغرف والمجتمعات</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              كل الغرف العامة، مرتبة حسب الدولة والمدينة.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="rounded-2xl bg-secondary/60 px-4 py-2 text-center">
              <div className="text-lg font-black">{countryCount}</div>
              <div className="text-[11px] text-muted-foreground">دولة</div>
            </div>
            <div className="rounded-2xl bg-secondary/60 px-4 py-2 text-center">
              <div className="text-lg font-black">{allRooms.length}</div>
              <div className="text-[11px] text-muted-foreground">غرفة</div>
            </div>
          </div>
        </div>
      </section>
      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t.communities.searchRooms}
          aria-label={t.communities.searchRooms}
          className="h-12 rounded-2xl ps-9"
        />
      </div>
      {search ? (
        searchResults.length === 0 ? (
          <EmptyState icon={Search} title={t.communities.noResults} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )
      ) : tree.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="لا توجد غرف حالياً"
          description="ستظهر الغرف هنا عند توفرها."
        />
      ) : (
        <section className="space-y-3">
          <header className="flex items-center gap-2 px-1">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Globe2 className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">الدول</h2>
              <p className="text-xs text-muted-foreground">اختر الدولة لعرض غرفها</p>
            </div>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {tree[0]?.countries.map((country) => {
              const key = `country:${country.country}`;
              const open = openCountry === key;
              return (
                <div key={key} className="glass overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenCountry(open ? null : key)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-2xl"
                      aria-hidden
                    >
                      {countryFlag(country.country)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-bold">
                        {countryFlag(country.country)} {country.country}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {country.cities.length} {t.communities.cities} · {country.member_count}{" "}
                        {t.communities.members}
                      </span>
                    </span>
                    <span className="grid size-8 place-items-center rounded-full bg-secondary text-lg text-muted-foreground">
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <div className="grid gap-3 border-t p-3 sm:grid-cols-2">
                      {country.cities.map((room) => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {!search && allRooms.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-bold">أحدث الغرف</h2>
            <Badge variant="secondary">كل الغرف العامة</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...allRooms]
              .sort(
                (a, b) =>
                  new Date(b.last_message_at ?? b.last_activity_at).getTime() -
                  new Date(a.last_message_at ?? a.last_activity_at).getTime(),
              )
              .slice(0, 6)
              .map((room) => (
                <RoomCard key={`recent-${room.id}`} room={room} />
              ))}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rooms">استكشاف كل الغرف</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
