import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileArchive,
  FileCode,
  FileText,
  FileVideo,
  Globe,
  Info,
  Mic,
  Music,
  Paperclip,
  Plug,
  Terminal as TerminalSquare,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { AvaMascot } from "@/components/ui/ava-mascot";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { RuntimeDottedIndicator } from "@/components/ai-elements/dotted-indicator";
import { TypewriterText } from "@/components/ai-elements/typewriter-text";
import { InlineText, RichResponse } from "./rich-response";
import { LiveStepOverviewCard } from "./live-step-card";
import { resolveIntent } from "./intent";
import { MediaPreviewGallery } from "./media-preview-gallery";
import { getToolIcon } from "./tool-icons";
import { Surface } from "@/components/kit";
import type { ChatMessage, MediaItem, MessagePart } from "@/core/types";
import { COLORS, useTheme } from "@/theme/colors";
import { formatDuration as fmtDuration, formatTokens as fmtTokens } from "@/lib/format";
import { font, FONTS, mono } from "@/theme/fonts";
import { useAva } from "@/state/ava-provider";
import { useUserProfile } from "@/state/queries";
import { answerQuestion } from "@/core/api/chat";
import { chatStore } from "@/state/chat-store";

export const formatDuration = fmtDuration;
const formatTokens = fmtTokens;

function useElapsed(startedAt?: number, running?: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return startedAt ? now - startedAt : undefined;
}

function NoticeStep({ part }: { part: MessagePart }) {
  const tone = part.meta?.tone ?? "info";
  const isErr = tone === "error";
  const Icon = isErr ? AlertTriangle : Info;

  return (
    <View
      style={[
        styles.noticeBox,
        isErr ? styles.noticeBoxError : styles.noticeBoxInfo,
      ]}
    >
      <Icon
        size={14}
        color={isErr ? COLORS.destructive : COLORS.mutedForeground}
      />
      <View style={{ flex: 1 }}>
        <InlineText
          text={part.text}
          style={[
            styles.noticeText,
            isErr ? styles.noticeTextError : styles.noticeTextInfo,
          ]}
        />
      </View>
    </View>
  );
}

// ---------- assistant turn ------------------------------------------------

// --- Media attachment helpers ---
// Normalizes a media URL/path for comparison:
// trim -> lowercase -> strip ?query and #fragment.
export function normalizeMediaUrl(url: string): string {
  return (url || "")
    .trim()
    .toLowerCase()
    .split("?")[0]
    .split("#")[0];
}

// Extracts server paths from user prompt attachment markers:
//   [Attachment: <name> (<path>)]
// Returns the set of normalized paths. Only full-path matches count,
// so an agent attaching a different file with the same name is unaffected.
export function extractAttachmentPaths(text: string | undefined): Set<string> {
  const paths = new Set<string>();
  if (!text) return paths;
  // Greedy .* so the LAST parenthesized group (the path) is captured,
  // even if the display name itself contains parentheses.
  const re = /\[Attachment:.*\(([^()]*)\)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const normalized = normalizeMediaUrl(match[1]);
    if (normalized) paths.add(normalized);
  }
  return paths;
}

