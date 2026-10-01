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
import {
  Check,
  FileCode2,
  FolderOpen,
  Save,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, SectionHeader, Surface } from "@/components/kit";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { APP } from "@/config/app";
import { getMetadata } from "@/core/api/files";
import { useAva } from "@/state/ava-provider";
import { useServerConfig, useWriteConfig } from "@/state/queries";

const DOC_LIMIT_OPTIONS = [
  { label: "16 KB", value: 16 * 1024 },
  { label: "32 KB (Default)", value: 32 * 1024 },
  { label: "64 KB", value: 64 * 1024 },
  { label: "128 KB", value: 128 * 1024 },
];

export function WorkspaceSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { workingCwd, setWorkingCwd, rpc, status } = useAva();
  const { data: serverConfig } = useServerConfig();
  const writeConfigMutation = useWriteConfig();

  const [cwdInput, setCwdInput] = useState(workingCwd || APP.defaultCwd);
  const [docLimit, setDocLimit] = useState<number>(
    serverConfig?.projectDocMaxBytes ?? 32 * 1024
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleApplyCwd = async (newPath: string) => {
    const trimmed = newPath.trim();
    if (!trimmed) {
      Alert.alert("Invalid Path", "Please enter a directory path.");
      return;
    }
    // Validate the path on the server before making it the working directory.
    if (rpc && status === "online") {
      try {
        const meta = await getMetadata(rpc, trimmed);
        if (!meta.isDirectory) {
          Alert.alert("Invalid Path", `"${trimmed}" exists on the server but is not a directory.`);
          return;
        }
      } catch {
        Alert.alert("Invalid Path", `The path "${trimmed}" does not exist on the server.`);
        return;
      }
    }
    setCwdInput(trimmed);
    setWorkingCwd(trimmed);
    Alert.alert("Workspace CWD Updated", `Active path set to:\n${trimmed}`);
  };

  const handleSaveDocLimit = async (limitBytes: number) => {
    const previous = docLimit;
    setDocLimit(limitBytes);
    setIsSaving(true);
    try {
      const result = await writeConfigMutation.mutateAsync({
        project_doc_max_bytes: limitBytes,
      });
      if (!result.success) {
        // Server rejected the write: roll back to the previous value.
        setDocLimit(previous);
        Alert.alert(
          "Save Failed",
          `${result.error || "Could not persist project_doc_max_bytes to the server."} Previous value restored.`
        );
      }
    } catch (e: any) {
      setDocLimit(previous);
      Alert.alert(
        "Save Failed",
        `${e?.message || "Could not persist project_doc_max_bytes to the server."} Previous value restored.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Workspace Settings"
      showBack
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Workspace & Project"
          description="Configure the default working directory and workspace indexing constraints for AVA-RS."
        />

        {/* ── Active CWD Setting ── */}
        <View style={styles.section}>
          <SectionHeader icon={FolderOpen} title="Default Working Directory (CWD)" />

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }, font("regular")]}>
              Commands, git tracking, and file explorer will initiate from this path.
            </Text>

            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }, mono("regular")]}
                value={cwdInput}
                onChangeText={setCwdInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={APP.defaultCwd}
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleApplyCwd(cwdInput)}
                activeOpacity={0.8}
              >
                <Save size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </Surface>
        </View>

        {/* ── Project Doc Byte Limit ── */}
        <View style={styles.section}>
          <SectionHeader icon={FileCode2} title="Project Documentation Limit" />

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }, font("regular")]}>
              Controls maximum bytes read from project-level instruction files (e.g. AGENTS.md, context.md) into agent context.
            </Text>

            <View style={styles.docGrid}>
              {DOC_LIMIT_OPTIONS.map((opt) => {
                const isSelected = docLimit === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.docOption,
                      {
                        backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSaveDocLimit(opt.value)}
                    disabled={isSaving}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.docOptionText,
                        { color: isSelected ? colors.primary : colors.foreground },
                        font(isSelected ? "semibold" : "regular"),
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={13} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Surface>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  fieldHint: { fontSize: 12, lineHeight: 17 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 12.5,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  docGrid: { gap: 8 },
  docOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  docOptionText: { fontSize: 12 },
});
