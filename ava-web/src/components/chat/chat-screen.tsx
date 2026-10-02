import { useEffect, useRef, useState } from "react";
import { Clock, Play, SquarePen, X } from "lucide-react";

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
import { ApprovalCard } from "./approval-card";
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
  const {
    messages,
    status,
    error,
    send,
    stop,
    clear,
    loadingHistory,
    hasOlder,
    loadOlder,
    pendingApprovals,
    queuedPrompts,
    answerPendingApproval,
    answerQuestionPart,
    removeQueued,
    resume,
  } = useChat();
  const [draft, setDraft] = useState("");
  const [scrollSignal, setScrollSignal] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const title = sessions?.find((s) => s.id === activeSessionId)?.title ?? "New session";

  const submit = (text: string) => {
    setDraft("");
    setScrollSignal((n) => n + 1);
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
                  onAnswerQuestion={(questionId, option) => void answerQuestionPart(questionId, option)}
                />
              ))}
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
            </ConversationContent>
            <ScrollToBottomTrigger
              signal={scrollSignal}
              sessionId={activeSessionId}
              hasMessages={messages.length > 0}
              loadingHistory={loadingHistory}
            />
            <ConversationScrollButton />
          </Conversation>
        )}
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            {pendingApprovals.map((a) => (
              <ApprovalCard key={a.id} approval={a} onRespond={(id, approved) => answerPendingApproval(id, approved)} />
            ))}
            {queuedPrompts.length > 0 && (
              <div className="glass mb-2 rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-3.5 text-primary" />
                    <span>
                      {queuedPrompts.length} queued prompt{queuedPrompts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {status === "ready" && (
                    <Button type="button" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => void resume()}>
                      <Play className="size-3" />
                      Start next
                    </Button>
                  )}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {queuedPrompts.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{q.text}</span>
                      <button
                        type="button"
                        aria-label="Remove queued prompt"
                        onClick={() => void removeQueued(q.id)}
                        className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

/**
 * StickToBottom only auto-scrolls while the user is already at the bottom,
 * which is right for streaming, but two moments must always land on the
 * latest message: sending your own message (even when scrolled up reading
 * history) and opening a session (even if the previous session was left
 * scrolled up). This bridge lives inside <Conversation> so it can call
 * scrollToBottom() for those moments. Every other append keeps the
 * library's stick / escape behaviour, and loading older history is
 * untouched because the session id does not change then.
 */
function ScrollToBottomTrigger({
  signal,
  sessionId,
  hasMessages,
  loadingHistory,
}: {
  signal: number;
  sessionId: string | null;
  hasMessages: boolean;
  loadingHistory: boolean;
}) {
  const { scrollToBottom } = useStickToBottomContext();
  const lastSignalRef = useRef(signal);
  const scrolledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (signal === lastSignalRef.current) return;
    lastSignalRef.current = signal;
    void scrollToBottom();
  }, [signal, scrollToBottom]);

  useEffect(() => {
    if (!hasMessages || loadingHistory) return;
    if (scrolledSessionRef.current === sessionId) return;
    scrolledSessionRef.current = sessionId;
    void scrollToBottom({ animation: "instant" });
  }, [sessionId, hasMessages, loadingHistory, scrollToBottom]);

  return null;
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
