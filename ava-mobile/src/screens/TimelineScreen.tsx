import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import {
  AlertCircle,
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Copy,
  FileCode,
  FileDiff,
  Info,
  Layers,
  ListChecks,
  MessageSquare,
  User,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useChat } from "@/state/use-chat";
import { useAva } from "@/state/ava-provider";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { InlineText, RichResponse } from "@/components/chat/rich-response";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { RuntimeDottedIndicator } from "@/components/ai-elements/dotted-indicator";
import { TypewriterText } from "@/components/ai-elements/typewriter-text";
import { formatDuration } from "@/components/chat/message-parts";
import type { ChatMessage, MessagePart, PlanStep } from "@/core/types";
import { font, mono } from "@/theme/fonts";
import { displayToolName, getToolIcon, isMcpTool } from "@/components/chat/tool-icons";
import { COLORS, useTheme } from "@/theme/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { isDark } = useTheme();
  const { activeSessionId } = useAva();
  const sessionId = route?.params?.sessionId || activeSessionId || "";
  const targetMessageId = route?.params?.messageId;

  const { messages, status, loadingHistory } = useChat(sessionId);
  const [activeTab, setActiveTab] = useState<"trace" | "files">("trace");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isReversed, setIsReversed] = useState(false);

  const assistantMsgs = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages]
  );

  const [selectedTurnId, setSelectedTurnId] = useState<string | undefined>(targetMessageId);

  useEffect(() => {
    if (targetMessageId) {
      setSelectedTurnId(targetMessageId);
    }
  }, [targetMessageId]);

  // Turn resolution: exact assistant message, stripped prefix, live id, or latest assistant turn
  const targetMessage: ChatMessage | undefined = useMemo(() => {
    const candidateId = selectedTurnId || targetMessageId;

    if (candidateId) {
      const direct = messages.find((m) => m.id === candidateId);
      if (direct) {
        if (direct.role === "assistant") return direct;
        const uIdx = messages.findIndex((m) => m.id === candidateId);
        if (uIdx !== -1) {
          const nextAss = messages.slice(uIdx + 1).find((m) => m.role === "assistant");
          if (nextAss) return nextAss;
        }
      }

      const altId = candidateId.startsWith("a_") ? candidateId.slice(2) : `a_${candidateId}`;
      const altMatch = messages.find((m) => m.id === altId);
      if (altMatch?.role === "assistant") return altMatch;

      const prefixMatch = messages.find(
        (m) =>
          m.role === "assistant" &&
          (m.id.includes(candidateId) || candidateId.includes(m.id.replace(/^a_/, "")))
      );
      if (prefixMatch) return prefixMatch;
    }

    if (assistantMsgs.length > 0) {
      return assistantMsgs[assistantMsgs.length - 1];
    }

    return undefined;
  }, [selectedTurnId, targetMessageId, messages, assistantMsgs]);

  const handleBack = useCallback(() => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else if (sessionId) {
      navigation?.navigate("Main", {
        screen: "Session",
        params: {
          sessionId,
          scrollToMessageId: targetMessage?.id || targetMessageId,
        },
      });
    } else {
      navigation?.navigate("Main", { screen: "Chat" });
    }
  }, [navigation, sessionId, targetMessage?.id, targetMessageId]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const padding = 100;
    const isBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - padding;
    isNearBottomRef.current = isBottom;
    setShowScrollBottomBtn(!isBottom && contentOffset.y > 150);
  }, []);

  const scrollToLatest = () => {
    isNearBottomRef.current = true;
    if (isReversed) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
    setShowScrollBottomBtn(false);
  };

  const toggleNode = (nodeId: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Extract user prompt for this specific turn
  const userPromptText = useMemo(() => {
    if (!targetMessage) return null;
    const idx = messages.findIndex((m) => m.id === targetMessage.id);
    if (idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          const userText = messages[i]?.parts?.find((p) => p.kind === "text")?.text;
          if (userText) return userText;
        }
      }
    }
    return null;
  }, [messages, targetMessage]);

  // Structured events for this turn
  const { allParts, finalOutputText, totalDuration, totalTokens, changedFiles } = useMemo(() => {
    const parts: (MessagePart & {
      turnId: string;
      nodeType: "thought" | "decision" | "tool" | "plan" | "notice" | "text";
      hasExpandableContent: boolean;
    })[] = [];
    let dur = 0;
    let tokens = 0;
    let finalOutput = "";
    const filesMap = new Map<string, { path: string; kind: string; tool?: string }>();

    const targetList = targetMessage
      ? [targetMessage]
      : assistantMsgs.length > 0
      ? [assistantMsgs[assistantMsgs.length - 1]!]
      : [];

    for (const msg of targetList) {
      if (msg.stats?.durationMs) dur += msg.stats.durationMs;
      if (msg.stats?.totalTokens) tokens += msg.stats.totalTokens;

      const textParts = msg.parts.filter(
        (p) => p.kind === "text" && (p.text?.trim() || p.status === "running")
      );
      const lastTextPart = textParts.length > 0 ? textParts[textParts.length - 1] : null;

      for (let pIdx = 0; pIdx < msg.parts.length; pIdx++) {
        const part = msg.parts[pIdx]!;
        if (part.kind === "text") {
          const rawText = part.text || "";
          if (rawText.trim()) {
            finalOutput = rawText.trim();
          }

          const isLastText = part === lastTextPart;
          const isStreaming =
            part.status === "running" || status === "submitted" || status === "streaming";

          if (!isLastText || isStreaming) {
            parts.push({
              ...part,
              turnId: msg.id,
              nodeType: "text",
              hasExpandableContent: false, // directly shown, no collapse
            });
          }
          continue;
        }

        if (part.kind === "reasoning") {
          const rawText = part.text || "";
          const isDecision =
            rawText.toLowerCase().includes("decision:") ||
            rawText.toLowerCase().includes("i will ") ||
            rawText.toLowerCase().includes("selected strategy") ||
            rawText.toLowerCase().includes("approach:");

          const hasLongReasoning = rawText.length > 120 || rawText.includes("\n");

          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: isDecision ? "decision" : "thought",
            hasExpandableContent: hasLongReasoning,
          });
          continue;
        }

        if (part.kind === "tool") {
          const hasInput = !!(part.input || part.meta?.command);
          const hasOutput = !!part.output;
          const hasMedia = !!part.meta?.media?.length;
          const hasExpandable = hasInput || hasOutput || hasMedia;

          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: "tool",
            hasExpandableContent: hasExpandable,
          });

          if (part.meta?.files) {
            for (const f of part.meta.files) {
              filesMap.set(f.path, { path: f.path, kind: f.kind, tool: part.toolName });
            }
          }
          continue;
        }

        if (part.kind === "plan") {
          const hasSteps = (part.meta?.steps?.length ?? 0) > 0;
          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: "plan",
            hasExpandableContent: hasSteps,
          });
          continue;
        }

        if (part.kind === "notice") {
          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: "notice",
            hasExpandableContent: false,
          });
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
  }, [targetMessage, assistantMsgs, status]);

  const isLive = status === "submitted" || status === "streaming";
  const latestAssistantId = assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1]?.id : null;
  const isTargetTurnActive = isLive && (
    !targetMessage || targetMessage.id === latestAssistantId
  );
  const durationText = formatDuration(totalDuration);
  const errorCount = allParts.filter((part) => part.status === "error").length;

  const activeRunningPart = useMemo(() => {
    if (!isTargetTurnActive) return null;
    return (
      allParts.find((p) => p.status === "running") ||
      (allParts.length > 0 ? allParts[allParts.length - 1] : null)
    );
  }, [allParts, isTargetTurnActive]);

  // Auto-scroll throttled during active streaming
  const lastScrollTimeRef = useRef(0);
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    if (isTargetTurnActive) {
      const now = Date.now();
      if (now - lastScrollTimeRef.current > 160) {
        lastScrollTimeRef.current = now;
        if (isReversed) {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        } else {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }
      }
    } else {
      requestAnimationFrame(() => {
        if (isReversed) {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      });
    }
  }, [allParts.length, isTargetTurnActive, isReversed]);

  // Swipe Left to Right (swiping rightwards) -> Back to Session/Chat screen
  const onHandlerStateChange = useCallback(
    (e: any) => {
      if (e.nativeEvent.state === 5) {
        const { translationX, velocityX, translationY } = e.nativeEvent;
        if (
          translationX > 70 &&
          (velocityX > 150 || translationX > 110) &&
          Math.abs(translationY) < 75
        ) {
          handleBack();
        }
      }
    },
    [handleBack]
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={COLORS.background}
      />

      {/* ── Minimal Header Bar (Placed OUTSIDE PanGestureHandler so touches are 100% responsive) ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color={COLORS.foreground} />
        </TouchableOpacity>

        {/* Segment Toggle */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "trace" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("trace")}
            activeOpacity={0.7}
          >
            <Layers
              size={13}
              color={activeTab === "trace" ? COLORS.foreground : COLORS.mutedForeground}
            />
            <Text style={[styles.segmentText, activeTab === "trace" && styles.segmentTextActive]}>
              Timeline
            </Text>
            {allParts.length > 0 && (
              <View style={[styles.pillBadge, activeTab === "trace" && styles.pillBadgeActive]}>
                <Text style={[styles.pillBadgeText, mono("medium")]}>{allParts.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "files" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("files")}
            activeOpacity={0.7}
          >
            <FileDiff
              size={13}
              color={activeTab === "files" ? COLORS.foreground : COLORS.mutedForeground}
            />
            <Text style={[styles.segmentText, activeTab === "files" && styles.segmentTextActive]}>
              Changes
            </Text>
            {changedFiles.length > 0 && (
              <View style={[styles.pillBadge, activeTab === "files" && styles.pillBadgeActive]}>
                <Text style={[styles.pillBadgeText, mono("medium")]}>{changedFiles.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── Body Wrapped with Gesture Handler for Smooth Left-to-Right Swipe Back ── */}
      <PanGestureHandler onHandlerStateChange={onHandlerStateChange} activeOffsetX={[0, 45]} failOffsetY={[-20, 20]}>
        <Animated.View style={{ flex: 1 }}>
          {/* ── Multi-Turn Switcher (Minimal horizontal pills) ── */}
          {assistantMsgs.length > 1 && (
            <View style={styles.turnBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.turnScrollContent}
              >
                {assistantMsgs.map((assMsg, idx) => {
                  const isSelected = targetMessage?.id === assMsg.id;
                  const turnDur = assMsg.stats?.durationMs
                    ? formatDuration(assMsg.stats.durationMs)
                    : null;
                  return (
                    <TouchableOpacity
                      key={`turn_${assMsg.id}_${idx}`}
                      style={[styles.turnCapsule, isSelected && styles.turnCapsuleActive]}
                      onPress={() => setSelectedTurnId(assMsg.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.turnCapsuleText,
                          font("medium"),
                          isSelected && styles.turnCapsuleTextActive,
                        ]}
                      >
                        {`Turn ${idx + 1}`}
                      </Text>
                      {turnDur && (
                        <Text
                          style={[
                            styles.turnCapsuleMeta,
                            mono("regular"),
                            isSelected && styles.turnCapsuleMetaActive,
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

          {/* ── Stats Strip ── */}
          {activeTab === "trace" && allParts.length > 0 && (
            <View style={styles.statsStrip}>
              <View style={styles.statItem}>
                <Clock size={12} color={COLORS.mutedForeground} />
                <Text style={[styles.statValue, font("regular")]}>
                  {isLive ? "Working…" : `${durationText || "0s"}`}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Coins size={12} color={COLORS.mutedForeground} />
                <Text style={[styles.statValue, font("regular")]}>
                  {totalTokens > 0
                    ? `${(totalTokens / 1000).toFixed(1)}k tokens`
                    : `${allParts.length} steps`}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.statItem}>
                <CheckCircle2
                  size={12}
                  color={errorCount > 0 ? COLORS.destructive : COLORS.success}
                />
                <Text
                  style={[
                    styles.statValue,
                    font("medium"),
                    { color: errorCount > 0 ? COLORS.destructive : COLORS.success },
                  ]}
                >
                  {isLive ? "Live" : errorCount > 0 ? `${errorCount} failed` : "Done"}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sortToggleBtn, isReversed && styles.sortToggleBtnActive]}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  }
                  setIsReversed((prev) => !prev);
                }}
                activeOpacity={0.7}
              >
                <ArrowUpDown
                  size={11}
                  color={isReversed ? COLORS.primary : COLORS.mutedForeground}
                />
                <Text
                  style={[
                    styles.sortToggleText,
                    mono("medium"),
                    isReversed && { color: COLORS.primary },
                  ]}
                >
                  {isReversed ? "Newest" : "Oldest"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Main Scroll Area ── */}
          {activeTab === "trace" ? (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.mainScroll}
                contentContainerStyle={styles.mainScrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={32}
              >
                {/* User Prompt Context (Minimal header preview) */}
                {userPromptText ? (
                  <View style={styles.promptCard}>
                    <View style={styles.promptHeader}>
                      <User size={11} color={COLORS.mutedForeground} />
                      <Text style={[styles.promptLabel, mono("medium")]}>USER PROMPT</Text>
                    </View>
                    <Text style={[styles.promptBody, font("regular")]} numberOfLines={2}>
                      {userPromptText}
                    </Text>
                  </View>
                ) : null}

                {loadingHistory ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 10 }} />
                    <Text style={[styles.emptyTitle, font("medium")]}>Loading timeline…</Text>
                  </View>
                ) : allParts.length === 0 && !finalOutputText ? (
                  <View style={styles.emptyState}>
                    {isTargetTurnActive ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                          style={{ marginBottom: 10 }}
                        />
                        <Text style={[styles.emptyTitle, font("medium")]}>
                          Agent is processing…
                        </Text>
                        <Text style={[styles.emptySub, font("regular")]}>
                          Actions and commands will stream here in real time.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Brain size={26} color={COLORS.mutedForeground} />
                        <Text style={[styles.emptyTitle, font("medium")]}>No trace events</Text>
                        <Text style={[styles.emptySub, font("regular")]}>
                          Workflow steps for this turn will appear here.
                        </Text>
                      </>
                    )}
                  </View>
                ) : (
                  <>
                    {/* Minimal Timeline Spine & Nodes */}
                    {allParts.length > 0 && (
                      <View style={styles.timelineWrapper}>
                        <View style={styles.timelineSpine} />

                        {(isReversed ? [...allParts].reverse() : allParts).map((part, index) => {
                          const isRunning = isTargetTurnActive && part.status === "running";
                          const isExpanded =
                            expandedNodes[part.id] !== undefined
                              ? !!expandedNodes[part.id]
                              : isRunning;
                          const isError =
                            part.status === "error" ||
                            (part.meta?.exitCode != null && part.meta.exitCode !== 0);

                          let NodeIcon: LucideIcon = Wrench;
                          let iconColor: string = COLORS.mutedForeground;
                          let nodeCategory = "TOOL";
                          let title = "";

                          if (part.nodeType === "thought") {
                            NodeIcon = Brain;
                            iconColor = "#8B5CF6";
                            nodeCategory = "THOUGHT";
                            title = isRunning
                              ? "Thinking…"
                              : part.meta?.durationMs
                              ? `Thought for ${formatDuration(part.meta.durationMs)}`
                              : "Thought";
                          } else if (part.nodeType === "decision") {
                            NodeIcon = Compass;
                            iconColor = "#0EA5E9";
                            nodeCategory = "DECISION";
                            title = "Strategy Selection";
                          } else if (part.nodeType === "tool") {
                            const isMcp = isMcpTool(part.toolName, part.meta);
                            NodeIcon = getToolIcon(part.toolName, part.meta);
                            if (isMcp) {
                              iconColor = "#10B981";
                              nodeCategory = "MCP";
                              title = displayToolName(part.toolName || "MCP Tool");
                            } else {
                              iconColor = COLORS.primary;
                              nodeCategory = "TOOL";
                              title = displayToolName(part.toolName || "command");
                            }
                          } else if (part.nodeType === "plan") {
                            NodeIcon = ListChecks;
                            iconColor = "#059669";
                            nodeCategory = "PLAN";
                            title = part.text || "Execution Plan";
                          } else if (part.nodeType === "notice") {
                            NodeIcon = isError ? AlertCircle : Info;
                            iconColor = isError ? COLORS.destructive : "#F59E0B";
                            nodeCategory = "NOTICE";
                            title = part.text || "System Notice";
                          } else if (part.nodeType === "text") {
                            NodeIcon = AlignLeft;
                            iconColor = COLORS.mutedForeground;
                            nodeCategory = "RESPONSE";
                            title = isRunning ? "Streaming…" : "Response";
                          }

                          const commandString =
                            part.meta?.command ||
                            (typeof part.input === "string"
                              ? part.input
                              : part.input
                              ? JSON.stringify(part.input, null, 2)
                              : "");

                          const compositeKey = `${part.id || "part"}_${index}`;

                          // Directly render text responses without collapsible accordion
                          if (part.nodeType === "text") {
                            return (
                              <View key={compositeKey} style={styles.nodeRow}>
                                <View style={styles.nodeSpineCol}>
                                  <View
                                    style={[
                                      styles.nodeBullet,
                                      {
                                        borderColor: isRunning ? COLORS.primary : COLORS.border,
                                      },
                                    ]}
                                  >
                                    <NodeIcon
                                      size={11}
                                      color={
                                        isRunning ? COLORS.primary : COLORS.mutedForeground
                                      }
                                    />
                                  </View>
                                </View>
                                <View style={styles.nodeBodyCol}>
                                  <View style={styles.textDirectCard}>
                                    <View style={styles.textDirectHeader}>
                                      <Text style={[styles.textDirectLabel, mono("medium")]}>
                                        {isRunning ? "STREAMING RESPONSE" : "RESPONSE"}
                                      </Text>
                                      {part.text ? (
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleCopy(part.id + "-text", part.text || "")
                                          }
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                          <Text style={[styles.blockCopy, mono("medium")]}>
                                            {copiedId === part.id + "-text" ? "Copied" : "Copy"}
                                          </Text>
                                        </TouchableOpacity>
                                      ) : null}
                                    </View>
                                    {part.text ? (
                                      isRunning ? (
                                        <TypewriterText text={part.text} isStreaming={true} />
                                      ) : (
                                        <RichResponse text={part.text} />
                                      )
                                    ) : isRunning ? (
                                      <Shimmer
                                        style={[
                                          styles.streamingTextPlaceholder,
                                          font("regular"),
                                        ]}
                                      >
                                        Generating response…
                                      </Shimmer>
                                    ) : null}
                                  </View>
                                </View>
                              </View>
                            );
                          }

                          // Non-expandable simple events
                          if (!part.hasExpandableContent) {
                            return (
                              <View key={compositeKey} style={styles.nodeRow}>
                                <View style={styles.nodeSpineCol}>
                                  <View
                                    style={[
                                      styles.nodeBullet,
                                      { borderColor: isRunning ? iconColor : COLORS.border },
                                    ]}
                                  >
                                    <NodeIcon size={11} color={iconColor} />
                                  </View>
                                </View>
                                <View style={styles.nodeBodyCol}>
                                  <View style={styles.nodeHeaderSimple}>
                                    <Text
                                      style={[
                                        styles.nodeCategory,
                                        mono("bold"),
                                        { color: iconColor },
                                      ]}
                                    >
                                      {nodeCategory}
                                    </Text>
                                    <Text
                                      style={[styles.nodeTitle, font("regular")]}
                                      numberOfLines={2}
                                    >
                                      {part.text || title}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          }

                          // Expandable events (tools, commands, plans) with clean minimal rows
                          return (
                            <View key={compositeKey} style={styles.nodeRow}>
                              <View style={styles.nodeSpineCol}>
                                <View
                                  style={[
                                    styles.nodeBullet,
                                    { borderColor: isRunning ? iconColor : COLORS.border },
                                  ]}
                                >
                                  <NodeIcon size={11} color={iconColor} />
                                </View>
                              </View>

                              <View style={styles.nodeBodyCol}>
                                <TouchableOpacity
                                  style={[
                                    styles.nodeHeader,
                                    isExpanded && styles.nodeHeaderExpanded,
                                  ]}
                                  onPress={() => toggleNode(part.id)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.nodeHeaderMain}>
                                    <Text
                                      style={[
                                        styles.nodeCategory,
                                        mono("bold"),
                                        { color: iconColor },
                                      ]}
                                    >
                                      {nodeCategory}
                                    </Text>
                                    {part.nodeType === "tool" ? (
                                      <View style={styles.toolChip}>
                                        <Text
                                          style={[styles.toolChipText, mono("medium")]}
                                          numberOfLines={1}
                                        >
                                          {title}
                                        </Text>
                                      </View>
                                    ) : (
                                      <Text
                                        style={[styles.nodeTitle, font("medium")]}
                                        numberOfLines={1}
                                      >
                                        {title}
                                      </Text>
                                    )}
                                  </View>

                                  <View style={styles.nodeHeaderMeta}>
                                    {part.meta?.durationMs != null && (
                                      <Text style={[styles.nodeDurText, mono("regular")]}>
                                        {formatDuration(part.meta.durationMs)}
                                      </Text>
                                    )}
                                    <ChevronRight
                                      size={13}
                                      color={COLORS.mutedForeground}
                                      style={{
                                        transform: [
                                          { rotate: isExpanded ? "90deg" : "0deg" },
                                        ],
                                      }}
                                    />
                                  </View>
                                </TouchableOpacity>

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <View style={styles.nodeContent}>
                                    {/* Reasoning Text */}
                                    {part.nodeType === "thought" ||
                                    part.nodeType === "decision" ? (
                                      <View style={styles.textWrapper}>
                                        <RichResponse text={part.text || ""} />
                                      </View>
                                    ) : null}

                                    {/* Command / Input */}
                                    {part.nodeType === "tool" && commandString ? (
                                      <View style={styles.blockContainer}>
                                        <View style={styles.blockHeader}>
                                          <Text style={[styles.blockLabel, mono("medium")]}>
                                            {part.toolName || "input"}
                                          </Text>
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleCopy(part.id + "-cmd", commandString)
                                            }
                                            hitSlop={{
                                              top: 8,
                                              bottom: 8,
                                              left: 8,
                                              right: 8,
                                            }}
                                          >
                                            <Text style={[styles.blockCopy, mono("medium")]}>
                                              {copiedId === part.id + "-cmd"
                                                ? "Copied"
                                                : "Copy"}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                        <CodeBlock
                                          code={commandString}
                                          language={
                                            commandString.trim().startsWith("{") ||
                                            commandString.trim().startsWith("[")
                                              ? "json"
                                              : "bash"
                                          }
                                          showLineNumbers={
                                            commandString.split("\n").length > 3
                                          }
                                        />
                                      </View>
                                    ) : null}

                                    {/* Working Directory */}
                                    {part.meta?.cwd ? (
                                      <View style={styles.cwdBox}>
                                        <Text
                                          style={[styles.cwdText, mono("regular")]}
                                          numberOfLines={1}
                                        >
                                          cwd: {part.meta.cwd}
                                        </Text>
                                      </View>
                                    ) : null}

                                    {/* Media Previews */}
                                    {part.nodeType === "tool" &&
                                    part.meta?.media?.length ? (
                                      <View style={styles.blockContainer}>
                                        {part.meta.media
                                          .filter((m) => m.type === "image")
                                          .map((m, mIdx) => (
                                            <Image
                                              key={`media_${mIdx}`}
                                              source={{ uri: m.url }}
                                              style={styles.previewImage}
                                              resizeMode="contain"
                                            />
                                          ))}
                                      </View>
                                    ) : null}

                                    {/* Tool Output */}
                                    {part.nodeType === "tool" && part.output ? (
                                      <View style={styles.blockContainer}>
                                        <View style={styles.blockHeader}>
                                          <View
                                            style={{
                                              flexDirection: "row",
                                              alignItems: "center",
                                              gap: 6,
                                            }}
                                          >
                                            <Text style={[styles.blockLabel, mono("medium")]}>
                                              output
                                            </Text>
                                            {part.meta?.exitCode != null && (
                                              <Text
                                                style={[
                                                  styles.exitTag,
                                                  mono("medium"),
                                                  {
                                                    color:
                                                      part.meta.exitCode === 0
                                                        ? COLORS.success
                                                        : COLORS.destructive,
                                                  },
                                                ]}
                                              >
                                                (exit {part.meta.exitCode})
                                              </Text>
                                            )}
                                          </View>
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleCopy(part.id + "-out", part.output || "")
                                            }
                                            hitSlop={{
                                              top: 8,
                                              bottom: 8,
                                              left: 8,
                                              right: 8,
                                            }}
                                          >
                                            <Text style={[styles.blockCopy, mono("medium")]}>
                                              {copiedId === part.id + "-out"
                                                ? "Copied"
                                                : "Copy"}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                        <CodeBlock
                                          code={part.output.trim()}
                                          language={
                                            part.output.trim().startsWith("{") ||
                                            part.output.trim().startsWith("[")
                                              ? "json"
                                              : "text"
                                          }
                                          showLineNumbers={
                                            part.output.split("\n").length > 2
                                          }
                                        />
                                      </View>
                                    ) : null}

                                    {/* Plan Steps */}
                                    {part.nodeType === "plan" && (
                                      <View style={styles.planBox}>
                                        {(part.meta?.steps ?? []).map(
                                          (st: PlanStep, sIdx: number) => (
                                            <View
                                              key={`step_${sIdx}`}
                                              style={styles.planRow}
                                            >
                                              {st.status === "done" ? (
                                                <Check size={11} color={COLORS.success} />
                                              ) : st.status === "active" ? (
                                                <ActivityIndicator
                                                  size={9}
                                                  color={COLORS.primary}
                                                />
                                              ) : st.status === "cancelled" ? (
                                                <X
                                                  size={11}
                                                  color={COLORS.mutedForeground}
                                                />
                                              ) : (
                                                <View style={styles.planDot} />
                                              )}
                                              <View style={{ flex: 1 }}>
                                                <InlineText
                                                  text={st.text}
                                                  style={[
                                                    styles.planText,
                                                    (st.status === "done" ||
                                                      st.status === "cancelled") &&
                                                      styles.planTextDone,
                                                  ]}
                                                />
                                              </View>
                                            </View>
                                          )
                                        )}
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* ── Direct Output Card ── */}
                    {finalOutputText ? (
                      <View style={styles.outputBox}>
                        <View style={styles.outputHeader}>
                          <View style={styles.outputTitleRow}>
                            <MessageSquare size={13} color={COLORS.mutedForeground} />
                            <Text style={[styles.outputTitle, font("medium")]}>Response</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleCopy("final_output", finalOutputText)}
                            style={styles.outputCopyBtn}
                            activeOpacity={0.7}
                          >
                            {copiedId === "final_output" ? (
                              <Check size={11} color={COLORS.success} />
                            ) : (
                              <Copy size={11} color={COLORS.mutedForeground} />
                            )}
                            <Text style={[styles.outputCopyText, mono("medium")]}>
                              {copiedId === "final_output" ? "Copied" : "Copy"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.outputCard}>
                          <RichResponse text={finalOutputText} />
                        </View>
                      </View>
                    ) : null}
                  </>
                )}
              </ScrollView>

              {showScrollBottomBtn && (
                <TouchableOpacity
                  style={styles.floatingScrollBtn}
                  onPress={scrollToLatest}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Scroll to latest event"
                >
                  <ArrowDown size={14} color="#FFF" />
                  <Text style={[styles.floatingScrollText, mono("bold")]}>
                    {isReversed ? "Top" : "Latest"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* ── Files Tab ── */
            <ScrollView
              style={styles.mainScroll}
              contentContainerStyle={styles.mainScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {changedFiles.length === 0 ? (
                <View style={styles.emptyState}>
                  <FileCode size={26} color={COLORS.mutedForeground} />
                  <Text style={[styles.emptyTitle, font("medium")]}>No modified files</Text>
                  <Text style={[styles.emptySub, font("regular")]}>
                    Files created or modified during this turn will appear here.
                  </Text>
                </View>
              ) : (
                <View style={styles.filesList}>
                  <Text style={[styles.filesCountLabel, mono("medium")]}>
                    {changedFiles.length} FILE{changedFiles.length === 1 ? "" : "S"} TOUCHED
                  </Text>

                  {changedFiles.map((file, fIdx) => (
                    <TouchableOpacity
                      key={`file_${file.path}_${fIdx}`}
                      style={styles.fileItemCard}
                      onPress={() => {
                        navigation?.navigate("Main", {
                          screen: "Files",
                          params: { path: file.path },
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.fileTag,
                          file.kind === "create"
                            ? styles.fileTagCreate
                            : file.kind === "delete"
                            ? styles.fileTagDelete
                            : styles.fileTagEdit,
                        ]}
                      >
                        <Text
                          style={[
                            styles.fileTagText,
                            mono("bold"),
                            {
                              color:
                                file.kind === "create"
                                  ? COLORS.success
                                  : file.kind === "delete"
                                  ? COLORS.destructive
                                  : COLORS.primary,
                            },
                          ]}
                        >
                          {file.kind === "create" ? "NEW" : file.kind === "delete" ? "DEL" : "MOD"}
                        </Text>
                      </View>

                      <Text style={[styles.filePathLabel, mono("regular")]} numberOfLines={1}>
                        {file.path}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleCopy(`file_${fIdx}`, file.path)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {copiedId === `file_${fIdx}` ? (
                          <Check size={13} color={COLORS.success} />
                        ) : (
                          <Copy size={13} color={COLORS.mutedForeground} />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* ── Minimal Bottom Live Status Bar ── */}
          {isTargetTurnActive && (
            <View style={styles.liveFooter}>
              <View style={styles.liveFooterDot} />
              <Shimmer style={[styles.liveFooterText, mono("medium")]}>
                Agent execution in progress…
              </Shimmer>
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginLeft: "auto" }}
              />
            </View>
          )}
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  segmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.secondary,
  },
  segmentText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  segmentTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  pillBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.muted,
  },
  pillBadgeActive: {
    backgroundColor: COLORS.border,
  },
  pillBadgeText: {
    fontSize: 10,
    color: COLORS.foreground,
  },
  turnBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  turnScrollContent: {
    gap: 8,
  },
  turnCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  turnCapsuleActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  turnCapsuleText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  turnCapsuleTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  turnCapsuleMeta: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  turnCapsuleMetaActive: {
    color: COLORS.primary,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  sortToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortToggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  sortToggleText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  promptCard: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  promptLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: COLORS.mutedForeground,
  },
  promptBody: {
    fontSize: 12.5,
    color: COLORS.foreground,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  timelineWrapper: {
    position: "relative",
    paddingLeft: 12,
  },
  timelineSpine: {
    position: "absolute",
    left: 22,
    top: 10,
    bottom: 10,
    width: 1.5,
    backgroundColor: COLORS.border,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  nodeSpineCol: {
    width: 22,
    alignItems: "center",
    marginRight: 10,
    paddingTop: 4,
  },
  nodeBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeBodyCol: {
    flex: 1,
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nodeHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  nodeHeaderSimple: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  nodeHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  nodeCategory: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  toolChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  toolChipText: {
    fontSize: 11,
    color: COLORS.foreground,
  },
  nodeTitle: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  nodeHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nodeDurText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  nodeContent: {
    padding: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 8,
  },
  textWrapper: {
    paddingVertical: 4,
  },
  blockContainer: {
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.secondary,
  },
  blockLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  blockCopy: {
    fontSize: 10,
    color: COLORS.primary,
  },
  exitTag: {
    fontSize: 9.5,
  },
  cwdBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  cwdText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 6,
  },
  planBox: {
    gap: 6,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.mutedForeground,
  },
  planText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  planTextDone: {
    color: COLORS.mutedForeground,
    textDecorationLine: "line-through",
  },
  textDirectCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textDirectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  textDirectLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: COLORS.mutedForeground,
  },
  streamingTextPlaceholder: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  outputBox: {
    marginTop: 8,
    gap: 6,
  },
  outputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  outputTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  outputTitle: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  outputCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  outputCopyText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  outputCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floatingScrollBtn: {
    position: "absolute",
    bottom: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 99,
  },
  floatingScrollText: {
    fontSize: 11,
    color: "#FFF",
  },
  filesList: {
    gap: 8,
  },
  filesCountLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.mutedForeground,
    marginBottom: 4,
  },
  fileItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileTagCreate: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  fileTagEdit: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
  },
  fileTagDelete: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  fileTagText: {
    fontSize: 9.5,
  },
  filePathLabel: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  liveFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  liveFooterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  liveFooterText: {
    fontSize: 11,
    color: COLORS.primary,
  },
});
