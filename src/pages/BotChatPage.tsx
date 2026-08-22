import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, SendHorizontal } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { aiMembers, buildAiConversation } from "@/data/aiMembers";

type ChatMessage = { id: string; from: "me" | "bot"; text: string };

export function BotChatPage() {
  const { botId } = useParams({ from: "/_authenticated/bot-chat/$botId" });
  const bot = useMemo(() => aiMembers.find((member) => member.id === botId) ?? null, [botId]);
  const storageKey = `diwan-bot-dm:${botId}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bot) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setMessages(saved.slice(-60));
    } catch {
      setMessages([]);
    }
  }, [bot, storageKey]);

  useEffect(() => {
    if (!bot) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bot, messages, storageKey]);

  function send() {
    const text = draft.trim();
    if (!bot || !text || sending) return;

    setSending(true);
    setDraft("");
    const reply = buildAiConversation(
      bot,
      messages.filter((message) => message.from === "me").map((message) => message.text),
      text,
    ).text;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), from: "me", text },
      { id: crypto.randomUUID(), from: "bot", text: reply },
    ].slice(-60));
    setSending(false);
  }

  if (!bot) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        البوت غير موجود.
      </div>
    );
  }

  return (
    <section className="glass-strong mx-auto flex h-[calc(100dvh-193px)] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-2xl lg:h-[calc(100dvh-175px)] lg:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b bg-background/35 px-3 py-3 sm:px-4">
        <Link to="/">
          <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" aria-label="رجوع">
            <ArrowRight className="size-4" />
          </Button>
        </Link>
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
          <Bot className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-sm font-black sm:text-base">{bot.name}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-slim">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {messages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-secondary text-3xl">
                {bot.avatar}
              </div>
              <h2 className="font-display font-black">ابدأ السالفة ويا {bot.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">اكتب رسالة وابدأ المحادثة.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-end gap-2 ${message.from === "me" ? "flex-row-reverse" : ""}`}>
              {message.from === "bot" ? (
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-lg">{bot.avatar}</div>
              ) : (
                <UserAvatar name="أنت" size="sm" />
              )}
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${message.from === "me" ? "rounded-te-md bg-primary text-primary-foreground" : "rounded-ts-md bg-secondary/80"}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        className="shrink-0 border-t bg-background/50 p-2 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="mx-auto flex max-w-2xl items-end gap-1.5 rounded-2xl border bg-secondary/45 p-1.5 focus-within:border-primary/40">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="اكتب رسالة…"
            className="min-h-10 max-h-28 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={!draft.trim() || sending} aria-label="إرسال">
            <SendHorizontal className="size-5" />
          </Button>
        </div>
      </form>
    </section>
  );
}
