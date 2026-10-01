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
import { ChevronDown, Clock, Play, TriangleAlert, X } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { AvaMascot } from "@/components/ui/ava-mascot";
import { EmptyState } from "@/components/kit";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatMessageView } from "@/components/chat/message-parts";
import { Composer } from "@/components/chat/composer";
import { ApprovalCard } from "@/components/chat/ApprovalCard";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import { COLORS, useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";
import { ChatSessionSkeleton } from "@/components/ui/skeleton";

const MAX_NONCES_PER_SESSION = 20;
const MAX_NONCE_SESSIONS = 50;

/**
 * Audit A3 — bounded per-session nonce storage for the single-dispatch
 * initialPrompt guard. The old unbounded global Set also deduped on raw
 * prompt text; now dedup only happens on an explicit promptNonce.
 */
const processedPromptNonces = new Map<string, Set<string>>();

function isNonceProcessed(sessionId: string, nonce: string): boolean {
  return processedPromptNonces.get(sessionId)?.has(nonce) ?? false;
}

function markNonceProcessed(sessionId: string, nonce: string): void {
  let set = processedPromptNonces.get(sessionId);
  if (!set) {
    set = new Set();
    processedPromptNonces.set(sessionId, set);
  }
  set.add(nonce);
  if (set.size > MAX_NONCES_PER_SESSION) {
    const oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
  if (processedPromptNonces.size > MAX_NONCE_SESSIONS) {
    const oldestKey = processedPromptNonces.keys().next().value;
    if (oldestKey !== undefined) processedPromptNonces.delete(oldestKey);
  }
}

export function SessionScreen({
  route,
  navigation,
}: {
  route?: {
    params?: {
      sessionId?: string;
      initialPrompt?: string;
      promptNonce?: string;
      scrollToMessageId?: string;
    };
  };
  navigation?: any;
}) {
  const { colors } = useTheme();
  const { activeSessionId, setActiveSessionId, workingCwd, defaultCwd } = useAva();
  const routeSessionId = route?.params?.sessionId;
  const initialPrompt = route?.params?.initialPrompt;
  const promptNonce = route?.params?.promptNonce;
  const sessionId = routeSessionId ?? activeSessionId ?? "";
  const scrollToMessageId = route?.params?.scrollToMessageId;
  const { data: sessions } = useSessions();

  const {
    messages,
    status,
    error,
    queuedPrompts,
    pendingApprovals,
    answerPendingApproval,
    send,
    stop,
    resume,
    removeQueued,
    clear,
    dismissError,
    loadingHistory,
    hasOlder,
    loadOlder,
  } = useChat(sessionId);

  const [draft, setDraft] = useState("");
  const flatListRef = useRef<FlatList>(null);
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
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Swipe right-to-left: Open Timeline
    if (dx < -65 && Math.abs(dy) < 55 && dt < 450) {
      navigation?.navigate("Timeline", {
        sessionId,
      });
    }
  };

  // Sync activeSessionId when route parameter changes
  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, activeSessionId, setActiveSessionId]);

  // Single-dispatch initialPrompt guard. Only dedups when an explicit
  // promptNonce is provided — never uses raw prompt text as a dedup key.
  useEffect(() => {
    if (!initialPrompt) return;
    if (promptNonce) {
      const sessionKey = sessionId || "__new__";
      if (isNonceProcessed(sessionKey, promptNonce)) return;
      markNonceProcessed(sessionKey, promptNonce);
    }

    if (navigation?.setParams) {
      navigation.setParams({ initialPrompt: undefined, promptNonce: undefined });
    }

    void send(initialPrompt).then((newThreadId) => {
      if (newThreadId && navigation?.setParams) {
        navigation.setParams({ sessionId: newThreadId, initialPrompt: undefined, promptNonce: undefined });
      } else if (!newThreadId) {
        setDraft(initialPrompt);
      }
    });
  }, [initialPrompt, promptNonce, send, navigation, sessionId]);

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

  const handleSubmit = (text: string, attachments?: any[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;
    setDraft("");
    let fullPrompt = text.trim();
    if (attachments && attachments.length > 0) {
      const attText = attachments
        .map((a) => `[Attachment: ${a.name || "File"} (${a.remotePath || a.id})]`)
        .join("\n");
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n${attText}` : attText;
    }
    void send(fullPrompt).then((newThreadId) => {
      if (!newThreadId) {
        setDraft(fullPrompt);
        return;
      }
      if (newThreadId !== sessionId && navigation?.setParams) {
        navigation.setParams({ sessionId: newThreadId });
      }
    });
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
        <FlatList
          ref={flatListRef}
          data={messages}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          keyExtractor={(item, index) => item.id ? `${item.id}_${index}` : `msg_${index}`}
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={60}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            loadingHistory ? (
              <ChatSessionSkeleton />
            ) : (
              <EmptyState
                iconNode={<AvaMascot state={isStreaming ? "working" : "idle"} size="md" />}
                title={
                  status === "submitted" || status === "streaming"
                    ? "Agent is working…"
                    : "Session Ready"
                }
                description={
                  status === "submitted" || status === "streaming"
                    ? "Executing tools and generating solution. Output will stream here."
                    : `Active in ${pathSnippet || "workspace"}. Ask a question or run a task to begin.`
                }
                action={
                  !isStreaming ? (
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
                              backgroundColor: "transparent",
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
                  ) : null
                }
              />
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
          renderItem={({ item, index }) => {
            // Preceding user prompt text for intent derivation (assistant turns only)
            let userPrompt: string | undefined;
            if (item.role === "assistant" && index > 0) {
              const prev = messages[index - 1];
              if (prev && prev.role === "user") {
                userPrompt = prev.parts
                  .filter((pt) => pt.kind === "text" && pt.text)
                  .map((pt) => pt.text)
                  .join("\n")
                  .trim() || undefined;
              }
            }
            return (
              <ChatMessageView
                message={item}
                sessionId={sessionId}
                userPrompt={userPrompt}
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
            );
          }}
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
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.destructive + "12",
                borderColor: colors.destructive + "3D",
              },
            ]}
            accessibilityRole="alert"
          >
            <View style={styles.errorHeader}>
              <View
                style={[
                  styles.errorIconChip,
                  { backgroundColor: colors.destructive + "1F" },
                ]}
              >
                <TriangleAlert size={14} color={colors.destructive} />
              </View>
              <Text
                style={[styles.errorTitle, font("semibold"), { color: colors.foreground }]}
              >
                Something went wrong
              </Text>
              <TouchableOpacity
                onPress={dismissError}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <X size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.errorMessage, font("regular"), { color: colors.mutedForeground }]}
              numberOfLines={4}
            >
              {error}
            </Text>
            <Text style={[styles.errorHint, font("regular"), { color: colors.mutedForeground }]}>
              Your chat is safe — send a new message below to continue.
            </Text>
          </View>
        ) : null}

        {/* Queued items banner */}
        {queuedPrompts && queuedPrompts.length > 0 ? (
          <View
            style={[
              styles.queueContainer,
              {
                backgroundColor: "transparent",
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
                  { backgroundColor: "transparent", borderColor: colors.border },
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

        {/* Stopping indicator banner */}
        {status === "stopping" ? (
          <View style={styles.stoppingContainer}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={[styles.stoppingText, { color: colors.warning }]}>Stopping agent…</Text>
          </View>
        ) : null}

        {pendingApprovals.length > 0 ? (
          <View style={styles.approvalStack}>
            {pendingApprovals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} onRespond={answerPendingApproval} />
            ))}
          </View>
        ) : null}

        <View style={styles.composerWrapper}>
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            onStop={stop}
            onResume={resume}
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
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 20,
  },
  startersWrap: {
    marginTop: 12,
    width: "100%",
    gap: 10,
  },
  startersHeader: {
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  startersGrid: {
    gap: 8,
  },
  starterCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  starterCardText: {
    fontSize: 13,
  },
  historyLoader: {
    paddingVertical: 10,
    alignItems: "center",
  },
  historyLoaderText: {
    fontSize: 11,
  },
  loadOlderBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginVertical: 4,
  },
  loadOlderText: {
    fontSize: 11,
  },
  floatingScrollBtn: {
    position: "absolute",
    right: 18,
    bottom: 90,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  scrollBtnDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  errorCard: {
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorIconChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 13,
    flex: 1,
  },
  errorMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  errorHint: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.85,
  },
  queueContainer: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
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
    fontSize: 11.5,
    fontWeight: "600",
  },
  queueRunNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  queueRunNowText: {
    fontSize: 10.5,
    color: "#FFF",
    fontWeight: "600",
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  queueItemText: {
    fontSize: 11,
    flex: 1,
    marginRight: 6,
  },
  stoppingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  stoppingText: {
    fontSize: 12,
  },
  approvalStack: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  composerWrapper: {
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 6,
    backgroundColor: "transparent",
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 10,
    marginTop: 4,
  },
});
