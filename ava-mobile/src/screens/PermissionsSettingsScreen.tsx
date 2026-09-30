import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  BatteryCharging,
  Check,
  ExternalLink,
  Lock,
  Mic,
  Radio,
  Settings,
  ShieldCheck,
  Sliders,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, Surface } from "@/components/kit";
import { useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";
import { useServerConfig, useWriteConfig } from "@/state/queries";
import * as NativeAgent from "@/core/native-agent";
import { SANDBOX_MODES as SHARED_SANDBOX_MODES } from "@/config/models";

interface PolicyOption {
  value: string;
  label: string;
  desc: string;
}

const APPROVAL_POLICIES: PolicyOption[] = [
  {
    value: "untrusted",
    label: "Prompt on Untrusted Commands",
    desc: "Asks for user confirmation whenever a terminal command modifies system state outside the workspace.",
  },
  {
    value: "on-request",
    label: "Prompt On Request",
    desc: "Prompts only when the agent explicitly marks an action as high-risk or destructive.",
  },
  {
    value: "never",
    label: "Fully Autonomous (Never Prompt)",
    desc: "Executes tool calls and file operations directly without pausing for approval.",
  },
];

/** Screen-specific presentation; ids come from the single source in @/config/models. */
const SANDBOX_LABELS: Record<string, { label: string; desc: string }> = {
  "danger-full-access": {
    label: "Host Full Access",
    desc: "Direct access to host system, shells, network, and filesystems without sandbox barriers.",
  },
  "workspace-write": {
    label: "Workspace Write Only",
    desc: "Can read host files, but writes and mutations are constrained inside the active workspace.",
  },
  "read-only": {
    label: "Read Only",
    desc: "Safe mode: all file modifications and mutating commands are prevented.",
  },
};

const SANDBOX_MODES: PolicyOption[] = SHARED_SANDBOX_MODES.map((m) => ({
  value: m.id,
  label: SANDBOX_LABELS[m.id]?.label ?? m.label,
  desc: SANDBOX_LABELS[m.id]?.desc ?? m.description,
}));

export function PermissionsSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { data: serverConfig } = useServerConfig();
  const writeConfigMutation = useWriteConfig();

  const [activeApproval, setActiveApproval] = useState(
    serverConfig?.approvalPolicy || "untrusted"
  );
  const [activeSandbox, setActiveSandbox] = useState(
    serverConfig?.sandboxMode || "danger-full-access"
  );

  useEffect(() => {
    if (serverConfig?.approvalPolicy) {
      setActiveApproval(serverConfig.approvalPolicy);
    }
    if (serverConfig?.sandboxMode) {
      setActiveSandbox(serverConfig.sandboxMode);
    }
  }, [serverConfig?.approvalPolicy, serverConfig?.sandboxMode]);

  // Native permissions state
  const [permissions, setPermissions] = useState<{
    notifications: boolean;
    microphone: boolean;
    batteryOptimizationIgnored: boolean;
  } | null>(null);

  const checkNativeStatus = async () => {
    try {
      const res = await NativeAgent.checkPermissions();
      setPermissions(res);
    } catch {}
  };

  useEffect(() => {
    checkNativeStatus();
  }, []);

  const handleSelectApproval = async (val: string) => {
    const previous = activeApproval;
    setActiveApproval(val);
    try {
      const result = await writeConfigMutation.mutateAsync({ approval_policy: val });
      if (!result.success) {
        // Server rejected the write: roll back to the previous value.
        setActiveApproval(previous);
        Alert.alert(
          "Sync Error",
          `${result.error || "Failed to update approval policy"}. Previous value restored.`
        );
      }
    } catch (e: any) {
      setActiveApproval(previous);
      Alert.alert(
        "Sync Error",
        `${e?.message || "Failed to update approval policy"}. Previous value restored.`
      );
    }
  };

  const handleSelectSandbox = async (val: string) => {
    const previous = activeSandbox;
    setActiveSandbox(val);
    try {
      const result = await writeConfigMutation.mutateAsync({ sandbox_mode: val });
      if (!result.success) {
        // Server rejected the write: roll back to the previous value.
        setActiveSandbox(previous);
        Alert.alert(
          "Sync Error",
          `${result.error || "Failed to update sandbox mode"}. Previous value restored.`
        );
      }
    } catch (e: any) {
      setActiveSandbox(previous);
      Alert.alert(
        "Sync Error",
        `${e?.message || "Failed to update sandbox mode"}. Previous value restored.`
      );
    }
  };

  const handleRequestBattery = async () => {
    await NativeAgent.requestIgnoreBatteryOptimizations();
    await checkNativeStatus();
  };

  const notifGranted = permissions?.notifications;
  const micGranted = permissions?.microphone;
  const batteryExempt = permissions?.batteryOptimizationIgnored;

  return (
    <AppShell
      title="Permissions & Security"
      showBack
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Security & Permissions"
          description="Manage execution boundaries, command approvals, and mobile device capabilities."
        />

        {/* ── Command Approval Policy ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Command Approval Policy (ava-rs)
            </Text>
          </View>

          <View style={styles.cardsCol}>
            {APPROVAL_POLICIES.map((opt) => {
              const isSelected = activeApproval === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.policyCard,
                    {
                      backgroundColor: colors.glassBg,
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                    },
                    isSelected && { borderWidth: 1.6 },
                  ]}
                  onPress={() => handleSelectApproval(opt.value)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }, font("medium")]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Check size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }, font("regular")]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Sandbox Mode ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Sandbox Isolation
            </Text>
          </View>

          <View style={styles.cardsCol}>
            {SANDBOX_MODES.map((opt) => {
              const isSelected = activeSandbox === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.policyCard,
                    {
                      backgroundColor: colors.glassBg,
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                    },
                    isSelected && { borderWidth: 1.6 },
                  ]}
                  onPress={() => handleSelectSandbox(opt.value)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }, font("medium")]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Check size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }, font("regular")]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Mobile Device Permissions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sliders size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Mobile Device Hardware
            </Text>
          </View>

          <Surface style={[styles.nativeCard, { borderColor: colors.glassBorder }]}>
            {/* Notifications */}
            <View style={styles.nativeRow}>
              <View style={styles.nativeLeft}>
                <Radio size={16} color={colors.primary} />
                <View>
                  <Text style={[styles.nativeLabel, { color: colors.foreground }, font("medium")]}>
                    Push Notifications
                  </Text>
                  <Text style={[styles.nativeStatus, { color: notifGranted ? colors.success : colors.mutedForeground }, font("regular")]}>
                    {notifGranted ? "Granted" : "System Configured"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Microphone */}
            <View style={styles.nativeRow}>
              <View style={styles.nativeLeft}>
                <Mic size={16} color={colors.primary} />
                <View>
                  <Text style={[styles.nativeLabel, { color: colors.foreground }, font("medium")]}>
                    Microphone / Audio
                  </Text>
                  <Text style={[styles.nativeStatus, { color: micGranted ? colors.success : colors.mutedForeground }, font("regular")]}>
                    {micGranted ? "Granted" : "Available on Request"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Battery Optimization */}
            <View style={styles.nativeRow}>
              <View style={styles.nativeLeft}>
                <BatteryCharging size={16} color={colors.primary} />
                <View>
                  <Text style={[styles.nativeLabel, { color: colors.foreground }, font("medium")]}>
                    Background Keep-Alive
                  </Text>
                  <Text style={[styles.nativeStatus, { color: batteryExempt ? colors.success : colors.mutedForeground }, font("regular")]}>
                    {batteryExempt ? "Exempt / Continuous" : "Standard Battery"}
                  </Text>
                </View>
              </View>
              {!batteryExempt && (
                <TouchableOpacity
                  style={[styles.grantBtn, { backgroundColor: colors.secondary }]}
                  onPress={handleRequestBattery}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.grantBtnText, { color: colors.secondaryForeground }, font("medium")]}>
                    Optimize
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Surface>

          <TouchableOpacity
            style={[styles.appSettingsLink, { borderColor: colors.border }]}
            onPress={() => NativeAgent.openAppSettings()}
            activeOpacity={0.7}
          >
            <Settings size={14} color={colors.mutedForeground} />
            <Text style={[styles.appSettingsText, { color: colors.mutedForeground }, font("medium")]}>
              Open Android System App Settings
            </Text>
            <ExternalLink size={12} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 13.5 },
  cardsCol: { gap: 8 },
  policyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 13.5 },
  cardDesc: { fontSize: 11.5, lineHeight: 16 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  nativeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nativeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nativeLabel: { fontSize: 13 },
  nativeStatus: { fontSize: 11, marginTop: 1 },
  grantBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  grantBtnText: { fontSize: 11.5 },
  divider: { height: 1 },
  appSettingsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  appSettingsText: { fontSize: 12 },
});
