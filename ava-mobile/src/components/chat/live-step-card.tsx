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
  Brain,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ListChecks,
  AlertTriangle,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { RuntimeDottedIndicator } from "@/components/ai-elements/dotted-indicator";
import { formatDuration } from "@/lib/format";
import type { ChatMessage, MessagePart } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { displayToolName, getToolIcon, isMcpTool } from "./tool-icons";
import { font, mono } from "@/theme/fonts";

interface Props {
  message: ChatMessage;
  live: boolean;
  sessionId?: string;
  onOpenTimeline?: (messageId?: string) => void;
}

export function LiveStepOverviewCard({
  message,
  live,
  sessionId,
  onOpenTimeline,
}: Props) {
  const navigation = useNavigation<any>();

  // Extract workflow parts (reasoning, tools, plans, notices)
  const workflowParts = message.parts.filter((p) => p.kind !== "text");

  // Never render until at least one workflow step has actually started
  if (workflowParts.length === 0) {
    return null;
  }

  // Find latest active or last completed step
  const latestPart: MessagePart | undefined = workflowParts[workflowParts.length - 1];
  const isRunning = live && (latestPart?.status === "running" || latestPart == null);

  // Auto-expanded while running; collapsed when complete (user can toggle)
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const isExpanded = userExpanded !== null ? userExpanded : isRunning;

  const toggleExpand = () => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setUserExpanded((prev) => (prev === null ? !isRunning : !prev));
  };

  // Derive step title and icon
  let currentTitle = "Analyzing request…";
  let StepIcon: LucideIcon = Zap;

  if (latestPart) {
    if (latestPart.kind === "reasoning") {
      StepIcon = Brain;
      currentTitle = isRunning ? "Thinking…" : "Reasoning complete";
    } else if (latestPart.kind === "tool") {
      StepIcon = getToolIcon(latestPart.toolName, latestPart.meta);
      currentTitle = displayToolName(latestPart.toolName || latestPart.meta?.command || "execute_command");
    } else if (latestPart.kind === "plan") {
      StepIcon = ListChecks;
      currentTitle = latestPart.text || "Execution plan";
    } else if (latestPart.kind === "notice") {
      currentTitle = latestPart.text || "System notice";
    }
  }

  const duration = message.stats?.durationMs;
  const toolCount = workflowParts.filter((s) => s.kind === "tool").length;
  const completedCount = workflowParts.filter((s) => s.status === "done").length;
  const hasError = workflowParts.some((s) => s.status === "error");
  const plan = [...workflowParts].reverse().find((s) => s.kind === "plan");
  const planSteps = plan?.meta?.steps ?? [];
  const donePlanSteps = planSteps.filter((s) => s.status === "done").length;
  const progressPercent = Math.round((completedCount / Math.max(1, workflowParts.length)) * 100);

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

  // Completion state
  const isComplete = !isRunning && !hasError;
  const isFailed = !isRunning && hasError;

  return (
    <View
      style={[
        styles.container,
        isRunning && styles.containerRunning,
        isComplete && styles.containerComplete,
        isFailed && styles.containerFailed,
      ]}
    >
      {/* Top row: Icon + Info + Action */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {/* Step Icon */}
        <View style={styles.iconWrapper}>
          <StepIcon
            size={16}
            color={
              isRunning
                ? COLORS.primary
                : isFailed
                ? COLORS.destructive
                : isComplete
                ? COLORS.success
                : COLORS.mutedForeground
            }
            strokeWidth={2}
          />
        </View>

        {/* Step info */}
        <View style={styles.centerInfo}>
          <View style={styles.titleRow}>
            {isRunning ? (
              <Shimmer style={[styles.stepTitleLive, mono("bold")]}>
                {currentTitle}
              </Shimmer>
            ) : (
              <Text style={[styles.stepTitle, mono("bold")]} numberOfLines={1}>
                {currentTitle}
              </Text>
            )}
          </View>

          <Text style={[styles.summaryText, font("regular")]}>
            {isRunning
              ? `${workflowParts.length} step${workflowParts.length === 1 ? "" : "s"} · working now`
              : isComplete
              ? `${completedCount} steps · ${toolCount} tool${toolCount === 1 ? "" : "s"}${duration ? ` · ${formatDuration(duration)}` : ""}`
              : isFailed
              ? `${completedCount}/${workflowParts.length} completed · error encountered`
              : `${completedCount}/${workflowParts.length} complete`}
          </Text>
        </View>

        {/* Right Action */}
        <View style={styles.rightAction}>
          {isRunning ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : isFailed ? (
            <AlertTriangle size={15} color={COLORS.destructive} />
          ) : isComplete ? (
            <CheckCircle2 size={15} color={COLORS.success} />
          ) : null}

          <TouchableOpacity
            style={styles.pillButton}
            onPress={handleOpenTimeline}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillButtonText, font("medium")]}>Timeline</Text>
            <ChevronRight size={11} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(4, isComplete ? 100 : progressPercent)}%`,
              backgroundColor: isFailed
                ? COLORS.destructive
                : isComplete
                ? COLORS.success
                : COLORS.primary,
            },
          ]}
        />
      </View>

      {/* Expanded details: auto-expanded when running, collapsed when complete */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          {isRunning ? (
            <RuntimeDottedIndicator
              label={currentTitle}
              subLabel={latestPart?.meta?.command || latestPart?.text || "Processing step…"}
              size="sm"
            />
          ) : null}

          {/* Quick steps list */}
          <View style={styles.stepsList}>
            {workflowParts.slice(-4).map((part, pIdx) => {
              const partRunning = part.status === "running";
              const partDone = part.status === "done";
              const partErr = part.status === "error";
              return (
                <View key={`${part.id || pIdx}`} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      partRunning && styles.stepDotRunning,
                      partDone && styles.stepDotDone,
                      partErr && styles.stepDotErr,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepRowText,
                      mono("regular"),
                      partRunning && { color: COLORS.primary, fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {part.kind === "tool"
                      ? displayToolName(part.toolName || "tool")
                      : part.kind === "reasoning"
                      ? "Reasoning"
                      : part.text || "Step"}
                  </Text>
                  {partRunning && <RuntimeDottedIndicator variant="inline" />}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Bottom stats row — shown when complete */}
      {!isRunning && duration ? (
        <View style={styles.statsRow}>
          <Text style={[styles.statItem, mono("regular")]}>
            {formatDuration(duration)}
          </Text>
          <View style={styles.statDot} />
          <Text style={[styles.statItem, mono("regular")]}>
            {toolCount} tool{toolCount === 1 ? "" : "s"}
          </Text>
          {planSteps.length > 0 && (
            <>
              <View style={styles.statDot} />
              <Text style={[styles.statItem, mono("regular")]}>
                {donePlanSteps}/{planSteps.length} plan
              </Text>
            </>
          )}
          {message.stats?.totalTokens ? (
            <>
              <View style={styles.statDot} />
              <Text style={[styles.statItem, mono("regular")]}>
                {(message.stats.totalTokens / 1000).toFixed(1)}k tok
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginVertical: 6,
  },
  containerRunning: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 64, 225, 0.03)",
  },
  containerComplete: {
    borderColor: "rgba(59, 179, 96, 0.25)",
  },
  containerFailed: {
    borderColor: "rgba(231, 0, 11, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  centerInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepTitle: {
    fontSize: 12.5,
    color: COLORS.foreground,
    flex: 1,
    fontWeight: "600",
  },
  stepTitleLive: {
    fontSize: 12.5,
    color: COLORS.primary,
    flex: 1,
  },
  summaryText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillButtonText: {
    fontSize: 11,
    color: COLORS.secondaryForeground,
  },
  progressTrack: {
    height: 3,
    marginTop: 8,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  expandedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  stepsList: {
    gap: 4,
    paddingTop: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.mutedForeground,
  },
  stepDotRunning: {
    backgroundColor: COLORS.primary,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
  },
  stepDotErr: {
    backgroundColor: COLORS.destructive,
  },
  stepRowText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  statItem: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },
});
