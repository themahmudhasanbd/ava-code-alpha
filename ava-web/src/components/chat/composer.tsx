import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Cpu,
  Eraser,
  Gauge,
  FileText,
  FolderOpen,
  Loader2,
  Mic,
  MonitorSmartphone,
  Plug,
  Server,
  Plus,
  Settings2,
  ShieldCheck,
  SquarePen,
  TerminalSquare,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { REASONING_EFFORTS, SANDBOX_MODES } from "@/config/models";
import { cn } from "@/lib/utils";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";
import type { ChatStatus } from "@/state/use-chat";
import { AnimatePresence, motion } from "motion/react";
import { ServerMediaPicker, type ServerSelectedMedia } from "@/components/chat/server-media-picker";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  status: ChatStatus;
}

type Panel = "actions" | "model" | "sandbox" | null;

/* ---------- small reusable pieces ---------- */

function Pill({ icon: Icon, children, onClick, chevron }: { icon: LucideIcon; children: React.ReactNode; onClick: () => void; chevron?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 max-w-40 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-[13px] font-medium text-foreground transition hover:bg-accent"
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
      {chevron && <ChevronDown className="size-3 shrink-0 text-muted-foreground" />}
    </button>
  );
}

function OptionRow({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-accent",
        active && "bg-primary/10",
      )}
    >
      {Icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="size-4 text-primary" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {active && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

function Panel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="glass mx-auto max-h-[80vh] max-w-3xl overflow-y-auto rounded-t-3xl border-0 px-3 pb-6">
        <SheetHeader className="px-2">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- voice input (browser speech recognition) ---------- */

function useVoice(onText: (t: string) => void) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);
  const [supported, setSupported] = useState(false);
  // Always call the latest callback: results can arrive long after the
  // recognizer was created, so a stale closure would clobber text typed
  // while dictating.
  const cbRef = useRef(onText);
  cbRef.current = onText;
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      try {
        rec.current?.abort?.();
      } catch {
        /* already stopped */
      }
    };
  }, []);
  const toggle = () => {
    if (on) {
      try {
        rec.current?.stop();
      } catch {
        setOn(false);
      }
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.continuous = true;
    r.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      // In continuous mode e.results accumulates every utterance; only
      // take the results that arrived with this event.
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        if (res.isFinal) text += (text ? " " : "") + String(res[0].transcript);
      }
      if (text) cbRef.current(text);
    };
    r.onend = () => setOn(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (e: any) => {
      setOn(false);
      const kind = String(e?.error ?? "");
      if (kind === "aborted") return;
      setError(
        kind === "not-allowed" || kind === "service-not-allowed"
          ? "Microphone blocked — allow mic access in the browser to dictate."
          : "Dictation stopped unexpectedly. Try again.",
      );
      window.setTimeout(() => setError(null), 5000);
    };
    rec.current = r;
    try {
      r.start();
      setError(null);
      setOn(true);
    } catch {
      rec.current = null;
      setOn(false);
    }
  };
  return { on, supported, toggle, error };
}

/* ---------- attachments ---------- */

