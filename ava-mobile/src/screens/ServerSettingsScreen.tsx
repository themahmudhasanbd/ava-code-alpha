import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Globe,
  HardDrive,
  LogOut,
  RefreshCw,
  ShieldAlert,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, SectionHeader, Surface } from "@/components/kit";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { useAva } from "@/state/ava-provider";
import { useDiagnostics } from "@/state/queries";

export function ServerSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { status, auth, signOut } = useAva();
  const { data: diagnostics, refetch, isFetching } = useDiagnostics();

  const isOnline = status === "online";
  const statusColor = isOnline
    ? colors.success
    : status === "connecting"
    ? colors.warning
    : colors.destructive;

  const handleSignOut = () => {
    Alert.alert(
      "Disconnect Server",
      "Are you sure you want to disconnect from this AVA server instance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const residentMemMb = diagnostics?.memoryBytes
    ? (diagnostics.memoryBytes / (1024 * 1024)).toFixed(1)
    : null;

  return (
    <AppShell
      title="Server Connection"
      showBack
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Server & Protocol"
          description="Live daemon status, connection health, and RPC diagnostics for AVA-RS."
        />

        {/* ── Status Banner ── */}
        <Surface style={[styles.statusCard, { borderColor: colors.glassBorder }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBox, { backgroundColor: `${statusColor}20` }]}>
              {isOnline ? (
                <CheckCircle2 size={20} color={statusColor} />
              ) : (
                <ShieldAlert size={20} color={statusColor} />
              )}
            </View>
            <View style={styles.statusTextCol}>
              <Text style={[styles.statusTitle, { color: colors.foreground }, font("semibold")]}>
                {isOnline ? "Connected & Healthy" : "Offline / Unreachable"}
              </Text>
              <Text style={[styles.statusSub, { color: colors.mutedForeground }, font("regular")]}>
                Status: {status.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: colors.secondary }]}
              onPress={() => refetch()}
              disabled={isFetching}
              activeOpacity={0.7}
            >
              {isFetching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={14} color={colors.secondaryForeground} />
              )}
            </TouchableOpacity>
          </View>
        </Surface>

        {/* ── Connection Details ── */}
        <View style={styles.section}>
          <SectionHeader icon={Globe} title="Active Endpoint" />

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.mutedForeground }, font("medium")]}>
                Host URL
              </Text>
              <Text style={[styles.detailVal, { color: colors.foreground }, mono("regular")]} numberOfLines={1}>
                {auth?.serverUrl || "http://127.0.0.1:4096"}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.mutedForeground }, font("medium")]}>
                User / Agent
              </Text>
              <Text style={[styles.detailVal, { color: colors.foreground }, font("medium")]}>
                {auth?.username || "Anonymous Admin"}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.mutedForeground }, font("medium")]}>
                Protocol Engine
              </Text>
              <Text style={[styles.detailVal, { color: colors.primary }, mono("medium")]}>
                AVA v2 app-server-protocol
              </Text>
            </View>
          </Surface>
        </View>

        {/* ── Host Process Diagnostics ── */}
        <View style={styles.section}>
          <SectionHeader icon={Activity} title="Daemon Diagnostics (ava-rs)" />

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <View style={styles.diagGrid}>
              <View style={[styles.diagTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Cpu size={16} color={colors.primary} />
                <Text style={[styles.diagLabel, { color: colors.mutedForeground }, font("regular")]}>
                  Process PID
                </Text>
                <Text style={[styles.diagNumber, { color: colors.foreground }, mono("semibold")]}>
                  {diagnostics?.processId ?? "Active"}
                </Text>
              </View>

              <View style={[styles.diagTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <HardDrive size={16} color={colors.primary} />
                <Text style={[styles.diagLabel, { color: colors.mutedForeground }, font("regular")]}>
                  RSS Memory
                </Text>
                <Text style={[styles.diagNumber, { color: colors.foreground }, mono("semibold")]}>
                  {residentMemMb ? `${residentMemMb} MB` : "Normal"}
                </Text>
              </View>
            </View>

            {diagnostics?.gauges && diagnostics.gauges.length > 0 && (
              <View style={styles.gaugesContainer}>
                <Text style={[styles.gaugeHeader, { color: colors.mutedForeground }, font("medium")]}>
                  Telemetry Gauges
                </Text>
                {diagnostics.gauges.map((g: { name: string; value: number }, idx: number) => (
                  <View key={idx} style={styles.gaugeRow}>
                    <Text style={[styles.gaugeName, { color: colors.foreground }, mono("regular")]}>
                      {g.name}
                    </Text>
                    <Text style={[styles.gaugeVal, { color: colors.primary }, mono("medium")]}>
                      {g.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Surface>
        </View>

        {/* ── Disconnect Action ── */}
        <TouchableOpacity
          style={[styles.disconnectBtn, { backgroundColor: `${colors.destructive}15`, borderColor: colors.destructive }]}
          onPress={handleSignOut}
          activeOpacity={0.75}
        >
          <LogOut size={16} color={colors.destructive} />
          <Text style={[styles.disconnectText, { color: colors.destructive }, font("medium")]}>
            Disconnect Server Session
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextCol: { flex: 1 },
  statusTitle: { fontSize: 14 },
  statusSub: { fontSize: 12, marginTop: 2 },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailKey: { fontSize: 12 },
  detailVal: { fontSize: 12.5, flexShrink: 1 },
  divider: { height: 1 },
  diagGrid: {
    flexDirection: "row",
    gap: 10,
  },
  diagTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  diagLabel: { fontSize: 11 },
  diagNumber: { fontSize: 14 },
  gaugesContainer: {
    gap: 6,
    marginTop: 6,
  },
  gaugeHeader: { fontSize: 11 },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gaugeName: { fontSize: 11 },
  gaugeVal: { fontSize: 11 },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  disconnectText: { fontSize: 13 },
});
