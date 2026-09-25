import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Settings } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useServerConfig } from "@/state/queries";
import { COLORS } from "@/theme/colors";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const { auth, modelId } = useAva();
  const { data, isLoading, error } = useServerConfig();

  return (
    <AppShell title="Settings">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Settings"
          description="Read from your server's configuration."
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Surface style={styles.card}>
            <Row label="Server" value={auth?.serverUrl ?? "—"} />
            <Row label="Signed in as" value={auth?.username ?? "—"} />
            <Row label="App" value={`${APP.name} v${APP.version}`} />
            <Row label="Client" value={APP.clientName} />
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent</Text>
          {isLoading && <SkeletonRows count={3} />}
          {error && (
            <EmptyState
              icon={Settings}
              title="Could not read settings"
              description={(error as Error).message}
            />
          )}
          {data && (
            <Surface style={styles.card}>
              <Row
                label="Selected model"
                value={modelId || data.model || "—"}
              />
              <Row label="Provider" value={data.provider ?? "—"} />
              <Row label="Thinking effort" value={data.reasoningEffort ?? "—"} />
              <Row label="Approvals" value={data.approvalPolicy ?? "—"} />
              <Row label="Sandbox" value={data.sandboxMode ?? "—"} />
              <Row
                label="Context window"
                value={
                  data.contextWindow
                    ? `${data.contextWindow.toLocaleString()} tokens`
                    : "—"
                }
              />
            </Surface>
          )}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  label: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  value: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
    maxWidth: "60%",
  },
});
