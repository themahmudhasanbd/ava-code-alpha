import "@/polyfills";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, LogBox, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type LinkingOptions,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from "@expo-google-fonts/hind-siliguri";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { AvaProvider } from "@/state/ava-provider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { initStorage } from "@/core/storage";
import { checkBootRecovery, initPushNotifications } from "@/core/notifications";
import { COLORS, ThemeProvider, useTheme } from "@/theme/colors";

LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Require cycle:",
  "Setting a timer",
  "setLayoutAnimationEnabledExperimental",
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "expo-notifications",
  "Notifications",
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
  },
});

const linking: LinkingOptions<any> = {
  prefixes: [
    "https://ava.mahmudhasan.pro",
    "http://localhost:8081",
    "http://localhost:19006",
    "ava://",
  ],
  config: {
    screens: {
      Login: "login",
      Main: {
        screens: {
          Chat: "",
          Session: "session/:sessionId?",
          Files: "files",
          Terminal: "terminal",
          Browser: "browser",
          Desktop: "desktop",
          Models: "models",
          System: "system",
          Mcp: "mcp",
          Tasks: "tasks",
          Media: "media",
          Settings: "settings",
          NotificationSettings: "settings/notifications",
          Profile: "profile",
        },
      },
      Timeline: "timeline/:sessionId?",
      AppearanceSettings: "settings/appearance",
      WorkspaceSettings: "settings/workspace",
      ServerSettings: "settings/server",
      PermissionsSettings: "settings/permissions",
      StorageSettings: "settings/storage",
      SystemSettings: "settings/system",
    },
  },
};

function AppContent() {
  const { isDark, colors, resolvedTheme } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.foreground,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationContainer linking={linking} theme={navTheme} key={resolvedTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={ebStyles.container}>
          <ScrollView contentContainerStyle={ebStyles.content}>
            <Text style={ebStyles.title}>Something went wrong</Text>
            <Text style={ebStyles.message}>{String((error as Error).message || error)}</Text>
            <Text style={ebStyles.stack}>{String((error as Error).stack || "").slice(0, 3000)}</Text>
            <Text style={ebStyles.hint}>Please take a screenshot of this error.</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 24, paddingTop: 64 },
  title: { fontSize: 22, fontWeight: "700", color: "#111111", marginBottom: 12 },
  message: { fontSize: 15, color: "#b00020", marginBottom: 12 },
  stack: { fontSize: 11, color: "#444444", fontFamily: "monospace" },
  hint: { fontSize: 13, color: "#666666", marginTop: 16 },
});

function AppInner() {
  const [ready, setReady] = useState(false);
  const [bootNotice, setBootNotice] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initStorage();
        // Audit A13 — fire-and-forget: register the ava-turns channel and FCM
        // token once at startup without blocking. Permission denial is handled
        // inside initPushNotifications.
        void initPushNotifications();
        // Audit D16 — fire-and-forget: detect an agent session interrupted by reboot.
        void checkBootRecovery().then((recovery) => {
          if (recovery?.wasActive) {
            setBootNotice(
              "An agent session was still active when the device restarted. " +
                "Its foreground service was stopped; open the session to review its state."
            );
          }
        });
        const fontPromise = Font.loadAsync({
          PlusJakartaSans_400Regular,
          PlusJakartaSans_500Medium,
          PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold,
          PlusJakartaSans_800ExtraBold,
          HindSiliguri_400Regular,
          HindSiliguri_500Medium,
          HindSiliguri_600SemiBold,
          HindSiliguri_700Bold,
          JetBrainsMono_400Regular,
          JetBrainsMono_500Medium,
          JetBrainsMono_700Bold,
        }).catch((e) => console.warn("Font loading background warning:", e));

        if (Platform.OS === "web") {
          // On web, immediately mount and render UI with font-display: swap without splash block
          setReady(true);
        } else {
          await fontPromise;
          setReady(true);
        }
      } catch (err) {
        console.warn("Init or font loading error:", err);
        setReady(true);
      }
    }
    prepare();
  }, []);

  // Audit D16 — surface the boot-recovery notice once the UI is mounted.
  useEffect(() => {
    if (ready && bootNotice) {
      Alert.alert("Session Interrupted", bootNotice, [{ text: "OK" }]);
      setBootNotice(null);
    }
  }, [ready, bootNotice]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AvaProvider>
              <AppContent />
            </AvaProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function App() {
  return (
    <RootErrorBoundary>
      <AppInner />
    </RootErrorBoundary>
  );
}