interface Attachment {
  id: string;
  name: string;
  remotePath: string;
  kind: "image" | "file";
  size?: number | undefined;
  previewUrl?: string | undefined;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve(s.includes(",") ? (s.split(",")[1] ?? "") : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/* ---------- composer ---------- */

export const Composer = forwardRef<HTMLTextAreaElement, Props>(({ value, onChange, onSubmit, onStop, onClear, status }, ref) => {
  const busy = status === "submitted" || status === "streaming";
  const navigate = useNavigate();
  const { modelId, setModelId, effort, setEffort, sandbox, setSandbox, setActiveSessionId, rpc } = useAva();
  const { data: models } = useModels();
  const [panel, setPanel] = useState<Panel>(null);
  const voice = useVoice((t) => onChange(value ? `${value} ${t}` : t));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [serverPickerOpen, setServerPickerOpen] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!rpc) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataBase64 = await fileToBase64(file);
        const safeName = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120) || "file";
        const remotePath = `/root/shared-media/${Date.now()}_${safeName}`;
        await rpc.call("fs/writeFile", { path: remotePath, dataBase64 });
        const isImage = file.type.startsWith("image/");
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            remotePath,
            kind: isImage ? "image" : "file",
            size: file.size,
            previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          },
        ]);
      }
    } catch (e) {
      console.warn("[composer] attachment upload failed:", e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const a = prev.find((x) => x.id === id);
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const addLocalFiles = (files: FileList | null) => {
    setAttachMenuOpen(false);
    void handleFiles(files);
  };

  const addServerFile = (media: ServerSelectedMedia) => {
    const isImage = media.kind === "image";
    setAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: media.name,
        remotePath: media.remotePath,
        kind: isImage ? "image" : "file",
      },
    ]);
  };

  const submitWithAttachments = (text: string) => {
    const trimmed = text.trim();
    let full = trimmed;
    if (attachments.length > 0) {
      const attText = attachments.map((a) => `[Attachment: ${a.name} (${a.remotePath})]`).join("\n");
      full = full ? `${full}\n\n${attText}` : attText;
    }
    if (!full) return;
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    onSubmit(full);
  };

  const model = models?.find((m) => m.id === modelId) ?? models?.find((m) => m.isDefault);
  const sandboxOpt = SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[2];
  const close = () => setPanel(null);
  const go = (to: "/files" | "/terminal" | "/mcp") => {
    close();
    navigate({ to });
  };

  return (
    <>
      <div className="relative">
        {/* Model & reasoning badge, floating on the card's top-right (as in the previous app) */}
        <button
          type="button"
          onClick={() => setPanel("model")}
          className="glass absolute -top-3 right-5 z-10 inline-flex h-6 max-w-[60%] items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <span className="truncate">{model?.name ?? "Model"} · {effort}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
        <PromptInput
          onSubmit={(m: PromptInputMessage) => {
            const text = m.text.trim();
            if (!text && attachments.length === 0) {
              if (busy) return onStop();
              return;
            }
            submitWithAttachments(m.text);
          }}
          className="glass rounded-[1.75rem] [&>[data-slot=input-group]]:rounded-[1.75rem] [&>[data-slot=input-group]]:border-0 [&>[data-slot=input-group]]:bg-transparent [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:ring-0 [&>[data-slot=input-group]]:focus-within:ring-0 [&>[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        >
          {(attachments.length > 0 || uploading) && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex max-w-44 items-center gap-1.5 rounded-xl bg-muted py-1 pl-1 pr-1.5 text-xs"
                >
                  {a.previewUrl ? (
                    <img src={a.previewUrl} alt={a.name} className="size-7 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <FileText className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate" title={a.name}>
                    {a.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => removeAttachment(a.id)}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {uploading && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Uploading…
                </span>
              )}
            </div>
          )}
          {voice.error && (
            <p role="status" className="px-4 pt-2 text-xs text-destructive">
              {voice.error}
            </p>
          )}
          <PromptInputTextarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Message AvA (e.g. check status, run tasks, edit code)…"
            className="min-h-16 px-4 pt-5 text-base leading-6 md:text-[15px]"
          />
          <PromptInputFooter className="gap-2 px-2.5 pb-2.5">
            <PromptInputTools className="min-w-0 gap-1.5 overflow-x-auto">
              <PromptInputButton
                aria-label="Add"
                onClick={() => setAttachMenuOpen((v) => !v)}
                className="size-8 shrink-0 rounded-full bg-muted"
              >
                <Plus />
              </PromptInputButton>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => void handleFiles(e.target.files)}
              />
              {attachMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close attach menu"
                    onClick={() => setAttachMenuOpen(false)}
                    className="fixed inset-0 z-[90] cursor-default"
                    tabIndex={-1}
                  />
                  <div className="fixed bottom-24 left-4 z-[95] w-72 rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
                    <OptionRow
                      icon={MonitorSmartphone}
                      title="Upload from your device"
                      subtitle="Upload images or documents to the server media library"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                    />
                    <OptionRow
                      icon={Server}
                      title="Select from server"
                      subtitle="Browse the server media library (/root/shared-media)"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setServerPickerOpen(true);
                      }}
                    />
                  </div>
                </>
              )}
              <Pill icon={Settings2} onClick={() => setPanel("actions")}>Tools</Pill>
              <Pill icon={ShieldCheck} onClick={() => setPanel("sandbox")} chevron>
                {sandboxOpt.label}
              </Pill>
            </PromptInputTools>
            <div className="flex shrink-0 items-center gap-1.5">
              {voice.supported && (
                <PromptInputButton
                  aria-label={voice.on ? "Stop dictation" : "Dictate"}
                  aria-pressed={voice.on}
                  tooltip={voice.on ? "Listening — tap to stop" : "Dictate with your voice"}
                  onClick={voice.toggle}
                  className={cn("size-8 rounded-full", voice.on && "bg-destructive/15 text-destructive")}
                >
                  <Mic className={cn(voice.on && "animate-pulse")} />
                </PromptInputButton>
              )}
              <PromptInputSubmit
                status={busy && !value.trim() ? status : "ready"}
                disabled={!busy && !value.trim() && attachments.length === 0}
                className={cn("size-9 rounded-full shadow-md", busy && !value.trim() && "bg-destructive text-destructive-foreground")}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>

      <Panel open={panel === "actions"} title="Prompt actions & tools" onClose={close}>
        <OptionRow icon={SquarePen} title="New session" subtitle="Start a fresh conversation" onClick={() => { setActiveSessionId(null); close(); }} />
        <OptionRow icon={FolderOpen} title="Workspace files" subtitle="Browse project files" onClick={() => go("/files")} />
        <OptionRow icon={TerminalSquare} title="Terminal" subtitle="Run shell commands" onClick={() => go("/terminal")} />
        <OptionRow icon={Plug} title="MCP tools" subtitle="Servers, tools and status" onClick={() => go("/mcp")} />
        <OptionRow icon={Eraser} title="Clear chat view" subtitle="Hide messages on this screen" onClick={() => { onClear(); close(); }} />
      </Panel>

      <Panel open={panel === "model"} title="Model & reasoning" onClose={close}>
        <ModelEffortTabs
          models={models ?? []}
          selectedModelId={model?.id}
          effort={effort}
          onSelectModel={(id) => { setModelId(id); close(); }}
          onSelectEffort={setEffort}
        />
      </Panel>

      <Panel open={panel === "sandbox"} title="Sandbox permission" onClose={close}>
        {SANDBOX_MODES.map((s) => (
          <OptionRow
            key={s.id}
            title={s.label}
            subtitle={s.description}
            active={sandbox === s.id}
            onClick={() => { setSandbox(s.id); close(); }}
          />
        ))}
        <p className="px-3 pt-2 text-xs text-muted-foreground">Applies to new sessions.</p>
      </Panel>

      <ServerMediaPicker open={serverPickerOpen && !!rpc} onClose={() => setServerPickerOpen(false)} onSelect={addServerFile} initialDirectory="/root/shared-media" />
    </>
  );
});
Composer.displayName = "Composer";

