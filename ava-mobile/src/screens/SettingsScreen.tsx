import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Cpu,
  Folder,
  FolderGit2,
  HardDrive,
  Info,
  Radio,
  RotateCcw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useServerConfig } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

const SHORTCUTS = [
  { label: "ava-code", path: "/var/www/ava-code" },
  { label: "shared-media", path: "/root/shared-media" },
  { label: "/var/www", path: "/var/www" },
  { label: "/root", path: "/root" },
  { label: "Root /", path: "/" },
];

function SettingRow({
  label,
  value,
  subvalue,
  monoValue = false,
  highlight = false,
  onPress,
}: {
  label: string;
  value: string;
  subvalue?: string;
  monoValue?: boolean;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.settingRow}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={[styles.settingLabel, font("regular")]}>{label}</Text>
        {subvalue ? (
          <Text style={[styles.settingSubtext, font("regular")]}>{subvalue}</Text>
        ) : null}
      </View>
      <View style={styles.settingValueContainer}>
        <Text
          style={[
            styles.settingValue,
            monoValue ? mono("medium") : font("medium"),
            highlight && styles.settingValueHighlight,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {onPress ? <ChevronRight size={14} color={COLORS.mutedForeground} /> : null}
      </View>
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

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { auth, modelId, defaultCwd, workingCwd, setDefaultCwd, setWorkingCwd } = useAva();
  const { data, isLoading, error } = useServerConfig();

  const [inputCwd, setInputCwd] = useState(defaultCwd || APP.defaultCwd);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleSaveCwd = (pathToSave?: string) => {
    const finalPath = (pathToSave ?? inputCwd).trim().replace(/\/+$/, "") || "/";
    setDefaultCwd(finalPath);
    setWorkingCwd(finalPath);
    setInputCwd(finalPath);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  const handleResetCwd = () => {
    handleSaveCwd(APP.defaultCwd);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Local Cache",
      "This will invalidate client-side cache for sessions, files, models, and diagnostics.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            qc.clear();
            setCacheCleared(true);
            setTimeout(() => setCacheCleared(false), 2200);
          },
        },
      ]
    );
  };

  return (
    <AppShell title="Settings">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Settings & Workspace"
          description="Configure your workspace roots, server connection, and AI defaults."
        />

        {/* ── 1. Default Workspace Path ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <FolderGit2 size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Default Workspace Path</Text>
          </View>
          <Surface style={styles.workspaceCard}>
            <Text style={[styles.workspaceHelpText, font("regular")]}>
              Base directory used when launching new agent coding sessions, terminal windows, and file explorer.
            </Text>

            {/* Quick Shortcut Chips */}
            <View style={styles.shortcutRow}>
              {SHORTCUTS.map((sc) => {
                const isSelected = inputCwd === sc.path;
                return (
                  <TouchableOpacity
                    key={sc.path}
                    style={[styles.shortcutChip, isSelected && styles.shortcutChipSelected]}
                    onPress={() => {
                      setInputCwd(sc.path);
                      handleSaveCwd(sc.path);
                    }}
                    activeOpacity={0.7}
                  >
                    <Folder
                      size={12}
                      color={isSelected ? COLORS.primary : COLORS.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.shortcutChipText,
                        font("medium", sc.label),
                        isSelected && styles.shortcutChipTextSelected,
                      ]}
                    >
                      {sc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Path Input Field */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.pathInput, mono("regular")]}
                value={inputCwd}
                onChangeText={setInputCwd}
                placeholder="/var/www/ava-code"
                placeholderTextColor={COLORS.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Actions Row */}
            <View style={styles.workspaceActionsRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetCwd}
                activeOpacity={0.7}
              >
                <RotateCcw size={13} color={COLORS.mutedForeground} />
                <Text style={[styles.resetBtnText, font("medium")]}>Reset to Default</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, savedSuccess && styles.saveBtnSuccess]}
                onPress={() => handleSaveCwd()}
                activeOpacity={0.8}
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={[styles.saveBtnText, font("semibold")]}>Saved Path!</Text>
                  </>
                ) : (
                  <>
                    <Save size={14} color="#FFFFFF" />
                    <Text style={[styles.saveBtnText, font("semibold")]}>Save Workspace</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Surface>
        </View>

        {/* ── 2. Agent & Model Configuration ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Cpu size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Agent Runtime Configuration</Text>
          </View>
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
              <SettingRow
                label="Active Model"
                value={modelId || data.model || "—"}
                monoValue
                highlight
                subvalue="Tap to change active model or view catalog"
                onPress={() => navigation.navigate("Models")}
              />
              <SettingRow label="Model Provider" value={data.provider ?? "OmniRoute Gateway"} />
              <SettingRow
                label="Reasoning Effort"
                value={data.reasoningEffort ? data.reasoningEffort.toUpperCase() : "MAX"}
              />
              <SettingRow
                label="Approval Policy"
                value={data.approvalPolicy ? data.approvalPolicy.toUpperCase() : "NEVER"}
              />
              <SettingRow
                label="Sandbox Mode"
                value={data.sandboxMode ?? "danger-full-access"}
                monoValue
              />
              <SettingRow
                label="Context Window"
                value={data.contextWindow ? `${data.contextWindow.toLocaleString()} tokens` : "1,048,576 tokens"}
                monoValue
              />
            </Surface>
          )}
        </View>

        {/* ── 3. Connection & Client Information ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Radio size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Server Connection</Text>
          </View>
          <Surface style={styles.card}>
            <SettingRow label="Daemon URL" value={auth?.serverUrl || "ws://127.0.0.1:4096"} monoValue />
            <SettingRow label="Authenticated As" value={auth?.username || "root"} />
            <SettingRow label="Client Application" value={`${APP.name} v${APP.version}`} />
            <SettingRow label="Protocol Interface" value={APP.clientName} />
          </Surface>
        </View>

        {/* ── 4. App Maintenance & Storage ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <HardDrive size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>App Storage & Cache</Text>
          </View>
          <Surface style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.settingLabel, font("medium")]}>Local Query Cache</Text>
                <Text style={[styles.settingSubtext, font("regular")]}>
                  Invalidate cached responses, directory trees, and model catalog.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.clearCacheBtn, cacheCleared && styles.clearCacheBtnSuccess]}
                onPress={handleClearCache}
                activeOpacity={0.8}
              >
                {cacheCleared ? (
                  <>
                    <Check size={13} color="#FFFFFF" />
                    <Text style={[styles.clearCacheBtnText, font("semibold")]}>Cleared</Text>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} color={COLORS.destructive} />
                    <Text style={[styles.clearCacheBtnText, { color: COLORS.destructive }, font("semibold")]}>
                      Clear Cache
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Surface>
        </View>

        {/* ── 5. Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, font("regular")]}>
            {APP.name} Mobile v{APP.version} · Thunder Nexus VPS Ecosystem
          </Text>
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
  workspaceCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  workspaceHelpText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 17,
  },
  shortcutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  shortcutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutChipSelected: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderColor: COLORS.primary,
  },
  shortcutChipText: {
    fontSize: 11.5,
    color: COLORS.foreground,
  },
  shortcutChipTextSelected: {
    color: COLORS.primary,
  },
  inputContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pathInput: {
    fontSize: 13,
    color: COLORS.foreground,
    padding: 0,
  },
  workspaceActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  resetBtnText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveBtnSuccess: {
    backgroundColor: COLORS.success,
  },
  saveBtnText: {
    fontSize: 12.5,
    color: "#FFFFFF",
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  settingLabel: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  settingSubtext: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
  },
  settingValue: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  settingValueHighlight: {
    color: COLORS.primary,
  },
  clearCacheBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(231, 0, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(231, 0, 11, 0.20)",
  },
  clearCacheBtnSuccess: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  clearCacheBtnText: {
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
});
