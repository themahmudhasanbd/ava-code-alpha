import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  FilePen,
  Globe,
  Info,
  ListChecks,
  Loader2,
  Plug,
  TerminalSquare,
  Wrench,
  X,
} from "lucide-react";

import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { RichResponse } from "./rich-response";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolInput } from "@/components/ai-elements/tool";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { AIMascot } from "@/components/ui/ask-ai";
import type { ChatMessage, MessagePart } from "@/core/types";
import { cn } from "@/lib/utils";

// ---------- helpers -------------------------------------------------------

export function formatDuration(ms?: number) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} sec`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

const formatTokens = (n?: number) => (n == null ? "" : n >= 1000 ? `${(n / 1000).toFixed(1)}k tokens` : `${n} tokens`);

function toolIcon(part: MessagePart) {
  if (part.toolName === "Terminal") return TerminalSquare;
  if (part.toolName === "File change") return FilePen;
  if (part.toolName === "Web search") return Globe;
  if (part.meta?.server) return Plug;
  return Wrench;
}

function StatusIcon({ status, exitCode }: { status: MessagePart["status"]; exitCode?: number | undefined }) {
  if (status === "running") return <Loader2 className="size-3.5 animate-spin text-primary" />;
  if (status === "error" || (exitCode != null && exitCode !== 0)) return <X className="size-3.5 text-destructive" />;
  return <Check className="size-3.5 text-success" />;
}

function useElapsed(startedAt?: number, running?: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return startedAt ? now - startedAt : undefined;
}

// ---------- step views ----------------------------------------------------

function StepShell({ part, title, subtitle, children }: { part: MessagePart; title: string; subtitle?: string | undefined; children?: React.ReactNode }) {
  const Icon = toolIcon(part);
  return (
    <Tool defaultOpen={false} className="glass mb-0 overflow-hidden rounded-xl border-0">
      <CollapsibleTrigger className="group flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", part.toolName === "Terminal" && "font-mono text-xs")}>{title}</span>
          {subtitle && <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
        </span>
        {!!part.meta?.durationMs && <span className="text-[11px] text-muted-foreground">{formatDuration(part.meta.durationMs)}</span>}
        <StatusIcon status={part.status} exitCode={part.meta?.exitCode} />
        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <ToolContent className="border-t border-border/60">{children}</ToolContent>
    </Tool>
  );
}

function TerminalOutput({ text, running }: { text?: string | undefined; running?: boolean }) {
  if (!text && !running) return <p className="px-3 py-2 text-xs text-muted-foreground">No output</p>;
  return (
    <pre className="max-h-72 overflow-auto bg-foreground/[0.04] px-3 py-2 font-mono text-[11px] leading-5 whitespace-pre-wrap break-all">
      {text}
      {running && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
    </pre>
  );
}

function ToolStep({ part }: { part: MessagePart }) {
  const m = part.meta ?? {};
  if (part.toolName === "Terminal") {
    const sub = [m.cwd, m.exitCode != null ? `exit ${m.exitCode}` : part.status === "running" ? "running…" : ""].filter(Boolean).join(" · ");
    return (
      <StepShell part={part} title={m.command || "Command"} subtitle={sub}>
        <TerminalOutput text={part.output} running={part.status === "running"} />
      </StepShell>
    );
  }
  if (part.toolName === "File change") {
    const files = m.files ?? [];
    return (
      <StepShell part={part} title={files.length === 1 ? `Edited ${files[0]!.path.split("/").pop()}` : `Edited ${files.length} files`} subtitle={files[0]?.path}>
        <ul className="space-y-1 px-3 py-2">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">{f.kind}</span>
              <span className="truncate">{f.path}</span>
            </li>
          ))}
        </ul>
      </StepShell>
    );
  }
  return (
    <StepShell part={part} title={part.toolName ?? "Tool"} subtitle={m.server ? `via ${m.server}` : m.command}>
      <ToolInput input={part.input} />
      {part.output ? (
        <div className="space-y-1 px-4 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{part.status === "error" ? "Error" : "Result"}</p>
          <TerminalOutput text={part.output} />
        </div>
      ) : null}
    </StepShell>
  );
}

function ReasoningStep({ part }: { part: MessagePart }) {
  const running = part.status === "running";
  if (!part.text && !running) return null;
  return (
    <details className="group text-sm text-muted-foreground" open={running || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5">
        <Brain className="size-4" />
        {running ? <Shimmer>Thinking…</Shimmer> : <span>Thought process</span>}
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
      </summary>
      {part.text && <p className="mt-2 whitespace-pre-wrap border-l-2 border-border pl-3 text-[13px] leading-6">{part.text.trim()}</p>}
    </details>
  );
}

function PlanCard({ part }: { part: MessagePart }) {
  const steps = part.meta?.steps ?? [];
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === "done").length;
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <ListChecks className="size-4 text-primary" />
        {part.text || "Plan"}
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">{done}/{steps.length}</span>
      </div>
      <ul className="space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {s.status === "done" ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
            ) : s.status === "active" ? (
              <CircleDot className="mt-0.5 size-3.5 shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(s.status === "done" && "text-muted-foreground line-through")}>{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoticeStep({ part }: { part: MessagePart }) {
  const tone = part.meta?.tone ?? "info";
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <p className={cn("flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs", tone === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span className="whitespace-pre-wrap break-words">{part.text}</span>
    </p>
  );
}

// ---------- messages ------------------------------------------------------

function AssistantTurn({ message, live }: { message: ChatMessage; live: boolean }) {
  const elapsed = useElapsed(message.stats?.startedAt, live);
  const steps = message.parts.filter((p) => p.kind === "tool").length;
  // Final agent output = the last text part of the turn.
  const text = [...message.parts].reverse().find((p) => p.kind === "text" && p.text.trim())?.text.trim() ?? "";
  const [copied, setCopied] = useState(false);
  const duration = message.stats?.durationMs ?? (live ? elapsed : undefined);
  const hasError = message.parts.some((part) => part.status === "error" || part.meta?.tone === "error");
  const activityLabel = hasError
    ? "Needs attention"
    : live
      ? steps > 0
        ? `Working${elapsed ? ` · ${formatDuration(elapsed)}` : ""}`
        : `Thinking${elapsed ? ` · ${formatDuration(elapsed)}` : ""}`
      : "AvA";

  return (
    <Message from="assistant" className="group/assistant">
      <MessageContent className="w-full bg-transparent p-0">
        <div className="mb-3 flex items-center gap-2.5">
          <span className={cn("relative flex size-10 items-center justify-center", live && "after:absolute after:inset-0 after:animate-ping after:rounded-full after:border after:border-mascot-ring")}>
            <AIMascot awake={live} gaze={hasError ? "down" : live && steps > 0 ? "right" : "up"} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {live ? <Shimmer>{activityLabel}</Shimmer> : <span>{activityLabel}</span>}
              {live && <span className="ava-stream-pulse" aria-hidden="true" />}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasError ? "Core reported an error" : live ? `${steps ? `${steps} live step${steps === 1 ? "" : "s"}` : "Preparing the first step"} · streaming now` : duration ? `Completed in ${formatDuration(duration)}` : "Response complete"}
            </p>
          </div>
        </div>
        <div className="space-y-2.5 pl-[3.125rem]">
        {message.parts.map((p) =>
          p.kind === "tool" ? (
            <ToolStep key={p.id} part={p} />
          ) : p.kind === "reasoning" ? (
            <ReasoningStep key={p.id} part={p} />
          ) : p.kind === "plan" ? (
            <PlanCard key={p.id} part={p} />
          ) : p.kind === "notice" ? (
            <NoticeStep key={p.id} part={p} />
          ) : p.text ? (
            <RichResponse key={p.id} text={p.text} />
          ) : null,
        )}
        </div>
      </MessageContent>
      {!live && (text || duration) && (
        <MessageActions className="mt-1 items-center gap-1 text-[11px] text-muted-foreground">
          {text && (
            <MessageAction
              tooltip="Copy final output"
              label="Copy final output"
              onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </MessageAction>
          )}
          <span className="px-1">
            {[duration ? `Worked for ${formatDuration(duration)}` : "", steps ? `${steps} step${steps > 1 ? "s" : ""}` : "", formatTokens(message.stats?.totalTokens)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </MessageActions>
      )}
    </Message>
  );
}

export function ChatMessageView({ message, live = false }: { message: ChatMessage; live?: boolean }) {
  if (message.role === "assistant") return <AssistantTurn message={message} live={live} />;
  return (
    <Message from="user">
      <MessageContent className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
        {message.parts.map((p) => (
          <p key={p.id} className="whitespace-pre-wrap">{p.text}</p>
        ))}
      </MessageContent>
    </Message>
  );
}
