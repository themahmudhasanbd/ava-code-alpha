import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  FileCode,
  Globe,
  Info,
  ListChecks,
  Plug,
  Terminal as TerminalSquare,
  Wrench,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AvaMascot } from "@/components/ui/ava-mascot";
import { Tool } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { RichResponse } from "./rich-response";
import { Surface } from "@/components/kit";
import type { ChatMessage, MessagePart } from "@/core/types";
import { COLORS } from "@/theme/colors";

export function formatDuration(ms?: number) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} sec`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

function ReasoningStep({ part }: { part: MessagePart }) {
  const [open, setOpen] = useState(false);
  return (
    <Surface style={styles.reasoningBox}>
      <TouchableOpacity
        style={styles.reasoningHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setOpen(!open);
        }}
        activeOpacity={0.7}
      >
        <Brain size={14} color={COLORS.primary} />
        <Text style={styles.reasoningTitle}>Thinking process</Text>
        {open ? (
          <ChevronDown size={14} color={COLORS.mutedForeground} />
        ) : (
          <ChevronRight size={14} color={COLORS.mutedForeground} />
        )}
      </TouchableOpacity>
      {open && <Text style={styles.reasoningContent}>{part.text}</Text>}
    </Surface>
  );
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
      <Icon size={14} color={isErr ? COLORS.destructive : COLORS.mutedForeground} />
      <Text
        style={[
          styles.noticeText,
          isErr ? styles.noticeTextError : styles.noticeTextInfo,
        ]}
      >
        {part.text}
      </Text>
    </View>
  );
}

function AssistantTurn({
  message,
  live,
}: {
  message: ChatMessage;
  live: boolean;
}) {
  const steps = message.parts.filter((p) => p.kind === "tool").length;
  const hasError = message.parts.some(
    (p) => p.status === "error" || p.meta?.tone === "error"
  );
  const duration = message.stats?.durationMs;

  const activityLabel = hasError
    ? "Needs attention"
    : live
    ? steps > 0
      ? "Working"
      : "Thinking"
    : "AvA";

  return (
    <View style={styles.assistantTurnContainer}>
      {/* Turn Header */}
      <View style={styles.turnHeader}>
        <AvaMascot size="sm" state={live ? "working" : hasError ? "error" : "idle"} />
        <View style={styles.turnHeaderTextGroup}>
          <View style={styles.turnLabelRow}>
            {live ? (
              <Shimmer style={styles.turnLabelText}>{activityLabel}</Shimmer>
            ) : (
              <Text style={styles.turnLabelText}>{activityLabel}</Text>
            )}
            {live && <View style={styles.pulseDot} />}
          </View>
          <Text style={styles.turnSubText}>
            {hasError
              ? "Core reported an error"
              : live
              ? `${steps ? `${steps} live step${steps === 1 ? "" : "s"}` : "Preparing steps"} · streaming now`
              : duration
              ? `Completed in ${formatDuration(duration)}`
              : "Response complete"}
          </Text>
        </View>
      </View>

      {/* Parts List */}
      <View style={styles.partsContainer}>
        {message.parts.map((p) => {
          if (p.kind === "tool") {
            return (
              <Tool
                key={p.id}
                toolName={p.toolName || "Tool"}
                state={
                  p.status === "running"
                    ? "running"
                    : p.status === "error"
                    ? "error"
                    : "completed"
                }
                input={p.input}
                output={p.output}
                errorText={p.status === "error" ? p.output : undefined}
              />
            );
          }
          if (p.kind === "reasoning") {
            return <ReasoningStep key={p.id} part={p} />;
          }
          if (p.kind === "notice") {
            return <NoticeStep key={p.id} part={p} />;
          }
          if (p.text) {
            return <RichResponse key={p.id} text={p.text} />;
          }
          return null;
        })}
      </View>

      {/* Footer Stats */}
      {!live && duration ? (
        <View style={styles.turnFooter}>
          <Text style={styles.footerStatsText}>
            {[
              `Worked for ${formatDuration(duration)}`,
              steps ? `${steps} step${steps > 1 ? "s" : ""}` : "",
              message.stats?.totalTokens
                ? `${message.stats.totalTokens} tokens`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ChatMessageView({
  message,
  live = false,
}: {
  message: ChatMessage;
  live?: boolean;
}) {
  if (message.role === "assistant") {
    return <AssistantTurn message={message} live={live} />;
  }

  return (
    <View style={styles.userBubbleContainer}>
      <View style={styles.userBubble}>
        {message.parts.map((p) => (
          <Text key={p.id} style={styles.userText}>
            {p.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  assistantTurnContainer: {
    marginVertical: 6,
    gap: 8,
  },
  turnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  turnHeaderTextGroup: {
    justifyContent: "center",
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
  partsContainer: {
    paddingLeft: 42,
    gap: 8,
  },
  reasoningBox: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.secondary,
    marginVertical: 3,
  },
  reasoningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },
  reasoningContent: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 6,
    lineHeight: 18,
    fontStyle: "italic",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
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
    lineHeight: 16,
  },
  noticeTextInfo: {
    color: COLORS.mutedForeground,
  },
  noticeTextError: {
    color: COLORS.destructive,
  },
  turnFooter: {
    paddingLeft: 42,
    marginTop: 4,
  },
  footerStatsText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  userBubbleContainer: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primaryForeground,
  },
});
