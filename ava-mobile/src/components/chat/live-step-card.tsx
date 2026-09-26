import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Brain,
  ChevronRight,
  Terminal,
  Wrench,
  CheckCircle2,
  ListChecks,
  AlertTriangle,
} from "lucide-react-native";
import { Shimmer } from "@/components/ai-elements/shimmer";
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

  // Derive step title
  let currentTitle = "Analyzing request…";
  let serverName = "agent";

  if (latestPart) {
    if (latestPart.kind === "reasoning") {
      currentTitle = isRunning ? "Thinking…" : "Thought process";
      serverName = "reasoning";
    } else if (latestPart.kind === "tool") {
      const isMcp = isMcpTool(latestPart.toolName, latestPart.meta);
      serverName = isMcp ? "mcp" : latestPart.meta?.server ? latestPart.meta.server : "tool";
      currentTitle = displayToolName(latestPart.toolName || latestPart.meta?.command || "execute_command");
    } else if (latestPart.kind === "plan") {
      serverName = "plan";
      currentTitle = latestPart.text || "Execution plan";
    } else if (latestPart.kind === "notice") {
      currentTitle = latestPart.text || "Agent notice";
      serverName = "notice";
    }
  }

  const duration = message.stats?.durationMs;
  const toolCount = workflowParts.filter((s) => s.kind === "tool").length;
  const completedCount = workflowParts.filter((s) => s.status === "done").length;
  const hasError = workflowParts.some((s) => s.status === "error");
  const plan = [...workflowParts].reverse().find((s) => s.kind === "plan");
  const planSteps = plan?.meta?.steps ?? [];
  const donePlanSteps = planSteps.filter((s) => s.status === "done").length;

  const handlePress = () => {
    if (onOpenTimeline) {
      onOpenTimeline(message.id);
    } else {
      navigation.navigate("Timeline", {
        sessionId,
        messageId: message.id,
      });
    }
  };

  const IconComponent = latestPart?.kind === "reasoning"
    ? Brain
    : latestPart?.kind === "plan"
    ? ListChecks
    : getToolIcon(latestPart?.toolName, latestPart?.meta);

  return (
    <TouchableOpacity
      style={[styles.container, isRunning && styles.containerRunning]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        {/* Step Icon */}
        <View style={[styles.iconWrapper, isRunning && styles.iconWrapperRunning, serverName === "mcp" && { backgroundColor: "#059669" }]}>
          <IconComponent
            size={14}
            color={COLORS.primaryForeground}
            strokeWidth={2.2}
          />
        </View>

        {/* Step info */}
        <View style={styles.centerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.serverTag, mono("bold"), serverName === "mcp" && { color: "#059669" }]}>{serverName}</Text>
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
              : `${completedCount}/${workflowParts.length} complete · ${toolCount} tool${toolCount === 1 ? "" : "s"}${duration ? ` · ${formatDuration(duration)}` : ""}`}
          </Text>
        </View>

        {/* Right Action */}
        <View style={styles.rightAction}>
          {isRunning ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : hasError ? (
            <AlertTriangle size={15} color={COLORS.destructive} />
          ) : (
            <CheckCircle2 size={15} color={COLORS.success} />
          )}
          <View style={styles.pillButton}>
            <Text style={[styles.pillButtonText, font("medium")]}>Workflow</Text>
            <ChevronRight size={13} color={COLORS.mutedForeground} />
          </View>
        </View>
      </View>

      {planSteps.length > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(
                  5,
                  Math.round((donePlanSteps / planSteps.length) * 100)
                )}%`,
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  containerRunning: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 64, 225, 0.03)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperRunning: {
    backgroundColor: COLORS.primary,
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
  serverTag: {
    fontSize: 10.5,
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  stepTitleLive: {
    fontSize: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.primary,
  },
  pillButtonText: {
    fontSize: 11,
    color: COLORS.secondaryForeground,
  },
});
