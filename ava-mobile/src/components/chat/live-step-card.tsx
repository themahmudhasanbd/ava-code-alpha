import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  OctagonX,
  PauseCircle,
  type LucideIcon,
} from "lucide-react-native";
import { RuntimeDottedIndicator } from "@/components/ai-elements/dotted-indicator";
import { formatDuration } from "@/lib/format";
import type { ChatMessage, MessagePart } from "@/core/types";
import { useTheme } from "@/theme/colors";
import { displayToolName, getToolSubtitle } from "./tool-icons";
import { font, mono } from "@/theme/fonts";
import { completionText, stoppedText } from "./intent";

interface Props {
  message: ChatMessage;
  live: boolean;
  sessionId?: string;
  intent?: string;
  summary?: string;
  onOpenTimeline?: (messageId?: string) => void;
}

type TurnStatus = "running" | "completed" | "stopped" | "failed";

/**
 * Progress summary for a plan part. Core (src/core/api/items.ts) maps the
 * agent's todoList/plan items to { kind: "plan", text: "", meta: { steps } }
 * where each step is { text, status: "pending"|"active"|"done"|"cancelled" }.
 */
function planProgress(part: MessagePart): {
  total: number;
  done: number;
  active?: string;
} {
  const steps = part.meta?.steps ?? [];
  return {
    total: steps.length,
    done: steps.filter((s) => s.status === "done").length,
    active: steps.find((s) => s.status === "active")?.text,
  };
}

/**
 * Simplified agent step overview card.
 *
 * Single-line summary: status pill + intent title + step count.
 * Details (last steps) live behind an expand toggle; full detail in Timeline.
 * Plan parts render as first-class rows ("Plan · 2/5 steps", planning indicator)
 * instead of the old generic "Step" label.
 * - running: blue pulsing pill, intent as title, auto-expanded
 * - completed: green pill, dynamic "{intent} completed" / core summary, auto-collapsed
 * - stopped: amber pill, "{intent} — stopped (n/m steps)", auto-collapsed
 * - failed: red pill, "{n} steps failed", auto-collapsed
 */
