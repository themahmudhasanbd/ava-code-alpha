import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  BellRing,
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
import { PageIntro, SectionHeader, Surface } from "@/components/kit";
import { type ColorTokens } from "@/theme/colors";
import { useStyles, useTheme } from "@/theme/theme-context";
import { font, mono } from "@/theme/fonts";
import { storage } from "@/core/storage";
import { getSavedPushToken } from "@/core/notifications";
import * as NativeAgent from "@/core/native-agent";

const ONGOING_PREF_KEY = "ava.notifications.ongoing";
const isAndroid = Platform.OS === "android";

interface PermissionStatus {
  notifications: boolean;
  microphone: boolean;
  batteryOptimizationIgnored: boolean;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeFail]}>
      {ok ? (
        <CheckCircle2 size={12} color={colors.success} />
      ) : (
        <XCircle size={12} color={colors.destructive} />
      )}
      <Text style={[styles.badgeText, { color: ok ? colors.success : colors.destructive }]}>
        {label}
      </Text>
    </View>
  );
}

function FeatureBadge({ label, active }: { label: string; active?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View
      style={[
        styles.featureBadge,
        !active && { backgroundColor: colors.warning + "1F" },
      ]}
    >
      <Text
        style={[
          styles.featureText,
          mono("bold"),
          !active && { color: colors.warning },
        ]}
      >
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
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  const tint = iconColor || colors.primary;
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint + "12" }]}>
        <Icon size={16} color={tint} />
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
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [ongoingEnabled, setOngoingEnabled] = useState(
    () => storage.get(ONGOING_PREF_KEY) !== "0"
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const perm = await NativeAgent.checkPermissions();
    setPermissions(perm);
    setFcmToken(getSavedPushToken());
    setLoading(false);
  };

  const handleToggleOngoing = (value: boolean) => {
    setOngoingEnabled(value);
    storage.set(ONGOING_PREF_KEY, value ? "1" : "0");
    // TODO: gate foreground-service startup in the chat/agent flow on this
    // preference. The native module currently starts the service unconditionally.
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
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[{ fontSize: 12, color: colors.mutedForeground, marginTop: 6 }, font("regular")]}>Checking permissions…</Text>
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
                <Text style={[styles.statusLabel, font("medium")]}>Microphone</Text>
                <View style={styles.statusBadges}>
                  <StatusBadge
                    ok={permissions?.microphone ?? false}
                    label={permissions?.microphone ? "Granted" : "Not granted"}
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
          <SectionHeader
            icon={Bell}
            title="Ongoing Agent Notification"
            description="Shows a pinned notification with live timer while the agent is executing. Keeps the app alive in background."
          />

          <Surface style={styles.card}>
            <SettingRow
              icon={Bell}
              iconColor={colors.primary}
              title="Show Ongoing Notification"
              subtitle="Pinned notification with live chronometer during agent turns"
              trailing={
                <Switch
                  value={ongoingEnabled}
                  onValueChange={handleToggleOngoing}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.primaryForeground}
                />
              }
            />

            <SettingRow
              icon={Clock}
              iconColor={colors.accentForeground}
              title="Live Timer"
              subtitle="Native Android chronometer counting elapsed time"
              trailing={
                <FeatureBadge
                  label={isAndroid ? "AUTO" : "N/A"}
                  active={isAndroid}
                />
              }
            />

            <SettingRow
              icon={Zap}
              iconColor={colors.success}
              title="Foreground Service"
              subtitle="Prevents Android from killing the app during long tasks"
              trailing={
                <FeatureBadge
                  label={isAndroid ? "SUPPORTED" : "N/A"}
                  active={isAndroid}
                />
              }
            />
          </Surface>
        </View>

        {/* ── Push Notifications (Firebase) ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={BellRing}
            title="Push Notifications (Firebase)"
            description="Receive notifications when agent tasks complete, even if the app is closed."
          />

          <Surface style={styles.card}>
            <SettingRow
              icon={Smartphone}
              iconColor={colors.mascot}
              title="Firebase Cloud Messaging"
              subtitle="google-services.json configured for project ava-code"
              trailing={
                <FeatureBadge
                  label={isAndroid ? "READY" : "N/A"}
                  active={isAndroid}
                />
              }
            />

            <SettingRow
              icon={Shield}
              iconColor={colors.warning}
              title="FCM Token Registration"
              subtitle={fcmToken ? "Device token saved locally" : "No device token registered yet"}
              trailing={
                <FeatureBadge
                  label={fcmToken ? "SYNCED" : "PENDING"}
                  active={!!fcmToken}
                />
              }
            />

            <SettingRow
              icon={Info}
              iconColor={colors.mutedForeground}
              title="Server-Side Integration"
              subtitle="FCM token registration endpoint needs to be enabled on server"
              trailing={<FeatureBadge label="PENDING" active={false} />}
            />
          </Surface>
        </View>

        {/* ── Actions ── */}
        <View style={styles.section}>
          <SectionHeader icon={Zap} title="Actions" />

          <Surface style={styles.card}>
            <SettingRow
              icon={Shield}
              iconColor={colors.warning}
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
              iconColor={colors.destructive}
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
          <Info size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, font("regular")]}>
            For push notifications to work when the app is completely killed, the server needs an FCM token registration endpoint. Currently, local notifications and the foreground service handle all in-app and background scenarios.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const createStyles = (c: ColorTokens) =>
  StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, color: c.foreground },
  rowSubtitle: { fontSize: 11, color: c.mutedForeground, lineHeight: 15 },
  statusCard: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: c.glassBorder },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { fontSize: 13, color: c.foreground },
  statusBadges: { flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOk: { backgroundColor: c.success + "1A" },
  badgeFail: { backgroundColor: c.destructive + "1A" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: c.secondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  featureText: { fontSize: 10, color: c.mutedForeground },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.secondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionText: { fontSize: 12, color: c.foreground },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: c.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  infoText: { flex: 1, fontSize: 11, color: c.mutedForeground, lineHeight: 16 },
  });