function AssistantTurn({
  message,
  live,
  sessionId,
  userPrompt,
  onOpenTimeline,
}: {
  message: ChatMessage;
  live: boolean;
  sessionId?: string;
  userPrompt?: string;
  onOpenTimeline?: (messageId?: string) => void;
}) {
  const { rpc } = useAva();
  const { colors } = useTheme();
  const elapsed = useElapsed(message.stats?.startedAt, live);
  const steps = message.parts.filter((p) => p.kind === "tool").length;
  const workflowParts = message.parts.filter(
    (p) =>
      p.kind === "tool" ||
      p.kind === "reasoning" ||
      p.kind === "plan" ||
      (p.kind === "notice" && (p.meta?.tone === "error" || p.meta?.tone === "warning" || p.status === "error"))
  );
  const hasWorkflowSteps = workflowParts.length > 0;

  // Turn intent: core-provided meta.intent wins, else derive from user prompt.
  // Used for the pre-state card, overview card title, and completion text.
  const coreIntent = message.parts.find((p) => p.meta?.intent)?.meta?.intent;
  const intent = resolveIntent(coreIntent, userPrompt);
  const coreSummary = message.parts.find((p) => p.meta?.summary)?.meta?.summary;

  // First reasoning / premature text: shown in chat, rest lives in Timeline.
  const firstReasoning = message.parts.find(
    (p) => p.kind === "reasoning" && p.text && p.text.trim().length > 0,
  );

  // Find the last tool index in the turn
  let lastToolIdx = -1;
  for (let i = message.parts.length - 1; i >= 0; i--) {
    if (message.parts[i]!.kind === "tool") {
      lastToolIdx = i;
      break;
    }
  }

  // Find the final text response intended for the user.
  // When a turn executes tool actions, any text generated BEFORE or DURING tool execution
  // is premature/interim commentary and must NOT be shown as the final response.
  // Only text produced AFTER all tools have finished counts as the final answer.
  // Fallback: if no post-tool text exists, use the last non-empty text part
  // regardless of position (final text may reuse the streaming item id/position).
  const finalPart = useMemo(() => {
    let fallback: (typeof message.parts)[number] | null = null;
    for (let i = message.parts.length - 1; i >= 0; i--) {
      const p = message.parts[i]!;
      if (p.kind === "text" && p.text && p.text.trim()) {
        if (!fallback) fallback = p;
        if (lastToolIdx === -1 || i > lastToolIdx) {
          return p;
        }
      }
    }
    return fallback;
  }, [message.parts, lastToolIdx]);

  const finalText = finalPart?.text?.trim() ?? "";

  // Paths the user already attached in their prompt (from [Attachment: name (path)] markers)
  const userAttachedPaths = useMemo(
    () => extractAttachmentPaths(userPrompt),
    [userPrompt],
  );

  // Collect and deduplicate all media items from the message parts.
  // Media whose path the user already attached is filtered out so the agent's
  // re-attachment of the same file is not shown twice.
  const allTurnMedia = useMemo(() => {
    const mediaList: MediaItem[] = [];
    const seen = new Set<string>();
    for (const p of message.parts) {
      if (p.meta?.media && Array.isArray(p.meta.media)) {
        for (const m of p.meta.media) {
          if (m && m.url) {
            const normalized = normalizeMediaUrl(m.url);
            if (
              !normalized ||
              seen.has(normalized) ||
              userAttachedPaths.has(normalized)
            ) {
              continue;
            }
            seen.add(normalized);
            mediaList.push({ ...m, url: m.url.trim() });
          }
        }
      }
    }
    return mediaList;
  }, [message.parts, userAttachedPaths]);

  // Extract questions or errors
  const questionParts = message.parts.filter((p) => p.kind === "question" || p.meta?.questions);
  const errorNotices = message.parts.filter(
    (p) => p.kind === "notice" && (p.meta?.tone === "error" || p.status === "error")
  );

  const [copied, setCopied] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  // Optimistic answer marks are only valid while this turn is live. When the
  // turn ends (interrupt, completion, error), drop them so a half-answered
  // question on a dead turn cannot linger as a stale check mark. The
  // store-level `question.answered` (set on genuine success below) survives.
  const wasLiveRef = useRef(live);
  useEffect(() => {
    if (wasLiveRef.current && !live) setAnsweredQuestions(new Set());
    wasLiveRef.current = live;
  }, [live]);
  const duration = message.stats?.durationMs ?? (live ? elapsed : undefined);
  const hasError = message.parts.some(
    (part) => part.status === "error" || part.meta?.tone === "error"
  );
  const isInterrupted = message.parts.some(
    (p) =>
      p.kind === "notice" &&
      (p.text === "Stopped" ||
        p.text?.toLowerCase() === "interrupted" ||
        p.text?.toLowerCase() === "stopped by user" ||
        p.text?.toLowerCase() === "interrupted by user")
  );

  const activityLabel = hasError
    ? "Needs attention"
    : isInterrupted
    ? "Interrupted"
    : live
    ? steps > 0
      ? `Working${elapsed ? ` · ${formatDuration(elapsed)}` : ""}`
      : `Thinking${elapsed ? ` · ${formatDuration(elapsed)}` : ""}`
    : "AvA";

  const handleCopy = async () => {
    if (finalText) {
      await Clipboard.setStringAsync(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQuestionAnswer = async (questionId: string | undefined, answer: string, requestId?: number | string) => {
    // Questions belong to the live turn only. Answering a dead or historical
    // turn's question would hit a stale requestId / steer into the void, and
    // the protocol fallback would start a stray new turn with the bare option
    // text as its prompt.
    if (!live || !rpc || !sessionId || !questionId) return;
    setAnsweredQuestions((prev) => new Set(prev).add(questionId));
    try {
      await answerQuestion(rpc, sessionId, answer, requestId);
      // Persist the answered mark at the store level (mirrors
      // answerPendingApproval) so it survives the optimistic reset above
      // and history re-syncs.
      chatStore.patchAssistant(sessionId, message.id, (parts) =>
        parts.map((p) =>
          p.kind === "question" && p.meta?.questions?.some((q) => q.id === questionId)
            ? {
                ...p,
                meta: {
                  ...p.meta,
                  questions: (p.meta.questions ?? []).map((q) =>
                    q.id === questionId ? { ...q, answered: true } : q
                  ),
                },
              }
            : p
        )
      );
    } catch (e) {
      console.warn("[Question] Failed to send answer:", e);
      setAnsweredQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  return (
    <View style={styles.assistantContainer}>
      {/* Turn Header */}
      <View style={styles.turnHeader}>
        <View style={styles.mascotWrapper}>
          <AvaMascot
            size="sm"
            state={live ? "working" : hasError ? "error" : "idle"}
            gaze={hasError ? "down" : live && steps > 0 ? "right" : "up"}
          />
          {live && <View style={styles.streamPulseRing} />}
        </View>

        <View style={styles.turnHeaderTextGroup}>
          <View style={styles.turnLabelRow}>
            {live ? (
              <Shimmer style={[styles.turnLabelText, font("semibold", activityLabel)]}>
                {activityLabel}
              </Shimmer>
            ) : (
              <Text style={[styles.turnLabelText, font("semibold", activityLabel)]}>
                {activityLabel}
              </Text>
            )}
            {live && <View style={styles.pulseDot} />}
          </View>
          <Text style={[styles.turnSubText, font("regular")]}>
            {hasError
              ? "Core reported an issue"
              : isInterrupted
              ? duration
                ? `Interrupted after ${formatDuration(duration)}`
                : "Interrupted by user"
              : live
              ? hasWorkflowSteps
                ? `${steps ? `${steps} tool step${steps === 1 ? "" : "s"}` : "Executing steps"} · live`
                : "Processing prompt · live"
              : duration
              ? `Completed in ${formatDuration(duration)}`
              : "Response complete"}
          </Text>
        </View>
      </View>

      {/* Live Agent Step Overview Card (Only shown once at least one workflow step has started) */}
      {hasWorkflowSteps && (
        <LiveStepOverviewCard
          message={message}
          live={live}
          sessionId={sessionId}
          intent={intent}
          summary={coreSummary}
          onOpenTimeline={onOpenTimeline}
        />
      )}

      {/* Error Notices in Session Screen */}
      {errorNotices.map((p, idx) => (
        <NoticeStep key={p.id ? `notice_${p.id}_${idx}` : `notice_${idx}`} part={p} />
      ))}

      {/* Questions from Agent */}
      {questionParts.map((q, qIdx) => (
        <View key={q.id ? `question_${q.id}_${qIdx}` : `question_${qIdx}`} style={styles.questionCard}>
          <Text style={[styles.questionTitle, font("semibold", q.text)]}>{q.text}</Text>
          {q.meta?.questions?.map((question, qIdx) => (
            <View key={qIdx} style={{ gap: 6 }}>
              {qIdx > 0 && (
                <Text style={[styles.questionTitle, font("semibold", question.title)]}>
                  {question.title}
                </Text>
              )}
              {question.options?.map((opt, idx) => {
                const isAnswered = answeredQuestions.has(question.id ?? "") || !!question.answered;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.questionOptionPill,
                      isAnswered && styles.questionOptionPillAnswered,
                      !live && !isAnswered && styles.questionOptionPillExpired,
                    ]}
                    onPress={() => handleQuestionAnswer(question.id, opt, question.requestId)}
                    disabled={isAnswered || !live}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.questionOptionText, font("medium", opt)]}>{opt}</Text>
                    {isAnswered && <Check size={13} color={COLORS.success} />}
                  </TouchableOpacity>
                );
              })}
              {live && !question.options?.length && !answeredQuestions.has(question.id ?? "") && !question.answered && (
                <Text style={[styles.questionHint, font("regular")]}>
                  Type your answer in the composer below
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* Response text: live typewriter animation during streaming, rich response when complete */}
      {finalText ? (
        <View style={styles.finalOutputContainer}>
          {live && message.parts.some((p) => p.status === "running") ? (
            <TypewriterText text={finalText} isStreaming={true} />
          ) : (
            <RichResponse text={finalText} />
          )}
        </View>
      ) : live && !hasWorkflowSteps ? (
        <View style={styles.intentCard}>
          <View style={[styles.intentPulse, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Shimmer style={[styles.intentTitle, font("medium"), { color: colors.primary }]}>
              {`${intent}…`}
            </Shimmer>
            <Text style={[styles.intentSubtitle, font("regular"), { color: colors.mutedForeground }]}>
              Analyzing prompt and preparing response
            </Text>
          </View>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}

      {/* First reasoning / premature text stays in chat; rest in Timeline */}
      {firstReasoning && !finalText ? (
        <View style={styles.reasoningCard}>
          <Brain size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.reasoningText, font("regular"), { color: colors.mutedForeground }]}
            numberOfLines={live ? 3 : 2}
          >
            {firstReasoning.text.trim()}
          </Text>
        </View>
      ) : null}

      {/* Attached Media & Screenshots Gallery */}
      {allTurnMedia.length > 0 ? (
        <View style={{ marginTop: 6 }}>
          <MediaPreviewGallery media={allTurnMedia} />
        </View>
      ) : null}

      {/* Turn Action Footer */}
      {!live && (finalText || duration) ? (
        <View style={styles.turnFooter}>
          {finalText ? (
            <TouchableOpacity
              style={styles.copyOutputBtn}
              onPress={handleCopy}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={copied ? "Copied" : "Copy output"}
            >
              {copied ? (
                <Check size={12} color={COLORS.success} />
              ) : (
                <Copy size={12} color={COLORS.mutedForeground} />
              )}
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.footerStatsText, mono("regular")]}>
            {[
              duration ? `Worked for ${formatDuration(duration)}` : "",
              steps ? `${steps} step${steps > 1 ? "s" : ""}` : "",
              formatTokens(message.stats?.totalTokens),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------- user turn -----------------------------------------------------

interface ParsedUserAttachment {
  name: string;
  path: string;
  kind: "image" | "code" | "text" | "audio" | "video" | "archive" | "file";
  ext: string;
}

function detectFileKind(path: string, name: string): { kind: ParsedUserAttachment["kind"]; ext: string } {
  const filename = name || path.split("/").pop() || "";
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (
    path.startsWith("data:image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)
  ) {
    return { kind: "image", ext: ext.toUpperCase() || "IMG" };
  }
  if (
    [
      "ts", "tsx", "js", "jsx", "py", "rs", "json", "html", "css", "scss",
      "sh", "bash", "yml", "yaml", "toml", "sql", "c", "cpp", "go", "php",
      "vue", "svelte",
    ].includes(ext)
  ) {
    return { kind: "code", ext: ext.toUpperCase() };
  }
  if (["txt", "md", "markdown", "pdf", "doc", "docx", "rtf", "log"].includes(ext)) {
    return { kind: "text", ext: ext.toUpperCase() };
  }
  if (["m4a", "mp3", "wav", "ogg", "flac", "aac", "opus"].includes(ext)) {
    return { kind: "audio", ext: ext.toUpperCase() };
  }
  if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) {
    return { kind: "video", ext: ext.toUpperCase() };
  }
  if (["zip", "tar", "gz", "tgz", "7z", "rar"].includes(ext)) {
    return { kind: "archive", ext: ext.toUpperCase() };
  }
  return { kind: "file", ext: ext ? ext.toUpperCase() : "FILE" };
}

function AttachmentChip({ item }: { item: ParsedUserAttachment }) {
  const { colors } = useTheme();

  const getIconAndColor = () => {
    switch (item.kind) {
      case "code":
        return { Icon: FileCode, color: colors.primary, bg: colors.primary + "24" };
      case "audio":
        return { Icon: Mic, color: colors.success, bg: colors.success + "24" };
      case "video":
        return { Icon: FileVideo, color: colors.warning, bg: colors.warning + "24" };
      case "archive":
        return { Icon: FileArchive, color: colors.primary, bg: colors.primary + "24" };
      case "text":
        return { Icon: FileText, color: colors.foreground, bg: colors.border };
      default:
        return { Icon: FileText, color: colors.mutedForeground, bg: colors.border };
    }
  };

  const { Icon, color, bg } = getIconAndColor();

  return (
    <View
      style={[
        styles.userAttCard,
        { backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
    >
      <View style={[styles.userAttIconBox, { backgroundColor: bg }]}>
        <Icon size={13} color={color} />
      </View>
      <View style={styles.userAttContent}>
        <Text
          style={[styles.userAttName, font("medium"), { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.ext ? (
          <View style={[styles.userAttExtBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.userAttExtText, mono("regular"), { color: colors.mutedForeground }]}>
              {item.ext}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function UserTurnView({ message }: { message: ChatMessage }) {
  const { auth } = useAva();
  const { data: userProfileData } = useUserProfile();
  const profile = userProfileData?.profile;

  const displayName = profile?.name?.trim() || profile?.username?.trim() || auth?.username || "You";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatar = profile?.avatar;

  const partsText = message.parts
    ? message.parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join("\n")
        .trim()
    : "";
  const rawText = (partsText || (message as any).text || "").trim();

  const attachedFiles = message.parts?.flatMap((p) => p.meta?.files || []) || [];
  const attachedMedia = message.parts?.flatMap((p) => p.meta?.media || []) || [];

  const [expanded, setExpanded] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Parse out [Attachment: ...] lines and categorize files vs images
  const { cleanedText, nonImageAttachments, imageAttachments } = useMemo(() => {
    const fileList: ParsedUserAttachment[] = [];
    const mediaList: MediaItem[] = [];
    const seen = new Set<string>();

    const attRegex = /\[Attachment:\s*([^\n()]+?)\s*\(([^)]+)\)\]/g;
    let cleaned = rawText
      .replace(attRegex, (_match: string, attName: string, attPath: string) => {
        const name = (attName || "").trim();
        const path = (attPath || "").trim();
        const key = path.toLowerCase();
        if (path && !seen.has(key)) {
          seen.add(key);
          const { kind, ext } = detectFileKind(path, name);
          if (kind === "image") {
            mediaList.push({ type: "image", url: path, name: name || "Image" });
          } else {
            fileList.push({ name: name || path.split("/").pop() || "File", path, kind, ext });
          }
        }
        return "";
      })
      .trim();

    // Merge explicit files from parts
    for (const f of attachedFiles) {
      if (f?.path) {
        const key = f.path.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const name = f.path.split("/").pop() || f.path;
          const { kind, ext } = detectFileKind(f.path, name);
          if (kind === "image") {
            mediaList.push({ type: "image", url: f.path, name });
          } else {
            fileList.push({ name, path: f.path, kind, ext });
          }
        }
      }
    }

    // Merge explicit media from parts
    for (const m of attachedMedia) {
      if (m?.url) {
        const key = m.url.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const name = m.name || m.url.split("/").pop() || "Media";
          const { kind, ext } = detectFileKind(m.url, name);
          if (kind === "image") {
            mediaList.push({ type: "image", url: m.url, name });
          } else {
            fileList.push({ name, path: m.url, kind, ext });
          }
        }
      }
    }

    return {
      cleanedText: cleaned || rawText,
      nonImageAttachments: fileList,
      imageAttachments: mediaList,
    };
  }, [rawText, attachedFiles, attachedMedia]);

  const handleCopyPrompt = async () => {
    if (rawText) {
      await Clipboard.setStringAsync(rawText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  // Breakpoint: > 240 chars or > 5 lines
  const lines = cleanedText.split("\n");
  const isLong = cleanedText.length > 240 || lines.length > 5;

  const displayText = useMemo(() => {
    if (!isLong || expanded) return cleanedText;
    if (lines.length > 5) {
      return lines.slice(0, 4).join("\n") + "…";
    }
    return cleanedText.slice(0, 220).trim() + "…";
  }, [cleanedText, isLong, expanded, lines]);

  const toggleExpand = () => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.userContainer}>
      {/* Modern Attachment Cards & Image Previews */}
      {(nonImageAttachments.length > 0 || imageAttachments.length > 0) && (
        <View style={styles.userAttachmentsRow}>
          {nonImageAttachments.map((att, i) => (
            <AttachmentChip key={`att_${i}_${att.path}`} item={att} />
          ))}
          {imageAttachments.length > 0 && (
            <View style={{ width: "100%", alignSelf: "flex-end" }}>
              <MediaPreviewGallery media={imageAttachments} compact />
            </View>
          )}
        </View>
      )}

      {/* User Message Bubble */}
      {displayText ? (
        <View style={styles.userBubble}>
          <RichResponse text={displayText} isUser />
          {isLong && (
            <TouchableOpacity
              style={styles.seeMoreBtn}
              onPress={toggleExpand}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeMoreText, font("medium")]}>
                {expanded ? "Show less" : "Show more"}
              </Text>
              {expanded ? (
                <ChevronUp size={12} color={COLORS.mutedForeground} />
              ) : (
                <ChevronDown size={12} color={COLORS.mutedForeground} />
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* User Meta Footer at the bottom of sent prompt with Avatar + Copy Button */}
      <View style={styles.userFooter}>
        <TouchableOpacity
          style={styles.copyUserPromptBtn}
          onPress={handleCopyPrompt}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {copiedPrompt ? (
            <Check size={11} color={COLORS.success} />
          ) : (
            <Copy size={11} color={COLORS.mutedForeground} />
          )}
          <Text
            style={[
              styles.copyUserPromptText,
              font("medium"),
              copiedPrompt && styles.copyUserPromptTextSuccess,
            ]}
          >
            {copiedPrompt ? "Copied" : "Copy"}
          </Text>
        </TouchableOpacity>

        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.userAvatarImg} />
        ) : (
          <View style={styles.userAvatarBox}>
            <Text style={[styles.userAvatarInitials, font("bold")]}>{initials}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ChatMessageViewBase({
  message,
  live = false,
  sessionId,
  userPrompt,
  onOpenTimeline,
}: {
  message: ChatMessage;
  live?: boolean;
  sessionId?: string;
  userPrompt?: string;
  onOpenTimeline?: (messageId?: string) => void;
}) {
  if (message.role === "assistant") {
    return (
      <AssistantTurn
        message={message}
        live={live}
        sessionId={sessionId}
        userPrompt={userPrompt}
        onOpenTimeline={onOpenTimeline}
      />
    );
  }

  return <UserTurnView message={message} />;
}

// Memoized: only re-render when this message object, its live flag or session changes.
// Streaming deltas replace only the last message, so older turns stay untouched.
export const ChatMessageView = React.memo(
  ChatMessageViewBase,
  (a, b) => a.message === b.message && a.live === b.live && a.sessionId === b.sessionId && a.userPrompt === b.userPrompt,
);

const styles = StyleSheet.create({
  assistantContainer: {
    marginVertical: 10,
    paddingLeft: 0,
    width: "100%",
  },
  turnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingLeft: 0,
  },
  mascotWrapper: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  streamPulseRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "66",
  },
  turnHeaderTextGroup: {
    justifyContent: "center",
    flex: 1,
  },
  turnLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  turnLabelText: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.15,
    color: COLORS.foreground,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  turnSubText: {
    fontSize: 10.5,
    letterSpacing: 0.25,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  intentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
  },
  intentPulse: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  intentTitle: {
    fontSize: 14,
  },
  intentSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  reasoningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    opacity: 0.85,
  },
  reasoningText: {
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
  },
  finalOutputContainer: {
    marginTop: 6,
    width: "100%",
  },
  questionCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginVertical: 6,
    gap: 8,
  },
  questionTitle: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  questionOptionPill: {
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questionOptionPillAnswered: {
    opacity: 0.5,
    borderColor: COLORS.success,
  },
  questionOptionPillExpired: {
    opacity: 0.55,
  },
  questionOptionText: {
    fontSize: 12.5,
    color: COLORS.foreground,
    flex: 1,
  },
  questionHint: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    fontStyle: "italic",
    paddingVertical: 2,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 3,
  },
  noticeBoxInfo: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noticeBoxError: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.destructive + "40",
  },
  noticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  noticeTextInfo: {
    color: COLORS.mutedForeground,
  },
  noticeTextError: {
    color: COLORS.destructive,
  },
  turnFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 0,
    marginTop: 8,
  },
  copyOutputBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  footerStatsText: {
    fontSize: 10.5,
    letterSpacing: 0.2,
    color: COLORS.mutedForeground,
  },
  userContainer: {
    alignSelf: "flex-end",
    maxWidth: "92%",
    marginVertical: 8,
    gap: 6,
  },
  userAttachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  userAttCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 220,
  },
  userAttIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  userAttContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  userAttName: {
    fontSize: 12,
    maxWidth: 130,
  },
  userAttExtBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  userAttExtText: {
    fontSize: 9.5,
  },
  userBubble: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "column",
    alignSelf: "flex-end",
  },
  seeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seeMoreText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  userFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  copyUserPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  copyUserPromptText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  copyUserPromptTextSuccess: {
    color: COLORS.success,
  },
  userAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  userAvatarBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarInitials: {
    fontSize: 10,
    color: COLORS.primaryForeground,
  },
});
