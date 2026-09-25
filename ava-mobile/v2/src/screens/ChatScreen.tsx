import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SquarePen } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { AvaMascot, Button, GlassIconButton } from "@/components/kit";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import { ChatMessageView } from "@/components/chat/message-parts";
import { Composer } from "@/components/chat/composer";
import { COLORS } from "@/theme/colors";

const SUGGESTIONS = [
  "Create a new feature",
  "Fix an error",
  "Explain this project",
];

function EmptyChat({ onPick }: { onPick: (s: string) => void }) {
  return (
    <View style={styles.emptyWrap}>
      <AvaMascot size="lg" />
      <Text style={styles.emptyHeading}>What do you want to build?</Text>
      <Text style={styles.emptyDesc}>
        Describe a feature, paste an error, or ask AvA to explore your code.
      </Text>

      <View style={styles.suggestionsRow}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionPill}
            onPress={() => onPick(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function ChatScreen() {
  const { activeSessionId, setActiveSessionId } = useAva();
  const { data: sessions } = useSessions();
  const {
    messages,
    status,
    error,
    send,
    stop,
    clear,
    loadingHistory,
    hasOlder,
    loadOlder,
  } = useChat();

  const [draft, setDraft] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const activeSession = sessions?.find((s) => s.id === activeSessionId);
  const title = activeSession?.title ?? "New session";

  const handleSubmit = (text: string) => {
    setDraft("");
    send(text);
  };

  return (
    <AppShell
      title={title}
      actions={
        <GlassIconButton
          icon={SquarePen}
          size={18}
          onPress={() => {
            setActiveSessionId(null);

          }}
        />
      }
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messages.length === 0 && !loadingHistory ? (
          <EmptyChat onPick={(s) => setDraft(s)} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ChatMessageView
                message={item}
                live={
                  (status === "submitted" || status === "streaming") &&
                  index === messages.length - 1 &&
                  item.role === "assistant"
                }
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
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
                >
                  <Text style={styles.loadOlderText}>Load earlier messages</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorBannerText}>{error}</Text>
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
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyHeading: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 20,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  suggestionPill: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: "500",
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
});
