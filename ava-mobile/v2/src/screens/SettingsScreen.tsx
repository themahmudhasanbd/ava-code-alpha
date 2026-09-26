import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Folder, FolderGit2, RotateCcw, Save, Settings } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useServerConfig } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

const SHORTCUTS = [
  { label: "ava-code", path: "/var/www/ava-code" },
  { label: "shared-media", path: "/root/shared-media" },
  { label: "/var/www", path: "/var/www" },
  { label: "/root", path: "/root" },
  { label: "Root /", path: "/" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, font("regular")]}>{label}</Text>
      <Text style={[styles.value, font("medium")]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const { auth, modelId, defaultCwd, setDefaultCwd, setWorkingCwd } = useAva();
  const { data, isLoading, error } = useServerConfig();

  const [inputCwd, setInputCwd] = useState(defaultCwd || APP.defaultCwd);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  return (
    <AppShell title="Settings">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Settings"
          description="Workspace configuration and server parameters."
        />

        {/* ── 1. Default Workspace Configuration ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <FolderGit2 size={16} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Default Workspace Path</Text>
          </View>
          <Surface style={styles.workspaceCard}>
            <Text style={[styles.workspaceHelpText, font("regular")]}>
              Default root path for new coding sessions, file explorer, and terminal context.
            </Text>

            {/* Shortcut Chips */}
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
                    <Folder size={12} color={isSelected ? COLORS.primary : COLORS.mutedForeground} />
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

            {/* Path Input Box */}
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

            {/* Actions Bar */}
            <View style={styles.workspaceActionsRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetCwd}
                activeOpacity={0.7}
              >
                <RotateCcw size={13} color={COLORS.mutedForeground} />
                <Text style={[styles.resetBtnText, font("medium")]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, savedSuccess && styles.saveBtnSuccess]}
                onPress={() => handleSaveCwd()}
                activeOpacity={0.8}
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={[styles.saveBtnText, font("semibold")]}>Saved!</Text>
                  </>
                ) : (
                  <>
                    <Save size={14} color="#FFFFFF" />
                    <Text style={[styles.saveBtnText, font("semibold")]}>Save Default Path</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Surface>
        </View>

        {/* ── 2. Connection Info ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, font("semibold")]}>Connection</Text>
          <Surface style={styles.card}>
            <Row label="Server" value={auth?.serverUrl ?? "—"} />
            <Row label="Signed in as" value={auth?.username ?? "—"} />
            <Row label="App" value={`${APP.name} v${APP.version}`} />
            <Row label="Client" value={APP.clientName} />
          </Surface>
        </View>

        {/* ── 3. Agent & Model Configuration ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, font("semibold")]}>Agent Configuration</Text>
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
    gap: 18,
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
    fontWeight: "600",
    color: COLORS.foreground,
    paddingHorizontal: 2,
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
    fontWeight: "500",
    color: COLORS.foreground,
  },
  shortcutChipTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  inputContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
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
    fontWeight: "600",
    color: "#FFFFFF",
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