export function LiveStepOverviewCard({
  message,
  live,
  sessionId,
  intent = "Working",
  summary,
  onOpenTimeline,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  // Genuine workflow parts (reasoning, tools, plans, error/warning notices)
  const workflowParts = message.parts.filter(
    (p) =>
      p.kind === "tool" ||
      p.kind === "reasoning" ||
      p.kind === "plan" ||
      (p.kind === "notice" &&
        (p.meta?.tone === "error" || p.meta?.tone === "warning" || p.status === "error")),
  );

  // Never render until at least one workflow step has actually started
  if (workflowParts.length === 0) {
    return null;
  }

  const latestPart: MessagePart | undefined = workflowParts[workflowParts.length - 1];
  // A live turn is still in progress by definition (SessionScreen sets live only
  // while the turn status is "submitted"/"streaming"). Deriving "running" from the
  // latest part alone caused a Completed-pill flicker in the gap between two steps,
  // when every part is already "done" but the next step hasn't arrived yet.
  const isRunning = live;

  const toolCount = workflowParts.filter((s) => s.kind === "tool").length;
  const completedCount = workflowParts.filter((s) => s.status === "done").length;
  const errorCount = workflowParts.filter((s) => s.status === "error").length;
  const unfinishedCount = workflowParts.filter((s) => s.status === "running").length;
  const duration = message.stats?.durationMs;

  const hasFinalText = message.parts.some(
    (p) => p.kind === "text" && p.text && p.text.trim().length > 0,
  );
  const wasStoppedFlag = message.parts.some((p) => p.meta?.stopped === true);
  const isFatalFailure = !isRunning && !hasFinalText && errorCount > 0 && completedCount === 0;

  // Derive turn status: running > failed > stopped > completed
  let turnStatus: TurnStatus;
  if (isRunning) {
    turnStatus = "running";
  } else if (isFatalFailure) {
    turnStatus = "failed";
  } else if (wasStoppedFlag || (!hasFinalText && unfinishedCount > 0)) {
    turnStatus = "stopped";
  } else {
    turnStatus = "completed";
  }

  // Auto-expanded while running; collapsed when complete (user can toggle)
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const isExpanded = userExpanded !== null ? userExpanded : isRunning;

  const toggleExpand = () => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setUserExpanded((prev) => (prev === null ? !isRunning : !prev));
  };

  // Status pill config
  const statusConfig: Record<TurnStatus, { label: string; color: string; Icon: LucideIcon | null }> = {
    running: { label: "Running", color: colors.primary, Icon: null },
    completed: { label: "Completed", color: colors.success, Icon: CheckCircle2 },
    stopped: { label: "Stopped", color: colors.warning, Icon: PauseCircle },
    failed: { label: "Failed", color: colors.destructive, Icon: OctagonX },
  };
  const { label: statusLabel, color: statusColor, Icon: StatusIcon } = statusConfig[turnStatus];

  // Title per status
  let title: string;
  if (turnStatus === "running") {
    title = `${intent}…`;
  } else if (turnStatus === "completed") {
    title = completionText(intent, summary);
  } else if (turnStatus === "stopped") {
    title = stoppedText(intent, completedCount, workflowParts.length);
  } else {
    title = `${errorCount} step${errorCount === 1 ? "" : "s"} failed`;
  }

  const subtitle =
    turnStatus === "running"
      ? `${completedCount}/${workflowParts.length} steps`
      : turnStatus === "completed"
      ? `${workflowParts.length} step${workflowParts.length === 1 ? "" : "s"}${duration ? ` · ${formatDuration(duration)}` : ""}`
      : turnStatus === "stopped"
      ? `${completedCount}/${workflowParts.length} steps done`
      : `${errorCount} failed · ${completedCount} done`;

  const handleOpenTimeline = () => {
    if (onOpenTimeline) {
      onOpenTimeline(message.id);
    } else {
      navigation.navigate("Timeline", {
        sessionId,
        messageId: message.id,
      });
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          ...(turnStatus === "running" ? { borderColor: colors.primary } : {}),
          ...(turnStatus === "failed" ? { borderColor: colors.destructive } : {}),
        },
      ]}
    >
      {/* Single-line header: status pill + intent + meta */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {/* Status pill */}
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          {turnStatus === "running" ? (
            <View style={[styles.pulseDot, { backgroundColor: statusColor }]} />
          ) : StatusIcon ? (
            <StatusIcon size={11} color={statusColor} strokeWidth={2.5} />
          ) : null}
          <Text style={[styles.statusPillText, mono("bold"), { color: statusColor }]}>
            {statusLabel.toUpperCase()}
          </Text>
        </View>

        {/* Intent title + subtitle */}
        <View style={styles.centerInfo}>
          <Text
            style={[styles.title, font("medium"), { color: colors.foreground }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.subtitle, font("regular"), { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        </View>

        {/* Right: spinner / timeline link */}
        <View style={styles.rightAction}>
          {turnStatus === "running" && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
          <TouchableOpacity
            style={styles.timelineLink}
            onPress={handleOpenTimeline}
            activeOpacity={0.7}
          >
            <Text style={[styles.timelineLinkText, font("medium"), { color: colors.mutedForeground }]}>
              Timeline
            </Text>
            <ChevronRight size={11} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(4, Math.round((completedCount / Math.max(1, workflowParts.length)) * 100))}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>

      {/* Expanded: recent steps (collapsed by default when done) */}
      {isExpanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          {turnStatus === "running" && latestPart && latestPart.status === "running" && (
            <RuntimeDottedIndicator
              label={
                latestPart.kind === "plan"
                  ? "Planning"
                  : displayToolName(latestPart.toolName || "tool", latestPart.meta)
              }
              subLabel={
                latestPart.kind === "plan"
                  ? planProgress(latestPart).active || "Drafting a plan…"
                  : getToolSubtitle(latestPart) || latestPart.text || "Processing step…"
              }
              size="sm"
            />
          )}
          <View style={styles.stepsList}>
            {workflowParts.slice(-4).map((part, pIdx) => {
              const partRunning = live && part.status === "running";
              const partDone = part.status === "done";
              const partErr = part.status === "error";
              const isPlan = part.kind === "plan";
              const plan = isPlan ? planProgress(part) : null;
              const stepColor = partRunning
                ? colors.primary
                : partDone
                ? colors.success
                : partErr
                ? colors.destructive
                : colors.mutedForeground;
              return (
                <View key={`step_${part.id || pIdx}_${pIdx}`} style={styles.stepRow}>
                  {isPlan ? (
                    <ClipboardList size={13} color={stepColor} strokeWidth={2} />
                  ) : (
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: colors.mutedForeground },
                        partRunning && { backgroundColor: colors.primary },
                        partDone && { backgroundColor: colors.success },
                        partErr && { backgroundColor: colors.destructive },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepRowText,
                      mono("regular"),
                      { color: colors.mutedForeground },
                      partRunning && { color: colors.primary, fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {part.kind === "tool"
                      ? displayToolName(part.toolName || "tool", part.meta)
                      : part.kind === "reasoning"
                      ? "Reasoning"
                      : plan
                      ? plan.total > 0
                        ? `Plan · ${plan.done}/${plan.total} steps`
                        : "Plan"
                      : part.text || "Step"}
                  </Text>
                  {partRunning && <RuntimeDottedIndicator variant="inline" />}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  centerInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 10.5,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 2,
  },
  timelineLinkText: {
    fontSize: 11,
  },
  progressTrack: {
    height: 2,
    marginHorizontal: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  expandedSection: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  stepsList: {
    gap: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  stepRowText: {
    fontSize: 12,
    flex: 1,
  },
});
