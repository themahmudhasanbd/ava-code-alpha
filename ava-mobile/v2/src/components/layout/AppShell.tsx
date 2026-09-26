import React, { type ReactNode } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppGlow } from "@/components/kit";
import { AppHeader } from "@/components/layout/AppHeader";
import type { ChatMessage } from "@/core/types";

export function AppShell({
  title,
  actions,
  customHeader,
  hideHeader = false,
  showBack = false,
  onBack,
  chatMessages,
  onCompactSession,
  onNewSession,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  customHeader?: ReactNode;
  hideHeader?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  chatMessages?: ChatMessage[];
  onCompactSession?: () => Promise<void>;
  onNewSession?: () => void;
  children: ReactNode;
}) {
  return (
    <AppGlow style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Header Rendering */}
        {!hideHeader &&
          (customHeader ? (
            customHeader
          ) : (
            <AppHeader
              activeSessionTitle={title}
              chatMessages={chatMessages}
              showBack={showBack}
              onBack={onBack}
              onCompactSession={onCompactSession}
              onNewSession={onNewSession}
            />
          ))}

        {/* Main Body */}
        <View style={styles.contentBody}>{children}</View>
      </SafeAreaView>
    </AppGlow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentBody: {
    flex: 1,
  },
});
