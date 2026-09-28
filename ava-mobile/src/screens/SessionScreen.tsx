import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppShell } from "@/components/layout/AppShell";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import { ChatMessageView } from "@/components/chat/message-parts";
import { Composer } from "@/components/chat/composer";
import { ChevronDown, Clock, Play, X } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

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
  const { activeSessionId, setActiveSessionId } = useAva();
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

  // Swipe Right to Left → Open Timeline Screen
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

    // Swiped from right to left (negative dx) with minimal vertical deflection
    if (dx < -75 && Math.abs(dy) < 65 && dt < 450) {
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

  useEffect(() => {
    if (isNearBottomRef.current) {
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

  const handleSubmit = (text: string) => {
    setDraft("");
    send(text);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  return (
    <AppShell
      title={title}
      chatMessages={messages}
      onNewSession={() => {
        setActiveSessionId(null);
        navigation?.navigate("Main", { screen: "Chat" });
      }}
    >
      <KeyboardAvoidingView
        style={styles.container}
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
          keyExtractor={(item) => item.id}
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={60}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            loadingHistory ? null : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 80,
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.foreground }}>
                  {status === "submitted" || status === "streaming"
                    ? "Agent is processing…"
                    : "Start a conversation"}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.mutedForeground,
                    textAlign: "center",
                    paddingHorizontal: 40,
                  }}
                >
                  {status === "submitted" || status === "streaming"
                    ? "Your prompt has been sent. The agent's response will appear here."
                    : "Type a message below to begin coding with AvA."}
                </Text>
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
                <Shimmer style={styles.historyLoaderText}>Loading session…</Shimmer>
              </View>
            ) : hasOlder ? (
              <TouchableOpacity
                style={styles.loadOlderBtn}
                onPress={loadOlder}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Load earlier messages"
              >
                <Text style={styles.loadOlderText}>Load earlier messages</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {showScrollBottomBtn && (
          <TouchableOpacity
            style={styles.floatingScrollBtn}
            onPress={scrollToBottom}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Scroll to bottom"
          >
            <ChevronDown size={18} color={COLORS.foreground} />
          </TouchableOpacity>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Queued items banner */}
        {queuedPrompts && queuedPrompts.length > 0 ? (
          <View style={styles.queueContainer}>
            <View style={styles.queueHeader}>
              <View style={styles.queueHeaderLeft}>
                <Clock size={13} color={COLORS.primary} />
                <Text style={styles.queueTitle}>
                  {queuedPrompts.length} queued{" "}
                  {queuedPrompts.length === 1 ? "prompt" : "prompts"}
                </Text>
              </View>
              {status === "ready" ? (
                <TouchableOpacity
                  onPress={resume}
                  style={styles.queueRunNowBtn}
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
              <View key={q.id} style={styles.queueItem}>
                <Text style={styles.queueItemText} numberOfLines={1}>
                  {q.text}
                </Text>
                <TouchableOpacity
                  onPress={() => removeQueued(q.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove queued prompt"
                >
                  <X size={13} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* Stopping indicator banner */}
        {status === "stopping" ? (
          <View style={styles.stoppingContainer}>
            <ActivityIndicator size="small" color={COLORS.warning} />
            <Text style={styles.stoppingText}>Stopping agent…</Text>
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
          <Text style={styles.disclaimerText}>
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
    gap: 16,
  },
  historyLoader: {
    alignItems: "center",
    paddingVertical: 8,
  },
  historyLoaderText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  loadOlderBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    marginBottom: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  loadOlderText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    fontWeight: "500",
  },
  errorContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  errorBannerText: {
    color: COLORS.destructive,
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
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 6,
  },
  queueContainer: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.foreground,
  },
  queueRunNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 28,
  },
  queueRunNowText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryForeground,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  queueItemText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
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
    color: COLORS.warning,
    fontWeight: "500",
  },
  floatingScrollBtn: {
    position: "absolute",
    bottom: 95,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 99,
  },
});
