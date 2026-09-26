import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SquarePen } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { AvaMascot, GlassIconButton } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { startSession } from "@/core/api/sessions";
import { formatCoreError } from "@/core/errors";
import { Composer } from "@/components/chat/composer";
import { SuggestedPromptCards } from "@/components/chat/suggested-prompts";
import { COLORS } from "@/theme/colors";



export function ChatScreen({ navigation }: { navigation: any }) {
  const { rpc, setActiveSessionId, modelId, sandbox, workingCwd, defaultCwd } = useAva();
  const [draft, setDraft] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartNewSession = async (text: string) => {
    if (!rpc || !text.trim()) return;
    setError(null);
    setIsStarting(true);
    const targetCwd = workingCwd || defaultCwd || APP.defaultCwd;
    try {
      const threadId = await startSession(rpc, {
        cwd: targetCwd,
        sandbox,
        ...(modelId ? { model: modelId } : {}),
      });
      setActiveSessionId(threadId);
      setDraft("");
      setIsStarting(false);
      navigation.navigate("Session", {
        sessionId: threadId,
        initialPrompt: text,
      });
    } catch (e) {
      setIsStarting(false);
      setError(formatCoreError(e));
    }
  };

  const handleSelectPrompt = (prompt: string, autoSend?: boolean) => {
    if (autoSend) {
      handleStartNewSession(prompt);
    } else {
      setDraft(prompt);
    }
  };

  return (
    <AppShell
      title="New session"
      actions={
        <GlassIconButton
          icon={SquarePen}
          size={18}
          onPress={() => {
            setActiveSessionId(null);
            setDraft("");
            setError(null);
          }}
        />
      }
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SuggestedPromptCards onSelectPrompt={handleSelectPrompt} />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composerWrapper}>
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleStartNewSession}
            onStop={() => {}}
            onClear={() => setDraft("")}
            status={isStarting ? "submitted" : "ready"}
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
    justifyContent: "space-between",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
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
