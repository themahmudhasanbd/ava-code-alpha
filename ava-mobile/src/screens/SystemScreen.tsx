import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Activity,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react-native";
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
import { useDiagnostics, useMcpServers, useServerConfig, useSessions } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

function StatCard({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: any;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <Surface style={styles.statCard}>
      <View style={styles.statTopRow}>
        <View style={styles.statIconBox}>
          <Icon size={14} color={COLORS.primary} />
        </View>
        <Text style={[styles.statLabel, font("medium")]}>{label}</Text>
      </View>
      <Text style={[styles.statVal, mono("bold")]} numberOfLines={1}>
        {value}
      </Text>
      {subvalue ? (
        <Text style={[styles.statSubval, font("regular")]} numberOfLines={1}>
          {subvalue}
        </Text>
      ) : null}
    </Surface>
  );
}

const GAUGE_META: Record<
  string,
  { label: string; icon: any; unit: string; normalMax: number }
> = {
  "app.requests.in_flight": {
    label: "Requests In Flight",
    icon: Zap,
    unit: "req",
    normalMax: 10,
  },
  "app.requests.queued": {
    label: "Queued Requests",
    icon: Layers,
    unit: "queued",
    normalMax: 5,
  },
  "core.threads.live": {
    label: "Live Active Sessions",
    icon: Radio,
    unit: "sessions",
    normalMax: 8,
  },
  "core.turns.active": {
    label: "Active Agent Replies",
    icon: Activity,
    unit: "turns",
    normalMax: 4,
  },
  "mcp.connections.live": {
    label: "MCP Connections",
    icon: Server,
    unit: "mcp",
    normalMax: 6,
  },
};

