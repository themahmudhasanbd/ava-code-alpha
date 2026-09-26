import { useEffect, useRef, useState } from "react";
import { SquarePen } from "lucide-react";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { GlassIconButton } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { AvaMascot } from "@/components/ui/ava-mascot";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import { ChatMessageView } from "./message-parts";
import { Composer } from "./composer";
import { useStickToBottomContext } from "use-stick-to-bottom";

const SUGGESTIONS = ["Create a new feature", "Fix an error", "Explain this project"];

function EmptyChat({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center">
      <div className="max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
        <AvaMascot size="lg" className="mx-auto" />
        <h1 className="mt-5 text-2xl font-semibold sm:text-3xl">What do you want to build?</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Describe a feature, paste an error, or ask AvA to explore your code.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="ghost" size="sm" onClick={() => onPick(s)} className="glass rounded-full">
              {s}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatScreen() {
  const { activeSessionId, setActiveSessionId } = useAva();
  const { data: sessions } = useSessions();
  const { messages, status, error, send, stop, clear, loadingHistory, hasOlder, loadOlder } = useChat();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const title = sessions?.find((s) => s.id === activeSessionId)?.title ?? "New session";

  const submit = (text: string) => {
    setDraft("");
    send(text);
  };

  return (
    <AppShell
      title={title}
      swipeDrawer
      actions={
        <GlassIconButton label="New session" onClick={() => setActiveSessionId(null)}>
          <SquarePen />
        </GlassIconButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 && !loadingHistory ? (
          <EmptyChat
            onPick={(s) => {
              setDraft(s);
              inputRef.current?.focus();
            }}
          />
        ) : (
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
              <HistoryLoader loading={loadingHistory} hasOlder={hasOlder} onLoadOlder={loadOlder} />
              {messages.map((m, i) => (
                <ChatMessageView
                  key={m.id}
                  message={m}
                  live={(status === "submitted" || status === "streaming") && i === messages.length - 1 && m.role === "assistant"}
                />
              ))}
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            <Composer ref={inputRef} value={draft} onChange={setDraft} onSubmit={submit} onStop={stop} status={status} onClear={clear} />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {APP.name} can make mistakes. Review generated code before using it.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HistoryLoader({ loading, hasOlder, onLoadOlder }: { loading: boolean; hasOlder: boolean; onLoadOlder: () => void }) {
  const { scrollRef } = useStickToBottomContext();
  const restoring = useRef<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    const before = restoring.current;
    if (!el || !before) return;
    el.scrollTop = before.top + (el.scrollHeight - before.height);
    restoring.current = null;
  });

  const load = () => {
    const el = scrollRef.current;
    if (el) restoring.current = { height: el.scrollHeight, top: el.scrollTop };
    onLoadOlder();
  };

  if (loading) return <Shimmer className="mx-auto">Loading session…</Shimmer>;
  if (!hasOlder) return null;
  return (
    <Button type="button" variant="ghost" size="sm" className="mx-auto rounded-full text-muted-foreground" onClick={load}>
      Load earlier messages
    </Button>
  );
}
