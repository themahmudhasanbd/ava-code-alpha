import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/kit";
import { BrowserLiveView } from "@/components/browser/BrowserLiveView";

export function BrowserScreen() {
  const navigation = useNavigation<any>();
  const [frameData, setFrameData] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = () => {
    // MVP: navigate to chat so the user can ask the agent to browse.
    // The agent's browser tool now supports the 'live_frame' action, and
    // frames captured during browsing will be available here once the
    // frame-push channel is wired.
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // For now, direct the user to chat to start a browsing session.
      navigation.navigate("Main", { screen: "Chat" });
    }, 400);
  };

  const handleStop = () => {
    setIsLive(false);
  };

  return (
    <AppShell title="Web Browser">
      <View style={styles.container}>
        <Surface style={styles.card}>
          <BrowserLiveView
            frameData={frameData}
            isLive={isLive}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            onStop={handleStop}
          />
        </Surface>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
});