const EFFORT_HINTS: Record<string, string> = {
  low: "Fast replies, minimal thinking",
  medium: "Balanced speed and depth",
  max: "Deep multi-step reasoning",
  ultra: "Hardest problems, longest deliberation",
};

/** Tabbed model + effort selector with an animated segmented switcher. */
function ModelEffortTabs({
  models,
  selectedModelId,
  effort,
  onSelectModel,
  onSelectEffort,
}: {
  models: NonNullable<Awaited<ReturnType<typeof useModels>>["data"]> | undefined;
  selectedModelId?: string | undefined;
  effort: string;
  onSelectModel: (id: string) => void;
  onSelectEffort: (effort: string) => void;
}) {
  const [tab, setTab] = useState<"model" | "effort">("model");
  const tabs = [
    { id: "model" as const, label: "Model", icon: Cpu },
    { id: "effort" as const, label: "Effort", icon: Gauge },
  ];

  return (
    <div className="pb-2">
      <div className="relative mx-1 mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "relative z-10 flex h-9 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="model-effort-tab-pill"
                  className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "model" ? (
          <motion.div
            key="model"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-1"
          >
            {(models ?? []).map((m) => (
              <OptionRow
                key={m.id}
                title={m.name + (m.isDefault ? " (server default)" : "")}
                subtitle={m.description ?? m.id}
                active={selectedModelId === m.id}
                onClick={() => onSelectModel(m.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="effort"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-1.5 px-1"
          >
            {REASONING_EFFORTS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onSelectEffort(e)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  effort === e
                    ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                    : "border-border/60 hover:bg-accent",
                )}
              >
                <span>
                  <span className="block text-sm font-medium capitalize">{e}</span>
                  <span className="block text-xs text-muted-foreground">{EFFORT_HINTS[e] ?? ""}</span>
                </span>
                {effort === e && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