export function SystemScreen() {
  const { status, auth } = useAva();
  const diag = useDiagnostics();
  const config = useServerConfig();
  const mcp = useMcpServers();
  const sessions = useSessions();

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void diag.refetch();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, diag]);

  const memory = diag.data?.memoryBytes
    ? `${(diag.data.memoryBytes / 1024 / 1024).toFixed(1)} MB`
    : "—";

  const mcpList = mcp.data || [];
  const activeMcpCount = mcpList.filter((s) => s.status === "ready").length;

  return (
    <AppShell
      title="System health"
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={16}
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
          title="System Health & Telemetry"
          description="Real-time execution metrics, daemon telemetry, and server health."
        />

        {/* ── 1. Connection Status Hero ── */}
        <Surface style={styles.statusHeroCard}>
          <View style={styles.statusHeroLeft}>
            <View style={styles.pulseContainer}>
              <StatusDot status={status} size={10} />
            </View>
            <View>
              <View style={styles.statusTitleRow}>
                <Text style={[styles.statusTitle, font("semibold")]}>
                  AvA Server {status === "online" ? "Connected" : status}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    status === "online" ? styles.statusBadgeOnline : styles.statusBadgeOffline,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      mono("bold"),
                      status === "online" && { color: COLORS.success },
                    ]}
                  >
                    {status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.serverHostText, mono("regular")]} numberOfLines={1}>
                {auth?.serverUrl || "ws://127.0.0.1:4096"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.autoRefreshToggle, autoRefresh && styles.autoRefreshActive]}
            onPress={() => setAutoRefresh((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.autoRefreshText,
                font("medium"),
                autoRefresh && styles.autoRefreshTextActive,
              ]}
            >
              {autoRefresh ? "Live 4s" : "Paused"}
            </Text>
          </TouchableOpacity>
        </Surface>

        {/* ── 2. Primary Stat Grid ── */}
        <View style={styles.grid}>
          <StatCard
            icon={Cpu}
            label="Process PID"
            value={diag.data?.processId ? `#${diag.data.processId}` : "—"}
            subvalue="ava-server daemon"
          />
          <StatCard
            icon={HardDrive}
            label="Resident Memory"
            value={memory}
            subvalue="Process RAM footprint"
          />
          <StatCard
            icon={Server}
            label="Active Model"
            value={config.data?.model || "ultra-working-combo"}
            subvalue={config.data?.provider || "omniroute"}
          />
          <StatCard
            icon={Layers}
            label="Ecosystem Version"
            value={`v${APP.version}`}
            subvalue={APP.clientName}
          />
        </View>

        {/* ── 3. Real-time Activity Gauges ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Activity size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Execution Gauges</Text>
          </View>

          {diag.isLoading && !diag.data && <SkeletonRows count={3} />}
          {diag.error && (
            <EmptyState
              icon={Activity}
              title="Could not read server diagnostics"
              description={(diag.error as Error).message}
            />
          )}

          {!!diag.data?.gauges?.length && (
            <Surface style={styles.gaugesContainer}>
              {diag.data.gauges.map((g) => {
                const meta = GAUGE_META[g.name] || {
                  label: g.name,
                  icon: Activity,
                  unit: "units",
                  normalMax: 10,
                };
                const Icon = meta.icon;
                const ratio = Math.min(1, Math.max(0.08, g.value / (meta.normalMax || 1)));

                return (
                  <View key={g.name} style={styles.gaugeRow}>
                    <View style={styles.gaugeIconBox}>
                      <Icon size={14} color={COLORS.secondaryForeground} />
                    </View>
                    <View style={styles.gaugeInfo}>
                      <View style={styles.gaugeLabelRow}>
                        <Text style={[styles.gaugeName, font("medium")]}>{meta.label}</Text>
                        <Text style={[styles.gaugeVal, mono("bold")]}>
                          {g.value}{" "}
                          <Text style={[styles.gaugeUnit, font("regular")]}>{meta.unit}</Text>
                        </Text>
                      </View>
                      <View style={styles.gaugeTrack}>
                        <View
                          style={[
                            styles.gaugeFill,
                            { width: `${ratio * 100}%` },
                            g.value > 0 ? styles.gaugeFillActive : null,
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </Surface>
          )}
        </View>

        {/* ── 4. Ecosystem & Subsystem Health ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Ecosystem Services</Text>
          </View>

          <Surface style={styles.card}>
            <View style={styles.serviceRow}>
              <View style={styles.serviceIconCol}>
                <Globe size={15} color={COLORS.primary} />
              </View>
              <View style={styles.serviceInfoCol}>
                <Text style={[styles.serviceTitle, font("semibold")]}>OmniRoute Gateway</Text>
                <Text style={[styles.serviceDesc, mono("regular")]}>http://127.0.0.1:20128/v1</Text>
              </View>
              <View style={[styles.serviceBadge, styles.statusBadgeOnline]}>
                <Text style={[styles.serviceBadgeText, mono("bold")]}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.serviceRow}>
              <View style={styles.serviceIconCol}>
                <Server size={15} color={COLORS.primary} />
              </View>
              <View style={styles.serviceInfoCol}>
                <Text style={[styles.serviceTitle, font("semibold")]}>MCP Bridge & Servers</Text>
                <Text style={[styles.serviceDesc, font("regular")]}>
                  {mcpList.length ? `${activeMcpCount} of ${mcpList.length} servers online` : "Checking servers..."}
                </Text>
              </View>
              <View style={[styles.serviceBadge, styles.statusBadgeOnline]}>
                <Text style={[styles.serviceBadgeText, mono("bold")]}>
                  {activeMcpCount > 0 ? "READY" : "STANDBY"}
                </Text>
              </View>
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.serviceRow}>
              <View style={styles.serviceIconCol}>
                <Database size={15} color={COLORS.primary} />
              </View>
              <View style={styles.serviceInfoCol}>
                <Text style={[styles.serviceTitle, font("semibold")]}>Persistent Memory Engine</Text>
                <Text style={[styles.serviceDesc, font("regular")]}>SQLite FTS5 Native Storage</Text>
              </View>
              <View style={[styles.serviceBadge, styles.statusBadgeOnline]}>
                <Text style={[styles.serviceBadgeText, mono("bold")]}>SYNCED</Text>
              </View>
            </View>
          </Surface>
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
    paddingBottom: 40,
    gap: 16,
  },
  statusHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statusHeroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pulseContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeOnline: {
    backgroundColor: "rgba(59, 179, 96, 0.12)",
  },
  statusBadgeOffline: {
    backgroundColor: "rgba(231, 0, 11, 0.12)",
  },
  statusBadgeText: {
    fontSize: 10,
    color: COLORS.success,
  },
  serverHostText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  autoRefreshToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  autoRefreshActive: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderColor: COLORS.primary,
  },
  autoRefreshText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  autoRefreshTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48.5%",
    padding: 12,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(66, 64, 225, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  statVal: {
    fontSize: 15,
    color: COLORS.foreground,
    marginTop: 2,
  },
  statSubval: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  gaugesContainer: {
    borderRadius: 18,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gaugeIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInfo: {
    flex: 1,
    gap: 5,
  },
  gaugeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gaugeName: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  gaugeVal: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  gaugeUnit: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  gaugeTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: COLORS.mutedForeground,
  },
  gaugeFillActive: {
    backgroundColor: COLORS.primary,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  serviceIconCol: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfoCol: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  serviceDesc: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceBadgeText: {
    fontSize: 10,
    color: COLORS.success,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 4,
  },
});
