import React, { useEffect, useMemo, useState } from "react";
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
  Globe,
  Info,
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
import { getToolIcon } from "./tool-icons";
import { Surface } from "@/components/kit";
import type { ChatMessage, MessagePart } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { formatDuration as fmtDuration, formatTokens as fmtTokens } from "@/lib/format";
import { font, FONTS, mono } from "@/theme/fonts";
import { useAva } from "@/state/ava-provider";
import { useUserProfile } from "@/state/queries";
import { answerQuestion } from "@/core/api/chat";

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

function AssistantTurn({
  message,
  live,
  sessionId,
  onOpenTimeline,
}: {
  message: ChatMessage;
  live: boolean;
  sessionId?: string;
  onOpenTimeline?: (messageId?: string) => void;
}) {
  const { rpc } = useAva();
  const elapsed = useElapsed(message.stats?.startedAt, live);
  const steps = message.parts.filter((p) => p.kind === "tool").length;
  const workflowParts = message.parts.filter((p) => p.kind !== "text");
  const hasWorkflowSteps = workflowParts.length > 0;

  // Find the final text response intended for the user
  const textParts = message.parts.filter((p) => p.kind === "text" && p.text && p.text.trim());
  const finalPart = textParts.length > 0 ? textParts[textParts.length - 1] : null;
  const finalText = finalPart?.text?.trim() ?? "";

  // Extract questions or errors
  const questionParts = message.parts.filter((p) => p.kind === "question" || p.meta?.questions);
  const errorNotices = message.parts.filter(
    (p) => p.kind === "notice" && (p.meta?.tone === "error" || p.status === "error")
  );

  const [copied, setCopied] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const duration = message.stats?.durationMs ?? (live ? elapsed : undefined);
  const hasError = message.parts.some(
    (part) => part.status === "error" || part.meta?.tone === "error"
  );
  const isInterrupted = message.parts.some(
    (p) =>
      p.kind === "notice" &&
      (p.text === "Stopped" ||
        p.text?.toLowerCase().includes("interrupted") ||
        p.text?.toLowerCase().includes("stopped by user") ||
        p.meta?.tone === "warning")
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
    if (!rpc || !sessionId || !questionId) return;
    setAnsweredQuestions((prev) => new Set(prev).add(questionId));
    try {
      await answerQuestion(rpc, sessionId, answer, requestId);
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
          onOpenTimeline={onOpenTimeline}
        />
      )}

      {/* Error Notices in Session Screen */}
      {errorNotices.map((p) => (
        <NoticeStep key={p.id} part={p} />
      ))}

      {/* Questions from Agent */}
      {questionParts.map((q) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={[styles.questionTitle, font("semibold", q.text)]}>{q.text}</Text>
          {q.meta?.questions?.map((question, qIdx) => (
            <View key={qIdx} style={{ gap: 6 }}>
              {qIdx > 0 && (
                <Text style={[styles.questionTitle, font("semibold", question.title)]}>
                  {question.title}
                </Text>
              )}
              {question.options?.map((opt, idx) => {
                const isAnswered = answeredQuestions.has(question.id ?? "");
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.questionOptionPill,
                      isAnswered && styles.questionOptionPillAnswered,
                    ]}
                    onPress={() => handleQuestionAnswer(question.id, opt, question.requestId)}
                    disabled={isAnswered}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.questionOptionText, font("medium", opt)]}>{opt}</Text>
                    {isAnswered && <Check size={13} color={COLORS.success} />}
                  </TouchableOpacity>
                );
              })}
              {!question.options?.length && !answeredQuestions.has(question.id ?? "") && (
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
          {live ? (
            <TypewriterText text={finalText} isStreaming={true} />
          ) : (
            <RichResponse text={finalText} />
          )}
        </View>
      ) : live && !hasWorkflowSteps ? (
        <View style={styles.finalOutputContainer}>
          <RuntimeDottedIndicator
            variant="block"
            size="sm"
            label="Agent thinking…"
            subLabel="Analyzing prompt and preparing response"
          />
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
            >
              {copied ? (
                <Check size={12} color={COLORS.success} />
              ) : (
                <Copy size={12} color={COLORS.mutedForeground} />
              )}
              <Text
                style={[
                  styles.copyOutputText,
                  font("medium"),
                  copied && styles.copyOutputTextSuccess,
                ]}
              >
                {copied ? "Copied output" : "Copy output"}
              </Text>
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
  const fullText = (partsText || (message as any).text || "").trim();

  const attachedFiles = message.parts?.flatMap((p) => p.meta?.files || []) || [];
  const attachedMedia = message.parts?.flatMap((p) => p.meta?.media || []) || [];

  const [expanded, setExpanded] = useState(false);

  // Breakpoint: > 240 chars or > 5 lines
  const lines = fullText.split("\n");
  const isLong = fullText.length > 240 || lines.length > 5;

  const displayText = useMemo(() => {
    if (!isLong || expanded) return fullText;
    if (lines.length > 5) {
      return lines.slice(0, 4).join("\n") + "…";
    }
    return fullText.slice(0, 220).trim() + "…";
  }, [fullText, isLong, expanded, lines]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.userContainer}>
      {/* User Header with Avatar & Name */}
      <View style={styles.userHeader}>
        <View style={styles.userHeaderInfo}>
          <Text style={[styles.userNameText, font("semibold")]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.userRoleTag, font("medium")]}>You</Text>
        </View>

        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.userAvatarImg} />
        ) : (
          <View style={styles.userAvatarBox}>
            <Text style={[styles.userAvatarInitials, font("bold")]}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Attachments if any */}
      {(attachedFiles.length > 0 || attachedMedia.length > 0) && (
        <View style={styles.userAttachmentsRow}>
          {attachedFiles.map((file, i) => (
            <View key={`file_${i}`} style={styles.userAttBadge}>
              <Text style={[styles.userAttText, font("medium")]} numberOfLines={1}>
                {file.path.split("/").pop() || file.path}
              </Text>
            </View>
          ))}
          {attachedMedia.map((media, i) => (
            <View key={`media_${i}`} style={styles.userAttBadge}>
              <Text style={[styles.userAttText, font("medium")]} numberOfLines={1}>
                {media.name || "Media"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* User Message Bubble */}
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
    </View>
  );
}

function ChatMessageViewBase({
  message,
  live = false,
  sessionId,
  onOpenTimeline,
}: {
  message: ChatMessage;
  live?: boolean;
  sessionId?: string;
  onOpenTimeline?: (messageId?: string) => void;
}) {
  if (message.role === "assistant") {
    return (
      <AssistantTurn
        message={message}
        live={live}
        sessionId={sessionId}
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
  (a, b) => a.message === b.message && a.live === b.live && a.sessionId === b.sessionId,
);

const styles = StyleSheet.create({
  assistantContainer: {
    marginVertical: 8,
    paddingLeft: 0,
    width: "100%",
  },
  turnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
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
    borderColor: "rgba(106, 101, 255, 0.4)",
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
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  turnSubText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  finalOutputContainer: {
    marginTop: 4,
    width: "100%",
  },
  questionCard: {
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.secondary,
  },
  noticeBoxError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  copyOutputText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  copyOutputTextSuccess: {
    color: COLORS.success,
  },
  footerStatsText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  userContainer: {
    alignSelf: "flex-end",
    maxWidth: "92%",
    marginVertical: 6,
    gap: 4,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 7,
    marginBottom: 2,
  },
  userHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  userNameText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  userRoleTag: {
    fontSize: 9.5,
    color: COLORS.mutedForeground,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
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
    color: "#FFFFFF",
  },
  userAttachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  userAttBadge: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  userAttText: {
    fontSize: 11,
    color: COLORS.foreground,
  },
  userBubble: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seeMoreText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
});
