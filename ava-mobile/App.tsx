import "@/polyfills";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import { COLORS } from "@/theme/colors";

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

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          initStorage(),
          Font.loadAsync({
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
          }),
        ]);
      } catch (err) {
        console.warn("Init or font loading error:", err);
      } finally {
        setReady(true);
      }
    }
    prepare();
  }, []);

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
          <AvaProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </AvaProvider>
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
