import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  PanResponder,
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
import { Clock, Play, X } from "lucide-react-native";
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
      navigation?.navigate("Chat");
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

  // Refined directional pan responder: only intentional horizontal gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 60 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.5 &&
          Math.abs(gestureState.vx) > 0.35
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe left -> open Timeline workflow
        if (gestureState.dx < -70 && gestureState.vx < -0.3) {
          navigation?.navigate("Timeline", { sessionId });
        }
        // Swipe right -> go back
        else if (gestureState.dx > 70 && gestureState.vx > 0.3) {
          handleBack();
        }
      },
    })
  ).current;

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

  const prevLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      prevLengthRef.current = messages.length;
    }
  }, [messages.length]);

  const activeSession = sessions?.find((s) => s.id === sessionId);
  const title = activeSession?.title ?? "Session";

  const handleSubmit = (text: string) => {
    setDraft("");
    send(text);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <AppShell
      title={title}
      chatMessages={messages}
      onNewSession={() => {
        setActiveSessionId(null);
        navigation?.navigate("Chat");
      }}
    >
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
                  <Shimmer style={styles.historyLoaderText}>
                    Loading session…
                  </Shimmer>
                </View>
              ) : hasOlder ? (
                <TouchableOpacity
                  style={styles.loadOlderBtn}
                  onPress={loadOlder}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadOlderText}>
                    Load earlier messages
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />

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
                    {queuedPrompts.length} queued {queuedPrompts.length === 1 ? "prompt" : "prompts"}
                  </Text>
                </View>
                {status === "ready" ? (
                  <TouchableOpacity
                    onPress={resume}
                    style={styles.queueRunNowBtn}
                    activeOpacity={0.7}
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              <ActivityIndicator size="small" color={COLORS.primary} />
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
      </View>
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
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    marginBottom: 8,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  queueRunNowText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    color: "#F59E0B",
    fontWeight: "500",
  },
});
