import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Activity, RefreshCw } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  GlassIconButton,
  PageIntro,
  SkeletonRows,
  StatusDot,
  Surface,
} from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useDiagnostics, useServerConfig } from "@/state/queries";
import { COLORS } from "@/theme/colors";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Surface style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statVal} numberOfLines={1}>
        {value}
      </Text>
    </Surface>
  );
}

const GAUGE_LABELS: Record<string, string> = {
  "app.requests.in_flight": "Requests in flight",
  "app.requests.queued": "Queued requests",
  "core.threads.live": "Live sessions",
  "core.turns.active": "Active replies",
  "mcp.connections.live": "MCP connections",
};

export function SystemScreen() {
  const { status, auth } = useAva();
  const diag = useDiagnostics();
  const config = useServerConfig();

  const memory = diag.data?.memoryBytes
    ? `${(diag.data.memoryBytes / 1024 / 1024).toFixed(0)} MB`
    : "—";

  return (
    <AppShell
      title="System health"
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={18}
          onPress={() => void diag.refetch()}
          disabled={diag.isFetching}
        />
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="System health"
          description="Updates every few seconds."
        />

        <Surface style={styles.statusRow}>
          <StatusDot status={status} size={8} />
          <Text style={styles.statusText}>{status}</Text>
          <Text style={styles.serverHostText} numberOfLines={1}>
            {auth?.serverUrl}
          </Text>
        </Surface>

        <View style={styles.grid}>
          <Stat label="App version" value={`v${APP.version}`} />
          <Stat label="Server memory" value={memory} />
          <Stat
            label="Process"
            value={diag.data?.processId ? String(diag.data.processId) : "—"}
          />
          <Stat label="Model" value={config.data?.model ?? "—"} />
        </View>

        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {diag.isLoading && <SkeletonRows count={3} />}
          {diag.error && (
            <EmptyState
              icon={Activity}
              title="Could not read health"
              description={(diag.error as Error).message}
            />
          )}
          {!!diag.data?.gauges.length && (
            <Surface style={styles.gaugeCard}>
              {diag.data.gauges.map((g) => (
                <View key={g.name} style={styles.gaugeRow}>
                  <Text style={styles.gaugeName}>
                    {GAUGE_LABELS[g.name] ?? g.name}
                  </Text>
                  <Text style={styles.gaugeVal}>{g.value}</Text>
                </View>
              ))}
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
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    textTransform: "capitalize",
  },
  serverHostText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginLeft: "auto",
    maxWidth: "50%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  statVal: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 4,
  },
  activitySection: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
    paddingHorizontal: 4,
  },
  gaugeCard: {
    borderRadius: 16,
    padding: 4,
  },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  gaugeName: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  gaugeVal: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
});
