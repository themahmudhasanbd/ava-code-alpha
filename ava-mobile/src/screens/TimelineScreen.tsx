import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  FileCode,
  FileDiff,
  Layers,
  ListChecks,
  MessageSquare,
  User,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useChat } from "@/state/use-chat";
import { useAva } from "@/state/ava-provider";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { InlineText, RichResponse } from "@/components/chat/rich-response";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { formatDuration } from "@/components/chat/message-parts";
import type { ChatMessage, MessagePart, PlanStep } from "@/core/types";
import { font, mono } from "@/theme/fonts";
import { displayToolName, getToolIcon } from "@/components/chat/tool-icons";
import { useTheme } from "@/theme/colors";

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
  const { colors, isDark } = useTheme();
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

      for (let pIdx = 0; pIdx < msg.parts.length; pIdx++) {
        const part = msg.parts[pIdx]!;
        if (part.kind === "text") {
          const rawText = part.text || "";
          if (rawText.trim()) {
            finalOutput = rawText.trim();
          }

          parts.push({
            ...part,
            turnId: msg.id,
            nodeType: "text",
            hasExpandableContent: false,
          });
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

  // Swipe Left to Right -> Back to Session/Chat screen
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
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* ── Minimal Header Bar ── */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.headerBackBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color={colors.foreground} />
        </TouchableOpacity>

        {/* Segment Toggle */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "trace" && { backgroundColor: colors.secondary }]}
            onPress={() => setActiveTab("trace")}
            activeOpacity={0.7}
          >
            <Layers
              size={13}
              color={activeTab === "trace" ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segmentText,
                font("medium"),
                { color: activeTab === "trace" ? colors.foreground : colors.mutedForeground },
                activeTab === "trace" && { fontWeight: "700" },
              ]}
            >
              Timeline
            </Text>
            {allParts.length > 0 && (
              <View
                style={[
                  styles.pillBadge,
                  { backgroundColor: activeTab === "trace" ? colors.border : colors.muted },
                ]}
              >
                <Text style={[styles.pillBadgeText, mono("medium"), { color: colors.foreground }]}>
                  {allParts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "files" && { backgroundColor: colors.secondary }]}
            onPress={() => setActiveTab("files")}
            activeOpacity={0.7}
          >
            <FileDiff
              size={13}
              color={activeTab === "files" ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segmentText,
                font("medium"),
                { color: activeTab === "files" ? colors.foreground : colors.mutedForeground },
                activeTab === "files" && { fontWeight: "700" },
              ]}
            >
              Changes
            </Text>
            {changedFiles.length > 0 && (
              <View
                style={[
                  styles.pillBadge,
                  { backgroundColor: activeTab === "files" ? colors.border : colors.muted },
                ]}
              >
                <Text style={[styles.pillBadgeText, mono("medium"), { color: colors.foreground }]}>
                  {changedFiles.length}
                </Text>
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
            <View style={[styles.turnBar, { borderBottomColor: colors.border }]}>
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
                      style={[
                        styles.turnCapsule,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        isSelected && {
                          backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(79, 70, 229, 0.08)",
                        },
                      ]}
                      onPress={() => setSelectedTurnId(assMsg.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.turnCapsuleText,
                          font("medium"),
                          { color: isSelected ? colors.primary : colors.mutedForeground },
                          isSelected && { fontWeight: "700" },
                        ]}
                      >
                        {`Turn ${idx + 1}`}
                      </Text>
                      {turnDur && (
                        <Text
                          style={[
                            styles.turnCapsuleMeta,
                            mono("regular"),
                            { color: isSelected ? colors.primary : colors.mutedForeground },
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
            <View
              style={[
                styles.statsStrip,
                {
                  backgroundColor: colors.card,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.statItem}>
                <Clock size={12} color={colors.mutedForeground} />
                <Text style={[styles.statValue, font("regular"), { color: colors.mutedForeground }]}>
                  {isLive ? "Working…" : `${durationText || "0s"}`}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Coins size={12} color={colors.mutedForeground} />
                <Text style={[styles.statValue, font("regular"), { color: colors.mutedForeground }]}>
                  {totalTokens > 0
                    ? `${(totalTokens / 1000).toFixed(1)}k tokens`
                    : `${allParts.length} steps`}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.statItem}>
                <CheckCircle2
                  size={12}
                  color={colors.success}
                />
                <Text
                  style={[
                    styles.statValue,
                    font("medium"),
                    { color: colors.success },
                  ]}
                >
                  {isLive ? "Live" : "Done"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sortToggleBtn,
                  {
                    borderColor: isReversed ? colors.primary : colors.border,
                    backgroundColor: isReversed
                      ? (isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(79, 70, 229, 0.08)")
                      : "transparent",
                  },
                ]}
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
                  color={isReversed ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.sortToggleText,
                    mono("medium"),
                    { color: isReversed ? colors.primary : colors.mutedForeground },
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
                  <View
                    style={[
                      styles.promptCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.promptHeader}>
                      <User size={11} color={colors.mutedForeground} />
                      <Text style={[styles.promptLabel, font("semibold"), { color: colors.mutedForeground }]}>
                        PROMPT
                      </Text>
                    </View>
                    <Text
                      style={[styles.promptBody, font("regular"), { color: colors.foreground }]}
                      numberOfLines={3}
                    >
                      {userPromptText}
                    </Text>
                  </View>
                ) : null}

                {/* Main Events List */}
                {allParts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Layers size={28} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, font("medium"), { color: colors.foreground }]}>
                      {loadingHistory ? "Loading timeline…" : "No execution events"}
                    </Text>
                    <Text style={[styles.emptySub, font("regular"), { color: colors.mutedForeground }]}>
                      {isLive
                        ? "Waiting for agent to begin execution steps…"
                        : "Tool calls, thoughts, and outputs for this turn will appear here."}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Execution Timeline Tree */}
                    {allParts.length > 0 && (
                      <View style={styles.timelineWrapper}>
                        {/* Continuous spine line */}
                        <View style={[styles.timelineSpine, { backgroundColor: colors.border }]} />

                        {(isReversed ? [...allParts].reverse() : allParts).map((part, pIdx) => {
                          const isExpanded = !!expandedNodes[part.id];
                          const isErr = part.status === "error";
                          const isRunning = part.status === "running";

                          // Direct text response node in timeline sequence
                          if (part.nodeType === "text") {
                            if (!part.text && !isRunning) return null;

                            return (
                              <View key={`node_${part.id}_${pIdx}`} style={styles.nodeRow}>
                                {/* Left Spine Bullet */}
                                <View style={styles.nodeSpineCol}>
                                  <View
                                    style={[
                                      styles.nodeBullet,
                                      {
                                        backgroundColor: colors.card,
                                        borderColor: isRunning ? colors.primary : colors.border,
                                      },
                                    ]}
                                  >
                                    {isRunning ? (
                                      <ActivityIndicator size={10} color={colors.primary} />
                                    ) : (
                                      <MessageSquare size={11} color={colors.primary} />
                                    )}
                                  </View>
                                </View>

                                {/* Right Content Box for Text Node */}
                                <View style={styles.nodeBodyCol}>
                                  <View
                                    style={[
                                      styles.outputCard,
                                      {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                      },
                                    ]}
                                  >
                                    <View style={styles.outputTopRow}>
                                      {isRunning ? (
                                        <View style={styles.streamingIndicator}>
                                          <ActivityIndicator size={9} color={colors.primary} />
                                          <Text
                                            style={[
                                              styles.streamingText,
                                              mono("medium"),
                                              { color: colors.primary },
                                            ]}
                                          >
                                            streaming
                                          </Text>
                                        </View>
                                      ) : <View style={{ flex: 1 }} />}

                                      {part.text ? (
                                        <TouchableOpacity
                                          onPress={() => handleCopy(`text_${part.id}`, part.text!)}
                                          style={styles.outputCopyBtn}
                                          activeOpacity={0.7}
                                        >
                                          {copiedId === `text_${part.id}` ? (
                                            <Check size={11} color={colors.success} />
                                          ) : (
                                            <Copy size={11} color={colors.mutedForeground} />
                                          )}
                                          <Text
                                            style={[
                                              styles.outputCopyText,
                                              mono("medium"),
                                              { color: colors.mutedForeground },
                                            ]}
                                          >
                                            {copiedId === `text_${part.id}` ? "Copied" : "Copy"}
                                          </Text>
                                        </TouchableOpacity>
                                      ) : null}
                                    </View>

                                    {part.text ? (
                                      <RichResponse text={part.text} />
                                    ) : isRunning ? (
                                      <Text
                                        style={[
                                          styles.generatingPlaceholder,
                                          font("regular"),
                                          { color: colors.mutedForeground },
                                        ]}
                                      >
                                        Generating response…
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              </View>
                            );
                          }

                          let Icon: LucideIcon = Brain;
                          let iconColor = colors.mutedForeground;

                          if (part.nodeType === "tool") {
                            Icon = getToolIcon(part.toolName, part.meta);
                            iconColor = isErr
                              ? colors.destructive
                              : isRunning
                              ? colors.primary
                              : colors.foreground;
                          } else if (part.nodeType === "plan") {
                            Icon = ListChecks;
                            iconColor = colors.primary;
                          } else if (part.nodeType === "decision") {
                            Icon = Brain;
                            iconColor = colors.primary;
                          } else if (part.nodeType === "notice") {
                            Icon = AlertCircle;
                            iconColor = colors.warning;
                          }

                          const toolNamePretty =
                            part.nodeType === "tool"
                              ? displayToolName(part.toolName || part.meta?.command || "tool")
                              : "";

                          const titleText =
                            part.nodeType === "tool"
                              ? part.meta?.command || (typeof part.input === "string" ? part.input : part.input ? JSON.stringify(part.input) : toolNamePretty)
                              : part.text || "";

                          return (
                            <View key={`node_${part.id}_${pIdx}`} style={styles.nodeRow}>
                              {/* Left Spine Bullet */}
                              <View style={styles.nodeSpineCol}>
                                <View
                                  style={[
                                    styles.nodeBullet,
                                    {
                                      backgroundColor: colors.card,
                                      borderColor: isErr
                                        ? "rgba(239, 68, 68, 0.4)"
                                        : isRunning
                                        ? colors.primary
                                        : colors.border,
                                    },
                                  ]}
                                >
                                  {isRunning ? (
                                    <ActivityIndicator size={10} color={colors.primary} />
                                  ) : isErr ? (
                                    <AlertCircle size={11} color={colors.destructive} />
                                  ) : (
                                    <Icon size={11} color={iconColor} />
                                  )}
                                </View>
                              </View>

                              {/* Right Content Box */}
                              <View style={styles.nodeBodyCol}>
                                <TouchableOpacity
                                  style={[
                                    styles.nodeHeader,
                                    {
                                      backgroundColor: colors.card,
                                      borderColor: colors.border,
                                    },
                                    isExpanded && styles.nodeHeaderExpanded,
                                  ]}
                                  onPress={() => {
                                    if (part.hasExpandableContent) {
                                      toggleNode(part.id);
                                    }
                                  }}
                                  activeOpacity={part.hasExpandableContent ? 0.7 : 1}
                                >
                                  <View style={styles.nodeHeaderMain}>
                                    {toolNamePretty ? (
                                      <View style={[styles.toolChip, { backgroundColor: colors.secondary }]}>
                                        <Text
                                          style={[styles.toolChipText, mono("medium"), { color: colors.foreground }]}
                                          numberOfLines={1}
                                        >
                                          {toolNamePretty}
                                        </Text>
                                      </View>
                                    ) : null}

                                    <View style={{ flex: 1 }}>
                                      <InlineText
                                        text={titleText}
                                        numberOfLines={isExpanded ? undefined : 1}
                                        style={[
                                          styles.nodeTitle,
                                          font("regular"),
                                          { color: colors.foreground, fontSize: 13 },
                                          isRunning && { color: colors.primary },
                                        ]}
                                      />
                                    </View>
                                  </View>

                                  <View style={styles.nodeHeaderMeta}>
                                    {part.meta?.durationMs ? (
                                      <Text style={[styles.nodeDurText, mono("regular"), { color: colors.mutedForeground }]}>
                                        {formatDuration(part.meta.durationMs)}
                                      </Text>
                                    ) : null}

                                    {part.hasExpandableContent && (
                                      <ChevronRight
                                        size={13}
                                        color={colors.mutedForeground}
                                        style={
                                          isExpanded
                                            ? { transform: [{ rotate: "90deg" }] }
                                            : undefined
                                        }
                                      />
                                    )}
                                  </View>
                                </TouchableOpacity>

                                {/* Expandable Body Details */}
                                {isExpanded && (
                                  <View
                                    style={[
                                      styles.nodeContent,
                                      {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                      },
                                    ]}
                                  >
                                    {/* Reasoning Text */}
                                    {part.text && part.nodeType !== "plan" ? (
                                      <View style={styles.textWrapper}>
                                        <InlineText
                                          text={part.text}
                                          style={[font("regular"), { color: colors.foreground, fontSize: 13, lineHeight: 19 }]}
                                        />
                                      </View>
                                    ) : null}

                                    {/* Tool Input / Command */}
                                    {part.meta?.command ? (
                                      <View style={[styles.blockContainer, { borderColor: colors.border }]}>
                                        <View style={[styles.blockHeader, { backgroundColor: colors.secondary }]}>
                                          <Text style={[styles.blockLabel, mono("medium"), { color: colors.mutedForeground }]}>
                                            COMMAND
                                          </Text>
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleCopy(`cmd_${part.id}`, part.meta!.command!)
                                            }
                                            activeOpacity={0.7}
                                          >
                                            <Text style={[styles.blockCopy, mono("medium"), { color: colors.primary }]}>
                                              {copiedId === `cmd_${part.id}` ? "Copied" : "Copy"}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                        <CodeBlock
                                          code={part.meta.command}
                                          language="bash"
                                          showLineNumbers={false}
                                        />
                                      </View>
                                    ) : part.input ? (
                                      <View style={[styles.blockContainer, { borderColor: colors.border }]}>
                                        <View style={[styles.blockHeader, { backgroundColor: colors.secondary }]}>
                                          <Text style={[styles.blockLabel, mono("medium"), { color: colors.mutedForeground }]}>
                                            INPUT
                                          </Text>
                                        </View>
                                        <CodeBlock
                                          code={typeof part.input === "string" ? part.input : JSON.stringify(part.input, null, 2)}
                                          language="json"
                                          showLineNumbers={false}
                                        />
                                      </View>
                                    ) : null}

                                    {/* Tool Output */}
                                    {part.output ? (
                                      <View style={[styles.blockContainer, { borderColor: colors.border }]}>
                                        <View style={[styles.blockHeader, { backgroundColor: colors.secondary }]}>
                                          <Text style={[styles.blockLabel, mono("medium"), { color: colors.mutedForeground }]}>
                                            OUTPUT
                                          </Text>
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleCopy(`out_${part.id}`, part.output!)
                                            }
                                            activeOpacity={0.7}
                                          >
                                            <Text style={[styles.blockCopy, mono("medium"), { color: colors.primary }]}>
                                              {copiedId === `out_${part.id}` ? "Copied" : "Copy"}
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
                                                <Check size={11} color={colors.success} />
                                              ) : st.status === "active" ? (
                                                <ActivityIndicator
                                                  size={9}
                                                  color={colors.primary}
                                                />
                                              ) : st.status === "cancelled" ? (
                                                <X
                                                  size={11}
                                                  color={colors.mutedForeground}
                                                />
                                              ) : (
                                                <View style={[styles.planDot, { backgroundColor: colors.mutedForeground }]} />
                                              )}
                                              <View style={{ flex: 1 }}>
                                                <InlineText
                                                  text={st.text}
                                                  style={[
                                                    styles.planText,
                                                    { color: colors.foreground, fontSize: 13 },
                                                    (st.status === "done" ||
                                                      st.status === "cancelled") &&
                                                      [styles.planTextDone, { color: colors.mutedForeground }],
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
                  </>
                )}
              </ScrollView>

              {showScrollBottomBtn && (
                <TouchableOpacity
                  style={[
                    styles.floatingScrollBtn,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.glassShadow,
                    },
                  ]}
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
                  <FileCode size={26} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, font("medium"), { color: colors.foreground }]}>
                    No modified files
                  </Text>
                  <Text style={[styles.emptySub, font("regular"), { color: colors.mutedForeground }]}>
                    Files created or modified during this turn will appear here.
                  </Text>
                </View>
              ) : (
                <View style={styles.filesList}>
                  <Text style={[styles.filesCountLabel, mono("medium"), { color: colors.mutedForeground }]}>
                    {changedFiles.length} FILE{changedFiles.length === 1 ? "" : "S"} TOUCHED
                  </Text>

                  {changedFiles.map((file, fIdx) => (
                    <TouchableOpacity
                      key={`file_${file.path}_${fIdx}`}
                      style={[
                        styles.fileItemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
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
                                  ? colors.success
                                  : file.kind === "delete"
                                  ? colors.destructive
                                  : colors.primary,
                            },
                          ]}
                        >
                          {file.kind === "create" ? "NEW" : file.kind === "delete" ? "DEL" : "MOD"}
                        </Text>
                      </View>

                      <Text
                        style={[styles.filePathLabel, mono("regular"), { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {file.path}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleCopy(`file_${fIdx}`, file.path)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {copiedId === `file_${fIdx}` ? (
                          <Check size={13} color={colors.success} />
                        ) : (
                          <Copy size={13} color={colors.mutedForeground} />
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
            <View
              style={[
                styles.liveFooter,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={[styles.liveFooterDot, { backgroundColor: colors.primary }]} />
              <Shimmer style={[styles.liveFooterText, mono("medium"), { color: colors.primary }]}>
                Agent execution in progress…
              </Shimmer>
              <ActivityIndicator
                size="small"
                color={colors.primary}
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
  },
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  segmentText: {
    fontSize: 12.5,
  },
  pillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pillBadgeText: {
    fontSize: 10,
  },
  turnBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    borderWidth: 1,
  },
  turnCapsuleText: {
    fontSize: 11.5,
  },
  turnCapsuleMeta: {
    fontSize: 10,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 11,
  },
  sortToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sortToggleText: {
    fontSize: 10,
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
    borderWidth: 1,
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
  },
  promptBody: {
    fontSize: 12.5,
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
  },
  emptySub: {
    fontSize: 12,
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
    borderWidth: 1,
  },
  nodeHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  nodeHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  toolChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toolChipText: {
    fontSize: 11,
  },
  nodeTitle: {
    fontSize: 12,
    flex: 1,
  },
  nodeHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nodeDurText: {
    fontSize: 10,
  },
  nodeContent: {
    padding: 10,
    borderWidth: 1,
    borderTopWidth: 0,
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
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blockLabel: {
    fontSize: 10,
  },
  blockCopy: {
    fontSize: 10,
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
  },
  planText: {
    fontSize: 12,
  },
  planTextDone: {
    textDecorationLine: "line-through",
  },
  outputBox: {
    marginTop: 8,
  },
  outputCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    position: "relative",
  },
  streamingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streamingText: {
    fontSize: 10,
  },
  generatingPlaceholder: {
    fontSize: 13,
    fontStyle: "italic",
  },
  outputTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  outputCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outputCopyText: {
    fontSize: 10.5,
  },
  floatingScrollBtn: {
    position: "absolute",
    bottom: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 4,
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
    marginBottom: 4,
  },
  fileItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
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
    backgroundColor: "rgba(79, 70, 229, 0.12)",
  },
  fileTagDelete: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  fileTagText: {
    fontSize: 9.5,
  },
  filePathLabel: {
    fontSize: 12,
    flex: 1,
  },
  liveFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  liveFooterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveFooterText: {
    fontSize: 11,
  },
});
