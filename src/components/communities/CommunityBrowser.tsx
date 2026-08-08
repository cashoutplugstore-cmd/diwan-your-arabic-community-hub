import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, Flame, Globe2, MapPin, MessagesSquare, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardGridSkeleton } from "@/components/shared/Loaders";
import { useI18n } from "@/contexts/i18n-context";
import { relativeTime } from "@/lib/time";
import { buildCommunityTree, roomsWithStatsQuery } from "@/services/rooms.service";
import type { RoomWithStats } from "@/types";

function RoomCard({ room }: { room: RoomWithStats }) {
  const { t, locale } = useI18n();
  const isActive = room.last_message_at
    ? Date.now() - new Date(room.last_message_at).getTime() < 60 * 60 * 1000
    : false;

  return (
    <Link
      to="/chat/$slug"
      params={{ slug: room.slug }}
      className="glass group flex flex-col gap-2 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <MapPin className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold">{room.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{room.country ?? "—"}</span>
        </span>
        {isActive ? (
          <Badge className="shrink-0 gap-1 bg-success/15 text-success" variant="secondary">
            <Flame className="size-3" aria-hidden /> {t.communities.active}
          </Badge>
        ) : null}
      </div>
      <p className="line-clamp-1 text-sm text-muted-foreground">{room.description ?? "—"}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {room.member_count} {t.communities.members}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessagesSquare className="size-3.5" aria-hidden /> {room.message_count}
        </span>
        <span className="ms-auto">{relativeTime(room.last_message_at ?? room.last_activity_at, locale)}</span>
      </div>
    </Link>
  );
}

export function CommunityBrowser() {
  const { t } = useI18n();
  const [region, setRegion] = useState<"all" | "arab" | "europe">("all");
  const [term, setTerm] = useState("");
  const [openCountry, setOpenCountry] = useState<string | null>(null);

  const rooms = useQuery(roomsWithStatsQuery());
  const tree = useMemo(() => buildCommunityTree(rooms.data ?? []), [rooms.data]);

  const visible = useMemo(
    () => (region === "all" ? tree : tree.filter((node) => node.region === region)),
    [tree, region],
  );

  const search = term.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!search) return [];
    return (rooms.data ?? []).filter(
      (room) =>
        !room.is_private &&
        [room.name, room.country, room.city, room.description].some((value) =>
          (value ?? "").toLowerCase().includes(search),
        ),
    );
  }, [rooms.data, search]);

  if (rooms.isLoading) return <CardGridSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t.communities.searchRooms}
            aria-label={t.communities.searchRooms}
            className="ps-9"
          />
        </div>
        <Tabs value={region} onValueChange={(value) => setRegion(value as typeof region)}>
          <TabsList className="h-11">
            <TabsTrigger value="all" className="min-h-9">{t.communities.allRegions}</TabsTrigger>
            <TabsTrigger value="arab" className="min-h-9">{t.communities.arab}</TabsTrigger>
            <TabsTrigger value="europe" className="min-h-9">{t.communities.europe}</TabsTrigger>
          </TabsList>
        </Tabs>
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
      ) : visible.length === 0 ? (
        <EmptyState icon={Compass} title={t.common.empty} description={t.communities.subtitle} />
      ) : (
        visible.map((node) => (
          <section key={node.region} className="space-y-3">
            <header className="flex flex-wrap items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Globe2 className="size-4" aria-hidden />
              </span>
              <h2 className="font-display text-lg font-bold">
                {node.region === "arab" ? t.communities.arab : t.communities.europe}
              </h2>
              <Badge variant="secondary">
                {node.countries.length} {t.communities.countries}
              </Badge>
              <Badge variant="secondary">
                {node.room_count} {t.communities.rooms}
              </Badge>
            </header>

            <div className="space-y-3">
              {node.countries.map((country) => {
                const key = `${node.region}:${country.country}`;
                const open = openCountry === key;
                return (
                  <div key={key} className="glass overflow-hidden rounded-2xl">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenCountry(open ? null : key)}
                      className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-bold">{country.country}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {country.cities.length} {t.communities.cities} · {country.member_count}{" "}
                          {t.communities.members}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
                    </button>
                    {open ? (
                      <div className="grid gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">
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
        ))
      )}

      {!search && rooms.data && rooms.data.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">{t.communities.recent}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...rooms.data]
              .filter((room) => !room.is_private)
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
            <Link to="/rooms">{t.homeDash.explore}</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
