"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MascotGaze = "up" | "down" | "left" | "right";

export function AIMascot({
  awake = false,
  gaze,
  size = "default",
  brand = false,
  className,
}: {
  awake?: boolean;
  gaze?: MascotGaze;
  size?: "default" | "compact";
  brand?: boolean;
  className?: string;
}) {
  const eyeShift = !awake
    ? "translate-x-px -translate-y-px"
    : gaze === "down"
      ? "translate-x-px translate-y-1"
      : gaze === "left"
        ? "-translate-x-1 -translate-y-px"
        : gaze === "right"
          ? "translate-x-1 -translate-y-px"
          : "translate-x-px -translate-y-1";

  return (
    <span
      aria-hidden="true"
      data-awake={awake}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center bg-mascot text-mascot-foreground animate-[ai-mascot-blob_9s_ease-in-out_infinite] transition-transform duration-[440ms] ease-[cubic-bezier(.22,1.5,.5,1)]",
        brand
          ? "h-[22px] w-[22px] shadow-none"
          : size === "compact"
            ? "h-7 w-7 shadow-none"
            : "h-10 w-10 -rotate-[7deg] shadow-sm data-[awake=true]:rotate-6 data-[awake=true]:scale-[1.05]",
        className,
      )}
    >
      <span className={cn("flex transition-transform duration-300", brand ? "gap-1" : size === "compact" ? "gap-[5px]" : cn("gap-2", eyeShift))}>
        <span className={cn("block animate-[ai-mascot-blink_6.5s_infinite] rounded-[5px] bg-current", brand ? "h-[5px] w-[2.5px]" : size === "compact" ? "h-[7px] w-[3px]" : "h-2.5 w-1")} />
        <span className={cn("block animate-[ai-mascot-blink_6.5s_infinite] rounded-[5px] bg-current", brand ? "h-[5px] w-[2.5px]" : size === "compact" ? "h-[7px] w-[3px]" : "h-2.5 w-1")} />
      </span>
    </span>
  );
}

export type AIProvider = {
  id: string;
  name: string;
  url: string;
  promptParam?: string;
  brandColor: string;
};

export const defaultAIProviders: readonly AIProvider[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", promptParam: "q", brandColor: "var(--foreground)" },
  { id: "claude", name: "Claude", url: "https://claude.ai/new", promptParam: "q", brandColor: "var(--chart-1)" },
  { id: "grok", name: "Grok", url: "https://grok.com/", promptParam: "q", brandColor: "var(--foreground)" },
  { id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai/search", promptParam: "q", brandColor: "var(--chart-2)" },
];

export function getProviderUrl(provider: AIProvider, prompt: string) {
  const url = new URL(provider.url);
  if (url.protocol !== "https:") throw new Error("AI provider URLs must use HTTPS.");
  if (provider.promptParam) url.searchParams.set(provider.promptParam, prompt);
  return url.toString();
}

export type AskAIProps = {
  prompt: string;
  title?: string;
  description?: string;
  label?: string;
  tooltip?: string;
  blobOnly?: boolean;
  mascot?: ReactNode;
  providers?: readonly AIProvider[];
  size?: "default" | "compact";
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
};

export function AskAI({
  prompt,
  title = "Ask an AI about me",
  description = "A fresh perspective, from your favorite assistant.",
  label = "Ask an AI",
  tooltip,
  blobOnly = false,
  mascot,
  providers = defaultAIProviders,
  size = "default",
  side = "top",
  align = "start",
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  style,
}: AskAIProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpen = open ?? internalOpen;

  useEffect(() => () => resetTimeout.current ? clearTimeout(resetTimeout.current) : undefined, []);

  const changeOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (next) setTooltipOpen(false);
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    if (resetTimeout.current) clearTimeout(resetTimeout.current);
    resetTimeout.current = setTimeout(() => setCopied(false), 2500);
  };

  const tooltipText = tooltip ?? (blobOnly ? label : undefined);
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        className={cn(blobOnly ? "size-12 rounded-full p-0" : "h-14 gap-4 rounded-full px-4", className)}
        style={style}
        aria-label={blobOnly ? tooltipText || label : undefined}
      >
        {!blobOnly && <span>{label}</span>}
        {mascot ?? <AIMascot awake={isOpen} gaze={side === "top" ? "up" : side === "bottom" ? "down" : side} size={size} />}
      </Button>
    </PopoverTrigger>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <Popover open={isOpen} onOpenChange={changeOpen}>
        {tooltipText ? (
          <Tooltip open={isOpen ? false : tooltipOpen} onOpenChange={(next) => setTooltipOpen(isOpen ? false : next)}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent>{tooltipText}</TooltipContent>
          </Tooltip>
        ) : trigger}
        <PopoverContent side={side} align={align} sideOffset={16} className="w-80 max-w-[calc(100vw-24px)] rounded-3xl bg-popover/90 p-4 backdrop-blur-xl">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-4 flex gap-1.5" aria-label="Choose your AI assistant">
            {providers.map((provider) => (
              <Button key={provider.id} asChild variant="secondary" className="h-16 min-w-0 flex-1 flex-col gap-1 px-1 text-[10px]">
                <a href={getProviderUrl(provider, prompt)} target="_blank" rel="noopener noreferrer" style={{ "--brand": provider.brandColor } as CSSProperties}>
                  <ArrowUpRight className="size-4 text-[var(--brand)]" />
                  <span className="truncate">{provider.name}</span>
                </a>
              </Button>
            ))}
          </div>
          <Button type="button" variant="ghost" className="mt-3 w-full gap-2 text-xs text-muted-foreground" onClick={() => void copyPrompt()}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy the prompt instead"}
          </Button>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}