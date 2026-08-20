import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Mic, SendHorizonal, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessagesSkeleton } from "@/components/shared/Loaders";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { useSounds } from "@/contexts/sound-context";
import { roomQuery } from "@/services/rooms.service";
import { fetchMessagePage, MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE, sendMessage } from "@/services/messages.service";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { profileQuery } from "@/services/profiles.service";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

const MEDIA_BUCKET = "chat-media";
type MediaPayload = { type: "image" | "audio"; path: string; name: string; mime: string; size?: number };

function parseMedia(content: string): MediaPayload | null {
  try { const value = JSON.parse(content); return value?.type && value?.path ? value as MediaPayload : null; } catch { return null; }
}

async function signedMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function PrivateChatPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { play } = useSounds();
  const qc = useQueryClient();
  const room = useQuery(roomQuery(slug));
  const profile = useQuery(profileQuery(user?.id));
  const roomId = room.data?.id;
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useInfiniteQuery({ queryKey: ["messages", roomId], enabled: !!roomId, initialPageParam: null as string | null, queryFn: ({ pageParam }) => fetchMessagePage(roomId!, pageParam), getNextPageParam: (last) => last.length < MESSAGE_PAGE_SIZE ? undefined : last[0]?.created_at });
  const items = useMemo(() => [...(messages.data?.pages ?? [])].reverse().flat().filter((m) => !m.is_deleted), [messages.data]);

  useRealtimeMessages(roomId, {
    onInsert: async (message) => {
      if (String(message.user_id).startsWith("demo-")) return;
      let author: Profile | null = message.user_id === user?.id ? profile.data ?? null : null;
      if (!author) { const { data } = await supabase.from("profiles").select("*").eq("id", message.user_id).maybeSingle(); author = data ?? null; }
      qc.setQueryData<any>(["messages", roomId], (prev: any) => {
        if (!prev) return prev;
        const pages = prev.pages.map((p: any) => p.slice());
        if (pages[0]?.some((m: any) => m.id === message.id)) return prev;
        pages[0]?.push({ ...message, author });
        return { ...prev, pages };
      });
      if (message.user_id !== user?.id) play("message");
    },
    onChange: (message) => qc.setQueryData<any>(["messages", roomId], (prev: any) => prev ? { ...prev, pages: prev.pages.map((p: any) => p.map((x: any) => x.id === message.id ? { ...x, ...message } : x)) } : prev),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items.length]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const entries = await Promise.all(items.map(async (m) => {
        const media = parseMedia(m.content);
        if (!media || mediaUrls[m.id]) return null;
        try { return [m.id, await signedMediaUrl(media.path)] as const; } catch { return null; }
      }));
      if (active) setMediaUrls((current) => ({ ...current, ...Object.fromEntries(entries.filter(Boolean) as [string, string][]) }));
    };
    void load();
    return () => { active = false; };
  }, [items, mediaUrls]);

  const sendText = useMutation({ mutationFn: (content: string) => sendMessage({ roomId: roomId!, userId: user!.id, content }), onSuccess: () => { setDraft(""); void qc.invalidateQueries({ queryKey: ["messages", roomId] }); }, onError: (error) => toast.error((error as Error).message) });

  async function uploadBlob(blob: Blob, type: "image" | "audio", name: string) {
    if (!user || !roomId) return;
    setUploading(true);
    try {
      const ext = type === "image" ? (name.split(".").pop() || "jpg") : "webm";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type || (type === "image" ? "image/jpeg" : "audio/webm"), upsert: false });
      if (error) throw error;
      await sendMessage({ roomId, userId: user.id, content: JSON.stringify({ type, path, name, mime: blob.type, size: blob.size }) });
      await qc.invalidateQueries({ queryKey: ["messages", roomId] });
    } catch (error) { toast.error((error as Error).message || "تعذر إرسال الملف"); } finally { setUploading(false); }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 8MB"); return; }
    await uploadBlob(file, "image", file.name);
  }

  async function toggleRecording() {
    if (recording) { mediaRecorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("تسجيل الصوت غير مدعوم على هذا الجهاز"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream); chunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" }); void uploadBlob(blob, "audio", `voice-${Date.now()}.webm`); setRecording(false); };
      recorder.start(); mediaRecorder.current = recorder; setRecording(true);
    } catch { toast.error("اسمح للتطبيق باستخدام المايك لتسجيل رسالة صوتية"); }
  }

  function submit() { const content = draft.trim(); if (!content || !roomId || !user || sendText.isPending) return; sendText.mutate(content.slice(0, MAX_MESSAGE_LENGTH)); }

  if (room.isLoading) return <MessagesSkeleton />;
  if (!room.data || room.data.is_private !== true) return <EmptyState title="هذه ليست محادثة خاصة" description="افتح المحادثة من بروفايل العضو." />;

  return <section className="glass-strong flex min-h-0 h-[calc(100dvh-115px)] flex-1 flex-col overflow-hidden rounded-2xl lg:h-[calc(100dvh-175px)] lg:rounded-3xl">
    <header className="flex shrink-0 items-center gap-3 border-b bg-background/35 px-3 py-3 sm:px-4">
      <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" onClick={() => window.history.back()} aria-label="رجوع"><ArrowLeft className="size-4" /></Button>
      <UserAvatar name={room.data.name} size="sm" />
      <div className="min-w-0 flex-1"><h1 className="truncate font-display text-sm font-black sm:text-base">{room.data.name}</h1><p className="text-[10px] text-muted-foreground sm:text-xs">محادثة خاصة • بينك وبين العضو فقط</p></div>
    </header>
    <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-slim"><div className="mx-auto w-full max-w-3xl space-y-2">
      {messages.hasNextPage ? <div className="flex justify-center"><Button variant="ghost" size="sm" onClick={() => void messages.fetchNextPage()}>تحميل الأقدم</Button></div> : null}
      {messages.isLoading ? <MessagesSkeleton /> : items.length === 0 ? <EmptyState title="لا توجد رسائل" description="ابدأ المحادثة بإرسال رسالة." /> : items.map((message) => {
        const mine = message.user_id === user?.id; const media = parseMedia(message.content); const url = mediaUrls[message.id];
        return <div key={message.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
          {!mine ? <UserAvatar name={message.author?.display_name || message.author?.username || "عضو"} src={message.author?.avatar_url ?? null} size="sm" /> : null}
          <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground rounded-te-md" : "bg-secondary/80 rounded-ts-md"}`}>
            {media?.type === "image" ? url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={media.name || "صورة"} className="max-h-80 max-w-full rounded-xl object-contain" /></a> : <span className="text-xs opacity-70">جاري تحميل الصورة…</span> : media?.type === "audio" ? url ? <audio controls src={url} className="max-w-full" /> : <span className="flex items-center gap-1 text-xs"><Volume2 className="size-4" />جاري تحميل التسجيل…</span> : <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.content}</p>}
            <p className="mt-1 text-[9px] opacity-50">{new Date(message.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>;
      })}
      <div ref={bottomRef} />
    </div></div>
    <form className="shrink-0 border-t bg-background/50 p-2 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFile(event)} />
      <div className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border bg-secondary/45 p-1.5 shadow-sm focus-within:border-primary/40">
        <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 rounded-xl" disabled={uploading || sendText.isPending} onClick={() => fileInput.current?.click()} aria-label="إرسال صورة"><ImagePlus className="size-5" /></Button>
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="اكتب رسالة…" className="min-h-10 max-h-28 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0" />
        <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" className="size-10 shrink-0 rounded-xl" disabled={uploading} onClick={() => void toggleRecording()} aria-label={recording ? "إيقاف التسجيل" : "تسجيل صوتي"}>{recording ? <Square className="size-4" /> : <Mic className="size-5" />}</Button>
        <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={!draft.trim() || sendText.isPending || uploading || !user} aria-label="إرسال"><SendHorizonal className="size-4" /></Button>
      </div>
      <p className="mx-auto mt-1 max-w-3xl px-2 text-[9px] text-muted-foreground">صور حتى 8MB • التسجيل الصوتي من المايك</p>
    </form>
  </section>;
}
