import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SquarePen } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { Composer } from "@/components/chat/composer";
import { SuggestedPromptCards } from "@/components/chat/suggested-prompts";
import { COLORS } from "@/theme/colors";

export function ChatScreen({ navigation }: { navigation: any }) {
  const { setActiveSessionId } = useAva();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStartNewSession = (text: string, attachments?: any[]) => {
    let fullPrompt = text.trim();
    if (attachments && attachments.length > 0) {
      const attText = attachments
        .map((a) => `[Attachment: ${a.name || "File"} (${a.remotePath || a.id})]`)
        .join("\n");
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n${attText}` : attText;
    }
    if (!fullPrompt) return;

    setError(null);
    setDraft("");
    setActiveSessionId(null);
    const promptNonce = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    navigation.navigate("Session", {
      sessionId: undefined,
      initialPrompt: fullPrompt,
      promptNonce,
    });
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
            status="ready"
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
    backgroundColor: COLORS.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  composerWrapper: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    backgroundColor: COLORS.background,
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 10.5,
    marginTop: 6,
    color: COLORS.mutedForeground,
  },
  errorContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorBannerText: {
    fontSize: 12,
    color: COLORS.destructive,
    textAlign: "center",
  },
});
