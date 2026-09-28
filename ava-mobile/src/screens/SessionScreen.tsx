import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppShell } from "@/components/layout/AppShell";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AvaMascot } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import { ChatMessageView } from "@/components/chat/message-parts";
import { Composer } from "@/components/chat/composer";
import {
  ChevronDown,
  Clock,
  Layers,
  Play,
  Sparkles,
  Square,
  Terminal as TerminalSquare,
  X,
} from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

export function SessionScreen({
  route,
  navigation,
}: {
  route?: {
    params?: {
      sessionId?: string;
      initialPrompt?: string;
      scrollToMessageId?: string;
    };
  };
  navigation?: any;
}) {
  const { colors, isDark } = useTheme();
  const { activeSessionId, setActiveSessionId, modelId, workingCwd, defaultCwd } = useAva();
  const sessionId = route?.params?.sessionId || activeSessionId || "";
  const initialPrompt = route?.params?.initialPrompt;
  const scrollToMessageId = route?.params?.scrollToMessageId;
  const { data: sessions } = useSessions();

  const {
    messages,
    status,
    error,
    queuedPrompts,
    send,
    stop,
    resume,
    removeQueued,
    clear,
    loadingHistory,
    hasOlder,
    loadOlder,
  } = useChat(sessionId);

  const [draft, setDraft] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const sentPromptKeyRef = useRef<string | null>(null);
  const lastScrolledIdRef = useRef<string | null>(null);

  const handleBack = useCallback(() => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate("Main", { screen: "Chat" });
    }
  }, [navigation]);

  // Auto-scroll when keyboard opens on Android/iOS if user was near bottom
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        if (isNearBottomRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 120);
        }
      }
    );
    return () => showSub.remove();
  }, []);

  // Hardware back button handler for Android
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  // Handle scrolling to a targeted message (e.g. returning from Timeline)
  useEffect(() => {
    if (
      scrollToMessageId &&
      messages.length > 0 &&
      lastScrolledIdRef.current !== scrollToMessageId
    ) {
      const idx = messages.findIndex((m) => m.id === scrollToMessageId);
      if (idx !== -1) {
        lastScrolledIdRef.current = scrollToMessageId;
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.3,
          });
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [scrollToMessageId, messages]);

  // Swipe Right to Left -> Open Timeline Screen (smooth edge detection)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: any) => {
    touchStartRef.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: any) => {
    if (!touchStartRef.current) return;
    const startX = touchStartRef.current.x;
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Strict edge swipe (from right margin inwards with minimal vertical deflection)
    if (startX > 200 && dx < -85 && Math.abs(dy) < 45 && dt < 450) {
      navigation?.navigate("Timeline", {
        sessionId,
      });
    }
  };

  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  useEffect(() => {
    if (initialPrompt && sessionId) {
      const promptKey = `${sessionId}:${initialPrompt}`;
      if (sentPromptKeyRef.current !== promptKey) {
        sentPromptKeyRef.current = promptKey;
        send(initialPrompt);
      }
    }
  }, [initialPrompt, sessionId, send]);

  const isNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Auto-scroll when messages arrive or stream live tokens
  const isStreaming = status === "submitted" || status === "streaming";
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMsgTokenCount =
    lastMsg?.parts?.reduce((acc, p) => acc + (p.text?.length || 0), 0) || 0;

  const lastScrollTimeRef = useRef(0);
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    if (isStreaming) {
      const now = Date.now();
      if (now - lastScrollTimeRef.current > 160) {
        lastScrollTimeRef.current = now;
        flatListRef.current?.scrollToEnd({ animated: false });
      }
    } else {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length, lastMsgTokenCount, isStreaming]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 120;
    const isBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    isNearBottomRef.current = isBottom;
    setShowScrollBottomBtn(!isBottom && contentOffset.y > 150);
  }, []);

  const scrollToBottom = useCallback(() => {
    isNearBottomRef.current = true;
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollBottomBtn(false);
  }, []);

  const activeSession = sessions?.find((s) => s.id === sessionId);
  const title = activeSession?.title ?? "Session";

  const currentPath = workingCwd || defaultCwd || APP.defaultCwd;
  const pathSnippet = useMemo(() => {
    if (!currentPath) return "";
    const segments = currentPath.split("/").filter(Boolean);
    return segments.length > 2 ? segments.slice(-2).join("/") : currentPath;
  }, [currentPath]);

  const modelNameDisplay = useMemo(() => {
    const raw = activeSession?.model || modelId || "Auto";
    if (raw.includes("/")) {
      return raw.split("/").pop() || raw;
    }
    return raw;
  }, [activeSession?.model, modelId]);

  const toolCallsCount = useMemo(() => {
    let count = 0;
    for (const m of messages) {
      if (m.parts) {
        for (const p of m.parts) {
          if (p.kind === "tool" || p.kind === "plan") count++;
        }
      }
    }
    return count;
  }, [messages]);

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    setDraft("");
    send(text);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  const quickStarters = [
    { label: "Codebase architecture", prompt: "Explain the architecture and main modules of this project." },
    { label: "Git status & diff", prompt: "Check git status and summarize recent changes." },
    { label: "Run typecheck & tests", prompt: "Run typecheck and tests to see if everything compiles cleanly." },
    { label: "Find and fix bugs", prompt: "Review recent code changes and check for any edge cases or bugs." },
  ];

  return (
    <AppShell
      title={title}
      chatMessages={messages}
      showBack={true}
      onBack={handleBack}
      onNewSession={() => {
        setActiveSessionId(null);
        navigation?.navigate("Main", { screen: "Chat" });
      }}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Smart Session Sub-header Bar (Soft Glass Surface) ── */}
        <View
          style={[
            styles.topBarContainer,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.sessionMetaPill}>
            <Sparkles size={11} color={colors.primary} />
            <Text
              style={[styles.sessionMetaText, font("semibold"), { color: colors.foreground }]}
              numberOfLines={1}
            >
              {modelNameDisplay}
            </Text>
            {pathSnippet ? (
              <>
                <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>•</Text>
                <Text
                  style={[styles.sessionPathText, mono("regular"), { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {pathSnippet}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={[
                styles.shortcutPill,
                {
                  backgroundColor: toolCallsCount > 0 ? (isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(66, 64, 225, 0.08)") : colors.secondary,
                  borderColor: toolCallsCount > 0 ? colors.primary : colors.border,
                },
              ]}
              onPress={() => navigation?.navigate("Timeline", { sessionId })}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="View Timeline"
            >
              <Layers
                size={12}
                color={toolCallsCount > 0 ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.shortcutPillText,
                  font("semibold"),
                  { color: toolCallsCount > 0 ? colors.primary : colors.mutedForeground },
                ]}
              >
                Timeline
              </Text>
              {toolCallsCount > 0 ? (
                <View style={[styles.badgeCount, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeCountText, { color: colors.primaryForeground }]}>
                    {toolCallsCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shortcutPill,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => navigation?.navigate("Main", { screen: "Terminal" })}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open Terminal"
            >
              <TerminalSquare size={12} color={colors.mutedForeground} />
              <Text style={[styles.shortcutPillText, font("medium"), { color: colors.mutedForeground }]}>
                Terminal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          keyExtractor={(item) => item.id}
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={60}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            loadingHistory ? null : (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyMascotWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.glassShadow,
                    },
                  ]}
                >
                  <AvaMascot state={isStreaming ? "working" : "idle"} size="lg" />
                </View>

                <Text style={[styles.emptyTitle, font("bold"), { color: colors.foreground }]}>
                  {status === "submitted" || status === "streaming"
                    ? "Agent is working…"
                    : "Session Ready"}
                </Text>

                <Text style={[styles.emptySubtitle, font("regular"), { color: colors.mutedForeground }]}>
                  {status === "submitted" || status === "streaming"
                    ? "Executing tools and generating solution. Output will stream here."
                    : `Active in ${pathSnippet || "workspace"}. Ask a question or run a task to begin.`}
                </Text>

                {!isStreaming && (
                  <View style={styles.startersWrap}>
                    <Text style={[styles.startersHeader, font("semibold"), { color: colors.mutedForeground }]}>
                      Quick Starters
                    </Text>
                    <View style={styles.startersGrid}>
                      {quickStarters.map((starter, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.starterCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => handleSubmit(starter.prompt)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.starterCardText, font("medium"), { color: colors.foreground }]}>
                            {starter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )
          }
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.3,
              });
            }, 300);
          }}
          renderItem={({ item, index }) => (
            <ChatMessageView
              message={item}
              sessionId={sessionId}
              onOpenTimeline={(msgId) =>
                navigation?.navigate("Timeline", {
                  sessionId,
                  messageId: msgId,
                })
              }
              live={
                (status === "submitted" || status === "streaming") &&
                index === messages.length - 1 &&
                item.role === "assistant"
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            loadingHistory ? (
              <View style={styles.historyLoader}>
                <Shimmer style={[styles.historyLoaderText, { color: colors.mutedForeground }]}>
                  Loading session…
                </Shimmer>
              </View>
            ) : hasOlder ? (
              <TouchableOpacity
                style={[styles.loadOlderBtn, { backgroundColor: colors.secondary }]}
                onPress={loadOlder}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Load earlier messages"
              >
                <Text style={[styles.loadOlderText, { color: colors.mutedForeground }]}>
                  Load earlier messages
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {showScrollBottomBtn && (
          <TouchableOpacity
            style={[
              styles.floatingScrollBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.glassShadow,
              },
            ]}
            onPress={scrollToBottom}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Scroll to bottom"
          >
            <ChevronDown size={18} color={colors.foreground} />
            {isStreaming && <View style={[styles.scrollBtnDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {/* Queued items banner */}
        {queuedPrompts && queuedPrompts.length > 0 ? (
          <View
            style={[
              styles.queueContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.queueHeader}>
              <View style={styles.queueHeaderLeft}>
                <Clock size={13} color={colors.primary} />
                <Text style={[styles.queueTitle, { color: colors.foreground }]}>
                  {queuedPrompts.length} queued{" "}
                  {queuedPrompts.length === 1 ? "prompt" : "prompts"}
                </Text>
              </View>
              {status === "ready" ? (
                <TouchableOpacity
                  onPress={resume}
                  style={[styles.queueRunNowBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Start next queued prompt"
                >
                  <Play size={11} color="#FFF" fill="#FFF" />
                  <Text style={styles.queueRunNowText}>Start next</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {queuedPrompts.map((q) => (
              <View
                key={q.id}
                style={[
                  styles.queueItem,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[styles.queueItemText, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {q.text}
                </Text>
                <TouchableOpacity
                  onPress={() => removeQueued(q.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove queued prompt"
                >
                  <X size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* Live streaming / processing banner */}
        {isStreaming ? (
          <View
            style={[
              styles.liveStatusBar,
              {
                backgroundColor: isDark ? "rgba(99, 102, 241, 0.08)" : "rgba(66, 64, 225, 0.05)",
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.liveStatusLeft}>
              <View style={styles.livePulseDot} />
              <Shimmer style={[styles.liveStatusText, { color: colors.foreground }]}>
                {status === "submitted"
                  ? "AvA is preparing response…"
                  : "AvA is executing tools & generating response…"}
              </Shimmer>
            </View>
            <TouchableOpacity
              onPress={stop}
              style={[
                styles.liveStopBtn,
                {
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(239, 68, 68, 0.1)",
                  borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.25)",
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Stop agent response"
            >
              <Square size={10} color={colors.destructive} fill={colors.destructive} />
              <Text style={[styles.liveStopText, { color: colors.destructive }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Stopping indicator banner */}
        {status === "stopping" ? (
          <View style={styles.stoppingContainer}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={[styles.stoppingText, { color: colors.warning }]}>Stopping agent…</Text>
          </View>
        ) : null}

        <View style={styles.composerWrapper}>
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            onStop={stop}
            onClear={clear}
            status={status}
          />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            {APP.name} can make mistakes. Review generated code before using it.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sessionMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 4,
  },
  sessionMetaText: {
    fontSize: 12,
    maxWidth: 110,
  },
  metaDot: {
    fontSize: 11,
  },
  sessionPathText: {
    fontSize: 11,
    flexShrink: 1,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shortcutPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  shortcutPillText: {
    fontSize: 11,
  },
  badgeCount: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCountText: {
    fontSize: 9,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 16,
  },
  historyLoader: {
    alignItems: "center",
    paddingVertical: 8,
  },
  historyLoaderText: {
    fontSize: 13,
  },
  loadOlderBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  loadOlderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyMascotWrapper: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
    marginBottom: 24,
  },
  startersWrap: {
    width: "100%",
    maxWidth: 340,
    gap: 8,
  },
  startersHeader: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: "center",
  },
  startersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  starterCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  starterCardText: {
    fontSize: 12,
  },
  liveStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  liveStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  liveStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  liveStopText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  errorBannerText: {
    fontSize: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 8,
    borderRadius: 8,
    textAlign: "center",
  },
  composerWrapper: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
    paddingTop: 8,
    position: "relative",
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  queueContainer: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  queueRunNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 28,
  },
  queueRunNowText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  queueItemText: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  stoppingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  stoppingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  floatingScrollBtn: {
    position: "absolute",
    bottom: 95,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 99,
  },
  scrollBtnDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
