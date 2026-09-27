import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Info,
  Shield,
  Smartphone,
  XCircle,
  Zap,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import * as NativeAgent from "@/core/native-agent";

interface PermissionStatus {
  notifications: boolean;
  microphone: boolean;
  batteryOptimizationIgnored: boolean;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeFail]}>
      {ok ? (
        <CheckCircle2 size={12} color={COLORS.success} />
      ) : (
        <XCircle size={12} color={COLORS.destructive} />
      )}
      <Text style={[styles.badgeText, { color: ok ? COLORS.success : COLORS.destructive }]}>
        {label}
      </Text>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: typeof Bell;
  iconColor?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor || COLORS.primary}12` }]}>
        <Icon size={16} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, font("medium")]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, font("regular")]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [ongoingEnabled, setOngoingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const perm = await NativeAgent.checkPermissions();
    setPermissions(perm);
    setLoading(false);
  };

  const handleRequestBattery = async () => {
    const ok = await NativeAgent.requestIgnoreBatteryOptimizations();
    if (ok) {
      Alert.alert("Battery Optimization", "Please select 'Allow' for AvA Code to keep running in background.");
    }
  };

  const handleOpenSettings = async () => {
    await NativeAgent.openAppSettings();
  };

  return (
    <AppShell title="Notifications" showBack onBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Notifications & Background"
          description="Configure how AvA Code notifies you and stays alive during agent execution."
        />

        {/* ── Status Overview ── */}
        <Surface style={styles.statusCard}>
          {loading ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[{ fontSize: 12, color: COLORS.mutedForeground, marginTop: 6 }, font("regular")]}>Checking permissions…</Text>
            </View>
          ) : (
            <>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, font("medium")]}>System Status</Text>
                <View style={styles.statusBadges}>
                  <StatusBadge
                    ok={permissions?.notifications ?? false}
                    label={permissions?.notifications ? "Allowed" : "Blocked"}
                  />
                </View>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, font("medium")]}>Battery Optimization</Text>
                <View style={styles.statusBadges}>
                  <StatusBadge
                    ok={permissions?.batteryOptimizationIgnored ?? false}
                    label={permissions?.batteryOptimizationIgnored ? "Exempt" : "Active"}
                  />
                </View>
              </View>
            </>
          )}
        </Surface>

        {/* ── Ongoing Notification ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, font("semibold")]}>Ongoing Agent Notification</Text>
          <Text style={[styles.sectionDesc, font("regular")]}>
            Shows a pinned notification with live timer while the agent is executing. Keeps the app alive in background.
          </Text>

          <Surface style={styles.card}>
            <SettingRow
              icon={Bell}
              iconColor={COLORS.primary}
              title="Show Ongoing Notification"
              subtitle="Pinned notification with live chronometer during agent turns"
              trailing={
                <Switch
                  value={ongoingEnabled}
                  onValueChange={setOngoingEnabled}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />

            <SettingRow
              icon={Clock}
              iconColor="#0284C7"
              title="Live Timer"
              subtitle="Native Android chronometer counting elapsed time"
              trailing={
                <View style={styles.featureBadge}>
                  <Text style={[styles.featureText, mono("bold")]}>AUTO</Text>
                </View>
              }
            />

            <SettingRow
              icon={Zap}
              iconColor="#059669"
              title="Foreground Service"
              subtitle="Prevents Android from killing the app during long tasks"
              trailing={
                <View style={styles.featureBadge}>
                  <Text style={[styles.featureText, mono("bold")]}>ACTIVE</Text>
                </View>
              }
            />
          </Surface>
        </View>

        {/* ── Push Notifications (Firebase) ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, font("semibold")]}>Push Notifications (Firebase)</Text>
          <Text style={[styles.sectionDesc, font("regular")]}>
            Receive notifications when agent tasks complete, even if the app is closed.
          </Text>

          <Surface style={styles.card}>
            <SettingRow
              icon={Smartphone}
              iconColor="#7C3AED"
              title="Firebase Cloud Messaging"
              subtitle="google-services.json configured for project ava-code"
              trailing={
                <View style={styles.featureBadge}>
                  <Text style={[styles.featureText, mono("bold")]}>READY</Text>
                </View>
              }
            />

            <SettingRow
              icon={Shield}
              iconColor="#D97706"
              title="FCM Token Registration"
              subtitle="Device token synced with server for push delivery"
              trailing={
                <View style={styles.featureBadge}>
                  <Text style={[styles.featureText, mono("bold")]}>PENDING</Text>
                </View>
              }
            />

            <SettingRow
              icon={Info}
              iconColor={COLORS.mutedForeground}
              title="Server-Side Integration"
              subtitle="FCM token registration endpoint needs to be enabled on server"
              trailing={
                <View style={[styles.featureBadge, { backgroundColor: "rgba(234,179,43,0.12)" }]}>
                  <Text style={[styles.featureText, mono("bold"), { color: COLORS.warning }]}>PENDING</Text>
                </View>
              }
            />
          </Surface>
        </View>

        {/* ── Actions ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, font("semibold")]}>Actions</Text>

          <Surface style={styles.card}>
            <SettingRow
              icon={Shield}
              iconColor="#D97706"
              title="Request Battery Exemption"
              subtitle="Ask Android to stop killing AvA Code in background"
              trailing={
                <TouchableOpacity style={styles.actionBtn} onPress={handleRequestBattery}>
                  <Text style={[styles.actionText, font("medium")]}>Request</Text>
                </TouchableOpacity>
              }
            />

            <SettingRow
              icon={BellOff}
              iconColor={COLORS.destructive}
              title="Open System Settings"
              subtitle="Manually configure notification and battery permissions"
              trailing={
                <TouchableOpacity style={styles.actionBtn} onPress={handleOpenSettings}>
                  <Text style={[styles.actionText, font("medium")]}>Open</Text>
                </TouchableOpacity>
              }
            />
          </Surface>
        </View>

        {/* ── Info ── */}
        <View style={styles.infoBox}>
          <Info size={14} color={COLORS.mutedForeground} />
          <Text style={[styles.infoText, font("regular")]}>
            For push notifications to work when the app is completely killed, the server needs an FCM token registration endpoint. Currently, local notifications and the foreground service handle all in-app and background scenarios.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, color: COLORS.foreground, paddingHorizontal: 4 },
  sectionDesc: { fontSize: 12, color: COLORS.mutedForeground, paddingHorizontal: 4, lineHeight: 17 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, color: COLORS.foreground },
  rowSubtitle: { fontSize: 11, color: COLORS.mutedForeground, lineHeight: 15 },
  statusCard: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.glassBorder },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { fontSize: 13, color: COLORS.foreground },
  statusBadges: { flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOk: { backgroundColor: "rgba(59,179,96,0.1)" },
  badgeFail: { backgroundColor: "rgba(231,0,11,0.1)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureText: { fontSize: 10, color: COLORS.mutedForeground },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { fontSize: 12, color: COLORS.foreground },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: { flex: 1, fontSize: 11, color: COLORS.mutedForeground, lineHeight: 16 },
});