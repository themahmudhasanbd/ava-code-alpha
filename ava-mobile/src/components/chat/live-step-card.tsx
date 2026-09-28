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
import { useTheme } from "@/theme/colors";
import { displayToolName, getToolIcon } from "./tool-icons";
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
  const { colors, isDark } = useTheme();
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
  const errorCount = workflowParts.filter((s) => s.status === "error").length;

  const plan = [...workflowParts].reverse().find((s) => s.kind === "plan");
  const planSteps = plan?.meta?.steps ?? [];
  const donePlanSteps = planSteps.filter((s) => s.status === "done").length;
  const progressPercent = Math.round((completedCount / Math.max(1, workflowParts.length)) * 100);

  // Check if turn ended with final text response or normal completion
  const hasFinalText = message.parts.some((p) => p.kind === "text" && p.text && p.text.trim().length > 0);
  const isFatalFailure = !isRunning && !hasFinalText && errorCount > 0 && completedCount === 0;
  const isComplete = !isRunning && !isFatalFailure;

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
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        isRunning && [
          styles.containerRunning,
          {
            borderColor: colors.primary,
            backgroundColor: isDark ? "rgba(99, 102, 241, 0.04)" : "rgba(79, 70, 229, 0.03)",
          },
        ],
        isFatalFailure && [
          styles.containerFailed,
          {
            borderColor: "rgba(239, 68, 68, 0.3)",
            backgroundColor: isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.03)",
          },
        ],
      ]}
    >
      {/* Top row: Icon + Info + Action */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {/* Step Icon */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          <StepIcon
            size={16}
            color={
              isRunning
                ? colors.primary
                : isFatalFailure
                ? colors.destructive
                : isComplete
                ? colors.success
                : colors.mutedForeground
            }
            strokeWidth={2}
          />
        </View>

        {/* Step info */}
        <View style={styles.centerInfo}>
          <View style={styles.titleRow}>
            {isRunning ? (
              <Shimmer style={[styles.stepTitleLive, mono("bold"), { color: colors.primary }]}>
                {currentTitle}
              </Shimmer>
            ) : (
              <Text
                style={[styles.stepTitle, mono("bold"), { color: colors.foreground }]}
                numberOfLines={1}
              >
                {currentTitle}
              </Text>
            )}
          </View>

          <Text style={[styles.summaryText, font("regular"), { color: colors.mutedForeground }]}>
            {isRunning
              ? `${workflowParts.length} step${workflowParts.length === 1 ? "" : "s"} · working now`
              : isFatalFailure
              ? `${errorCount} step${errorCount === 1 ? "" : "s"} failed`
              : `${completedCount} step${completedCount === 1 ? "" : "s"}${toolCount > 0 ? ` · ${toolCount} tool${toolCount === 1 ? "" : "s"}` : ""}${duration ? ` · ${formatDuration(duration)}` : ""}`}
          </Text>
        </View>

        {/* Right Action */}
        <View style={styles.rightAction}>
          {isRunning ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : isFatalFailure ? (
            <AlertTriangle size={15} color={colors.destructive} />
          ) : isComplete ? (
            <CheckCircle2 size={15} color={colors.success} />
          ) : null}

          <TouchableOpacity
            style={[
              styles.pillButton,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
            onPress={handleOpenTimeline}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillButtonText, font("medium"), { color: colors.secondaryForeground }]}>
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
              width: `${Math.max(4, isComplete ? 100 : progressPercent)}%`,
              backgroundColor: isFatalFailure
                ? colors.destructive
                : isComplete
                ? colors.success
                : colors.primary,
            },
          ]}
        />
      </View>

      {/* Expanded details: auto-expanded when running, collapsed when complete */}
      {isExpanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
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
                      { backgroundColor: colors.mutedForeground },
                      partRunning && { backgroundColor: colors.primary },
                      partDone && { backgroundColor: colors.success },
                      partErr && { backgroundColor: colors.destructive },
                    ]}
                  />
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
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.statItem, mono("regular"), { color: colors.mutedForeground }]}>
            {formatDuration(duration)}
          </Text>
          <View style={[styles.statDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.statItem, mono("regular"), { color: colors.mutedForeground }]}>
            {toolCount} tool{toolCount === 1 ? "" : "s"}
          </Text>
          {planSteps.length > 0 && (
            <>
              <View style={[styles.statDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.statItem, mono("regular"), { color: colors.mutedForeground }]}>
                {donePlanSteps}/{planSteps.length} plan
              </Text>
            </>
          )}
          {message.stats?.totalTokens ? (
            <>
              <View style={[styles.statDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.statItem, mono("regular"), { color: colors.mutedForeground }]}>
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
  },
  containerRunning: {
    borderWidth: 1,
  },
  containerFailed: {
    borderWidth: 1,
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
    borderWidth: 1,
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
    flex: 1,
    fontWeight: "600",
  },
  stepTitleLive: {
    fontSize: 12.5,
    flex: 1,
  },
  summaryText: {
    fontSize: 11,
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
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillButtonText: {
    fontSize: 11,
  },
  progressTrack: {
    height: 3,
    marginTop: 8,
    borderRadius: 2,
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
  },
  stepRowText: {
    fontSize: 11,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    fontSize: 10.5,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
