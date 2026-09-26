import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Copy,
  FileCode,
  FileDiff,
  Flame,
  Globe,
  Info,
  Layers,
  ListChecks,
  MessageSquare,
  Plug,
  Sparkles,
  Terminal,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useChat } from "@/state/use-chat";
import { useAva } from "@/state/ava-provider";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { RichResponse } from "@/components/chat/rich-response";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { formatDuration } from "@/components/chat/message-parts";
import type { ChatMessage, MessagePart, PlanStep } from "@/core/types";
import { font, mono } from "@/theme/fonts";
import { displayToolName, getToolIcon } from "@/components/chat/tool-icons";
import { COLORS } from "@/theme/colors";

interface Props {
  route?: {
    params?: {
      sessionId?: string;
      messageId?: string;
    };
  };
  navigation?: any;
}

export function TimelineScreen({ route, navigation }: Props) {
  const { activeSessionId } = useAva();
  const sessionId = route?.params?.sessionId || activeSessionId || "";
  const targetMessageId = route?.params?.messageId;

  const { messages, status } = useChat(sessionId);
  const [activeTab, setActiveTab] = useState<"timeline" | "changes">("timeline");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const assistantMsgs = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages]
  );

  const [selectedTurnId, setSelectedTurnId] = useState<string | undefined>(targetMessageId);

  // Synchronize when route messageId parameter updates
  useEffect(() => {
    if (targetMessageId) {
      setSelectedTurnId(targetMessageId);
    }
  }, [targetMessageId]);

  // Robust Turn Resolution: matches exact assistant message, stripped prefix, live id, or latest assistant turn
  const targetMessage: ChatMessage | undefined = useMemo(() => {
    const candidateId = selectedTurnId || targetMessageId;

    if (candidateId) {
      // 1. Direct match
      const direct = messages.find((m) => m.id === candidateId);
      if (direct) {
        if (direct.role === "assistant") return direct;
        // If clicked on user message, find the subsequent assistant turn
        const uIdx = messages.findIndex((m) => m.id === candidateId);
        if (uIdx !== -1) {
          const nextAss = messages.slice(uIdx + 1).find((m) => m.role === "assistant");
          if (nextAss) return nextAss;
        }
      }

      // 2. Match with or without "a_" prefix (e.g. a_102 <-> 102)
      const altId = candidateId.startsWith("a_") ? candidateId.slice(2) : `a_${candidateId}`;
      const altMatch = messages.find((m) => m.id === altId);
      if (altMatch?.role === "assistant") return altMatch;

      // 3. If candidateId is a live ID (e.g. live_...), match the latest assistant turn
      if (candidateId.startsWith("live_") && assistantMsgs.length > 0) {
        return assistantMsgs[assistantMsgs.length - 1];
      }
    }

    // Default to the latest assistant message
    return assistantMsgs[assistantMsgs.length - 1];
  }, [messages, selectedTurnId, targetMessageId, assistantMsgs]);

  // Associated user prompt for the active turn
  const userPromptText = useMemo(() => {
    if (!targetMessage) return null;
    const idx = messages.findIndex((m) => m.id === targetMessage.id);
    if (idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          const p = messages[i]?.parts?.find((part) => part.text && part.text.trim());
          if (p?.text) return p.text.trim();
        }
      }
    }
    return null;
  }, [messages, targetMessage]);

  const toggleNode = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Aggregate all steps across ONLY the target turn (never mix turns!)
  const { allParts, finalOutputText, totalDuration, totalTokens, changedFiles } = useMemo(() => {
    const parts: (MessagePart & { turnId: string; nodeType: "thought" | "decision" | "tool" | "plan" | "notice" })[] = [];
    let dur = 0;
    let tokens = 0;
    let finalOutput = "";
    const filesMap = new Map<string, { path: string; kind: string; tool?: string }>();

    const targetList = targetMessage ? [targetMessage] : assistantMsgs.length > 0 ? [assistantMsgs[assistantMsgs.length - 1]!] : [];

    for (const msg of targetList) {
      if (msg.stats?.durationMs) dur += msg.stats.durationMs;
      if (msg.stats?.totalTokens) tokens += msg.stats.totalTokens;

      for (const part of msg.parts) {
        if (part.kind === "text") {
          if (part.text?.trim()) {
            finalOutput = part.text.trim();
          }
          continue;
        }

        if (part.kind === "reasoning") {
          const rawText = part.text || "";
          // Distinguish between pure reasoning thoughts vs decisions
          const isDecision =
            rawText.toLowerCase().includes("decision:") ||
            rawText.toLowerCase().includes("i will ") ||
            rawText.toLowerCase().includes("selected strategy") ||
            rawText.toLowerCase().includes("approach:");

          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: isDecision ? "decision" : "thought",
          });
          continue;
        }

        if (part.kind === "tool") {
          parts.push({ ...part, turnId: msg.id, nodeType: "tool" });
          if (part.meta?.files) {
            for (const f of part.meta.files) {
              filesMap.set(f.path, { path: f.path, kind: f.kind, tool: part.toolName });
            }
          }
          continue;
        }

        if (part.kind === "plan") {
          parts.push({ ...part, turnId: msg.id, nodeType: "plan" });
          continue;
        }

        if (part.kind === "notice") {
          parts.push({ ...part, turnId: msg.id, nodeType: "notice" });
          continue;
        }
      }
    }

    return {
      allParts: parts,
      finalOutputText: finalOutput,
      totalDuration: dur,
      totalTokens: tokens,
      changedFiles: Array.from(filesMap.values()),
    };
  }, [targetMessage, assistantMsgs]);

  const isLive = status === "submitted" || status === "streaming";
  const durationText = formatDuration(totalDuration);
  const doneCount = allParts.filter((part) => part.status === "done").length;
  const activeCount = allParts.filter((part) => part.status === "running").length;
  const errorCount = allParts.filter((part) => part.status === "error").length;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Top Navigation Header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (sessionId) {
              navigation?.navigate("Session", {
                sessionId,
                scrollToMessageId: targetMessage?.id || targetMessageId,
              });
            } else {
              navigation?.goBack();
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color={COLORS.foreground} />
        </TouchableOpacity>

        {/* Segmented Control Tabs */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "timeline" && styles.segmentTabActive]}
            onPress={() => setActiveTab("timeline")}
            activeOpacity={0.8}
          >
            <Layers size={14} color={activeTab === "timeline" ? COLORS.primary : COLORS.mutedForeground} />
            <Text
              style={[
                styles.segmentTabText,
                font("medium"),
                activeTab === "timeline" && styles.segmentTabTextActive,
              ]}
            >
              Workflow & Steps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "changes" && styles.segmentTabActive]}
            onPress={() => setActiveTab("changes")}
            activeOpacity={0.8}
          >
            <FileDiff size={14} color={activeTab === "changes" ? COLORS.primary : COLORS.mutedForeground} />
            <Text
              style={[
                styles.segmentTabText,
                font("medium"),
                activeTab === "changes" && styles.segmentTabTextActive,
              ]}
            >
              Changes
            </Text>
            {changedFiles.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={[styles.badgeCountText, mono("bold")]}>{changedFiles.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── Subtitle Status Bar ── */}
      <View style={styles.subStatusBar}>
        <View style={styles.subStatusItem}>
          <Clock size={13} color={COLORS.mutedForeground} />
          <Text style={[styles.subStatusText, font("regular")]}>
            {isLive ? "Streaming live execution…" : totalDuration ? `Execution time: ${durationText}` : "Ready"}
          </Text>
        </View>

        <View style={styles.subStatusItem}>
          <Coins size={13} color={COLORS.mutedForeground} />
          <Text style={[styles.subStatusText, font("regular")]}>
            {totalTokens > 0
              ? `${(totalTokens / 1000).toFixed(1)}k tokens`
              : `${allParts.length} steps logged`}
          </Text>
        </View>
      </View>

      {/* ── Turn Switcher Bar (when session has multiple turns) ── */}
      {assistantMsgs.length > 1 && (
        <View style={styles.turnSwitcherBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.turnSwitcherContent}
          >
            {assistantMsgs.map((assMsg, idx) => {
              const isSelected = targetMessage?.id === assMsg.id;
              const turnDur = assMsg.stats?.durationMs ? formatDuration(assMsg.stats.durationMs) : null;
              return (
                <TouchableOpacity
                  key={assMsg.id}
                  style={[styles.turnPill, isSelected && styles.turnPillActive]}
                  onPress={() => setSelectedTurnId(assMsg.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.turnPillText,
                      mono("bold"),
                      isSelected && styles.turnPillTextActive,
                    ]}
                  >
                    {`Turn ${idx + 1}`}
                  </Text>
                  {turnDur && (
                    <Text
                      style={[
                        styles.turnPillDur,
                        mono("regular"),
                        isSelected && styles.turnPillDurActive,
                      ]}
                    >
                      {turnDur}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Scroll Area ── */}
      {activeTab === "timeline" ? (
        <ScrollView
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Prompt Context Card */}
          {userPromptText ? (
            <View style={styles.userPromptCard}>
              <Text style={[styles.userPromptLabel, mono("bold")]}>USER PROMPT</Text>
              <Text style={[styles.userPromptText, font("regular")]} numberOfLines={3}>
                {userPromptText}
              </Text>
            </View>
          ) : null}

          {/* Progress Overview Card */}
          {allParts.length > 0 && (
            <View style={styles.overview}>
              <View style={styles.overviewTop}>
                <View>
                  <Text style={[styles.overviewLabel, mono("bold")]}>AGENT EXECUTION TRACE</Text>
                  <Text style={[styles.overviewTitle, font("semibold")]}>
                    {isLive ? "Turn active & executing" : errorCount ? "Execution encountered errors" : "Turn completed successfully"}
                  </Text>
                </View>
                <Text style={[styles.overviewCount, mono("bold")]}>
                  {doneCount}/{allParts.length}
                </Text>
              </View>

              <View style={styles.overviewTrack}>
                <View
                  style={[
                    styles.overviewFill,
                    {
                      width: `${Math.max(
                        4,
                        Math.round((doneCount / Math.max(1, allParts.length)) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.overviewStats}>
                <Text style={[styles.overviewStat, font("regular")]}>{doneCount} complete</Text>
                {activeCount > 0 && (
                  <Text style={[styles.overviewStatActive, font("medium")]}>
                    {activeCount} active
                  </Text>
                )}
                {errorCount > 0 && (
                  <Text style={[styles.overviewError, font("medium")]}>
                    {errorCount} failed
                  </Text>
                )}
                <Text style={[styles.overviewStat, font("regular")]}>{allParts.length} total events</Text>
              </View>
            </View>
          )}

          {allParts.length === 0 && !finalOutputText ? (
            <View style={styles.emptyWrap}>
              <Brain size={38} color={COLORS.primary} />
              <Text style={[styles.emptyTitle, font("semibold")]}>No workflow steps yet</Text>
              <Text style={[styles.emptySubtitle, font("regular")]}>
                Agent reasoning, decisions, commands, and tools for this turn will appear here in chronological order.
              </Text>
            </View>
          ) : (
            <View style={styles.treeContainer}>
              {/* Single continuous spine line */}
              <View style={styles.treeSpine} />

              {allParts.map((part) => {
                const isExpanded = !!expandedNodes[part.id];
                const isRunning = part.status === "running";
                const isError =
                  part.status === "error" ||
                  (part.meta?.exitCode != null && part.meta.exitCode !== 0);

                // Determine Icon and Style per node type
                let NodeIcon: LucideIcon = Wrench;
                let iconBg: string = COLORS.primary;
                let badgeLabel = "";
                let headerTitle = "";

                if (part.nodeType === "thought") {
                  NodeIcon = Brain;
                  iconBg = "#7C3AED"; // Purple for thoughts
                  badgeLabel = "Thought";
                  headerTitle = isRunning
                    ? "Thinking in progress…"
                    : part.meta?.durationMs
                    ? `Thought (${formatDuration(part.meta.durationMs)})`
                    : "Thought process";
                } else if (part.nodeType === "decision") {
                  NodeIcon = Compass;
                  iconBg = "#0284C7"; // Blue for decisions
                  badgeLabel = "Decision";
                  headerTitle = "Strategic Decision";
                } else if (part.nodeType === "tool") {
                  NodeIcon = getToolIcon(part.toolName, part.meta);
                  iconBg = COLORS.primary;
                  badgeLabel = "Tool";
                  headerTitle = displayToolName(part.toolName || "execute_command");
                } else if (part.nodeType === "plan") {
                  NodeIcon = ListChecks;
                  iconBg = "#059669"; // Green for plan
                  badgeLabel = "Plan";
                  headerTitle = part.text || "Execution Plan";
                } else if (part.nodeType === "notice") {
                  NodeIcon = Info;
                  iconBg = isError ? COLORS.destructive : "#D97706";
                  badgeLabel = "Notice";
                  headerTitle = part.text || "System Notice";
                }

                const commandString =
                  part.meta?.command ||
                  (typeof part.input === "string"
                    ? part.input
                    : part.input
                    ? JSON.stringify(part.input, null, 2)
                    : "");

                return (
                  <View key={part.id} style={styles.treeNodeRow}>
                    {/* ── Single Icon Column directly on Spine ── */}
                    <View style={styles.singleIconColumn}>
                      <View
                        style={[
                          styles.unifiedIconBox,
                          { backgroundColor: iconBg },
                          isRunning && styles.unifiedIconBoxRunning,
                        ]}
                      >
                        <NodeIcon size={13} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                    </View>

                    {/* ── Content Column (Collapsed by default) ── */}
                    <View style={styles.nodeContentCol}>
                      <TouchableOpacity
                        style={[
                          styles.nodeHeaderBox,
                          isExpanded && styles.nodeHeaderBoxExpanded,
                        ]}
                        onPress={() => toggleNode(part.id)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.nodeHeaderLeft}>
                          <View
                            style={[
                              styles.typePill,
                              { backgroundColor: "rgba(66, 64, 225, 0.08)" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typePillText,
                                mono("bold"),
                                { color: iconBg },
                              ]}
                            >
                              {badgeLabel}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.nodeHeaderTitle,
                              part.nodeType === "tool" ? mono("bold") : font("semibold"),
                            ]}
                            numberOfLines={1}
                          >
                            {headerTitle}
                          </Text>
                        </View>

                        <View style={styles.nodeHeaderRight}>
                          {!!part.meta?.durationMs && (
                            <Text style={[styles.stepDurationText, mono("regular")]}>
                              {formatDuration(part.meta.durationMs)}
                            </Text>
                          )}

                          {isRunning ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : isError ? (
                            <View
                              style={[
                                styles.statusDotSmall,
                                { backgroundColor: COLORS.destructive },
                              ]}
                            >
                              <X size={9} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.statusDotSmall,
                                { backgroundColor: COLORS.success },
                              ]}
                            >
                              <Check size={9} color="#FFFFFF" />
                            </View>
                          )}

                          <ChevronRight
                            size={14}
                            color={COLORS.mutedForeground}
                            style={{
                              transform: [{ rotate: isExpanded ? "90deg" : "0deg" }],
                            }}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* ── Collapsible Body ── */}
                      {isExpanded && (
                        <View style={styles.nodeExpandedCard}>
                          {/* Thought & Decision: Render Rich Markdown */}
                          {(part.nodeType === "thought" || part.nodeType === "decision") && (
                            <View style={styles.markdownWrapper}>
                              <RichResponse text={part.text || "No details provided."} />
                            </View>
                          )}

                          {/* Tool Input / Parameters */}
                          {part.nodeType === "tool" && commandString ? (
                            <View style={styles.expandedSection}>
                              <View style={styles.expandedSectionHeader}>
                                <Text style={[styles.sectionHeadingText, mono("bold")]}>
                                  INPUT / COMMAND
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleCopy(part.id + "-in", commandString)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Text style={[styles.copyBtnText, mono("medium")]}>
                                    {copiedId === part.id + "-in" ? "Copied" : "Copy"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <CodeBlock
                                code={commandString}
                                language={part.meta?.command ? "bash" : "json"}
                              />
                            </View>
                          ) : null}

                          {/* Working Directory */}
                          {part.meta?.cwd ? (
                            <View style={styles.cwdRow}>
                              <Text style={[styles.cwdLabel, mono("regular")]}>cwd:</Text>
                              <Text style={[styles.cwdPath, mono("regular")]} numberOfLines={1}>
                                {part.meta.cwd}
                              </Text>
                            </View>
                          ) : null}

                          {/* Tool Output / Result */}
                          {part.nodeType === "tool" && part.output ? (
                            <View style={styles.expandedSection}>
                              <View style={styles.expandedSectionHeader}>
                                <Text style={[styles.sectionHeadingText, mono("bold")]}>
                                  OUTPUT {part.meta?.exitCode != null ? `(exit ${part.meta.exitCode})` : ""}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleCopy(part.id + "-out", part.output || "")}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Text style={[styles.copyBtnText, mono("medium")]}>
                                    {copiedId === part.id + "-out" ? "Copied" : "Copy"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <View style={styles.outputBox}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  <Text style={[styles.outputText, mono("regular")]}>
                                    {part.output.trim()}
                                  </Text>
                                </ScrollView>
                              </View>
                            </View>
                          ) : null}

                          {/* Plan Checklist */}
                          {part.nodeType === "plan" && (
                            <View style={styles.planStepsBox}>
                              {(part.meta?.steps ?? []).map((st: PlanStep, idx: number) => (
                                <View key={idx} style={styles.planStepItem}>
                                  {st.status === "done" ? (
                                    <Check size={12} color={COLORS.success} />
                                  ) : st.status === "active" ? (
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                  ) : (
                                    <View style={styles.planStepDot} />
                                  )}
                                  <Text
                                    style={[
                                      styles.planStepText,
                                      font("regular"),
                                      st.status === "done" && styles.planStepDoneText,
                                    ]}
                                  >
                                    {st.text}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* ── Final Output Box in Timeline ── */}
              {finalOutputText ? (
                <View style={styles.finalOutputSection}>
                  <View style={styles.finalOutputHeader}>
                    <View style={styles.finalOutputBadge}>
                      <Sparkles size={13} color={COLORS.primary} />
                      <Text style={[styles.finalOutputBadgeText, font("semibold")]}>
                        Final Agent Response
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCopy("final_output", finalOutputText)}
                      style={styles.copyOutputBtn}
                      activeOpacity={0.7}
                    >
                      {copiedId === "final_output" ? (
                        <Check size={12} color={COLORS.success} />
                      ) : (
                        <Copy size={12} color={COLORS.mutedForeground} />
                      )}
                      <Text style={[styles.copyOutputBtnText, font("medium")]}>
                        {copiedId === "final_output" ? "Copied" : "Copy Output"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.finalOutputCard}>
                    <RichResponse text={finalOutputText} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      ) : (
        /* ── Changes Tab Content ── */
        <ScrollView
          style={styles.changesScroll}
          contentContainerStyle={styles.changesContent}
          showsVerticalScrollIndicator={false}
        >
          {changedFiles.length === 0 ? (
            <View style={styles.emptyWrap}>
              <FileCode size={36} color={COLORS.primary} />
              <Text style={[styles.emptyTitle, font("semibold")]}>No file changes in this turn</Text>
              <Text style={[styles.emptySubtitle, font("regular")]}>
                Files created, modified, or deleted by the agent will be listed here.
              </Text>
            </View>
          ) : (
            <View style={styles.changesList}>
              <Text style={[styles.changesSummaryText, font("semibold")]}>
                {changedFiles.length} file{changedFiles.length === 1 ? "" : "s"} modified
              </Text>

              {changedFiles.map((file, i) => (
                <View key={file.path + i} style={styles.fileCard}>
                  <View style={styles.fileCardHeader}>
                    <View
                      style={[
                        styles.fileKindBadge,
                        file.kind === "create"
                          ? styles.fileKindCreate
                          : file.kind === "delete"
                          ? styles.fileKindDelete
                          : styles.fileKindEdit,
                      ]}
                    >
                      <Text style={[styles.fileKindText, mono("bold")]}>
                        {file.kind || "edit"}
                      </Text>
                    </View>

                    <Text style={[styles.filePathText, mono("medium")]} numberOfLines={1}>
                      {file.path}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Bottom Sticky Live Indicator ── */}
      <View
        style={[
          styles.bottomLiveBar,
          isLive ? styles.bottomLiveBarActive : styles.bottomLiveBarIdle,
        ]}
      >
        <View style={styles.liveBarLeft}>
          <View
            style={[
              styles.liveStatusDot,
              isLive ? styles.liveStatusDotActive : styles.liveStatusDotIdle,
            ]}
          />
          {isLive ? (
            <Shimmer style={[styles.liveStatusText, mono("bold")]}>
              AGENT TURN IN PROGRESS · STREAMING
            </Shimmer>
          ) : (
            <Text style={[styles.idleStatusText, mono("medium")]}>
              {allParts.length > 0 ? "TURN COMPLETED" : "AGENT IDLE"}
            </Text>
          )}
        </View>

        {isLive ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <CheckCircle2 size={15} color={COLORS.success} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  segmentTabTextActive: {
    color: COLORS.primary,
  },
  badgeCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  badgeCountText: {
    color: COLORS.primaryForeground,
    fontSize: 9.5,
  },
  subStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  subStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subStatusText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  turnSwitcherBar: {
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingVertical: 7,
  },
  turnSwitcherContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  turnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  turnPillActive: {
    backgroundColor: "rgba(66, 64, 225, 0.1)",
    borderColor: COLORS.primary,
  },
  turnPillText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  turnPillTextActive: {
    color: COLORS.primary,
  },
  turnPillDur: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  turnPillDurActive: {
    color: COLORS.primary,
  },
  userPromptCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  userPromptLabel: {
    fontSize: 9.5,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  userPromptText: {
    fontSize: 12.5,
    color: COLORS.foreground,
    lineHeight: 18,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingBottom: 50,
  },
  overview: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  overviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewLabel: {
    color: COLORS.primary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  overviewTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    marginTop: 2,
  },
  overviewCount: {
    color: COLORS.primary,
    fontSize: 14,
  },
  overviewTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: COLORS.muted,
  },
  overviewFill: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  overviewStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  overviewStat: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  overviewStatActive: {
    fontSize: 11,
    color: COLORS.primary,
  },
  overviewError: {
    fontSize: 11,
    color: COLORS.destructive,
  },
  treeContainer: {
    position: "relative",
  },
  treeSpine: {
    position: "absolute",
    top: 8,
    bottom: 20,
    left: 14,
    width: 2,
    backgroundColor: COLORS.border,
  },
  treeNodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  singleIconColumn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    zIndex: 2,
  },
  unifiedIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  unifiedIconBoxRunning: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  nodeContentCol: {
    flex: 1,
    paddingLeft: 8,
  },
  nodeHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  nodeHeaderBoxExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: "transparent",
  },
  nodeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 9.5,
    textTransform: "uppercase",
  },
  nodeHeaderTitle: {
    fontSize: 12.5,
    color: COLORS.foreground,
    flex: 1,
  },
  nodeHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDurationText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  statusDotSmall: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeExpandedCard: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    padding: 10,
    gap: 8,
  },
  markdownWrapper: {
    paddingVertical: 2,
  },
  expandedSection: {
    gap: 4,
  },
  expandedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeadingText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    letterSpacing: 0.5,
  },
  copyBtnText: {
    fontSize: 10.5,
    color: COLORS.primary,
  },
  cwdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cwdLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  cwdPath: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  outputBox: {
    backgroundColor: COLORS.codeBg,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
  },
  outputText: {
    fontSize: 11,
    color: COLORS.foreground,
    lineHeight: 16,
  },
  planStepsBox: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  planStepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planStepDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.mutedForeground,
  },
  planStepText: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  planStepDoneText: {
    color: COLORS.mutedForeground,
    textDecorationLine: "line-through",
  },
  finalOutputSection: {
    marginTop: 18,
    gap: 8,
  },
  finalOutputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  finalOutputBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  finalOutputBadgeText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  copyOutputBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  copyOutputBtnText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  finalOutputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bottomLiveBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomLiveBarActive: {
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  bottomLiveBarIdle: {
    backgroundColor: COLORS.card,
  },
  liveBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveStatusDotActive: {
    backgroundColor: COLORS.primary,
  },
  liveStatusDotIdle: {
    backgroundColor: COLORS.success,
  },
  liveStatusText: {
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  idleStatusText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    letterSpacing: 0.4,
  },
  changesScroll: {
    flex: 1,
  },
  changesContent: {
    padding: 16,
    paddingBottom: 40,
  },
  changesList: {
    gap: 10,
  },
  changesSummaryText: {
    fontSize: 13.5,
    color: COLORS.foreground,
    marginBottom: 4,
  },
  fileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  fileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileKindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileKindEdit: {
    backgroundColor: COLORS.accent,
  },
  fileKindCreate: {
    backgroundColor: COLORS.secondary,
  },
  fileKindDelete: {
    backgroundColor: COLORS.muted,
  },
  fileKindText: {
    fontSize: 10,
    color: COLORS.foreground,
    textTransform: "uppercase",
  },
  filePathText: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: COLORS.foreground,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
});
