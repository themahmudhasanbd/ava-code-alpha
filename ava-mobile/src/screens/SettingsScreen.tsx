import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  Cpu,
  Database,
  FolderGit2,
  Paintbrush,
  Palette,
  Server,
  Settings2,
  Shield,
  Trash2,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, SectionHeader, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

function NavTile({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tint = iconColor || colors.primary;

  return (
    <TouchableOpacity
      style={[styles.tile, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${tint}15` }]}>
        <Icon size={18} color={tint} />
      </View>
      <View style={styles.tileContent}>
        <Text style={[styles.tileTitle, { color: colors.foreground }, font("semibold")]}>
          {title}
        </Text>
        <Text
          style={[styles.tileSubtitle, { color: colors.mutedForeground }, font("regular")]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function QuickRow({
  label,
  value,
  monoValue,
  last,
}: {
  label: string;
  value: string;
  monoValue?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.quickRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.quickLabel, { color: colors.mutedForeground }, font("regular")]}>
        {label}
      </Text>
      <Text
        style={[
          styles.quickValue,
          { color: colors.foreground },
          monoValue ? mono("medium") : font("medium"),
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { auth, modelId } = useAva();
  const { colors, theme, resolvedTheme } = useTheme();

  const handleClearCache = () => {
    Alert.alert(
      "Clear Local Cache",
      "Invalidate client-side cache for sessions, files, and server queries.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            qc.clear();
            Alert.alert("Cleared", "Local query cache emptied.");
          },
        },
      ]
    );
  };

  const themeLabel =
    theme === "system"
      ? `System Match (${resolvedTheme})`
      : theme === "dark"
      ? "Obsidian Dark"
      : "Alabaster Light";

  return (
    <AppShell title="Settings">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Settings"
          description="Configure AvA Code, models, appearance, workspace, and native integrations."
        />

        {/* ── Quick Info Card ── */}
        <Surface style={[styles.quickCard, { borderColor: colors.glassBorder }]}>
          <QuickRow
            label="Server"
            value={auth?.serverUrl?.replace(/^https?:\/\//, "") || "127.0.0.1:4096"}
          />
          <QuickRow label="Active Model" value={modelId || "Server Default"} monoValue />
          <QuickRow label="Appearance" value={themeLabel} />
          <QuickRow label="Client" value={`${APP.name} Mobile v${APP.version}`} last />
        </Surface>

        {/* ── Appearance & UI ── */}
        <View style={styles.section}>
          <SectionHeader icon={Palette} title="Appearance & UI" />
          <Surface style={[styles.tileGroup, { borderColor: colors.glassBorder }]}>
            <NavTile
              icon={Paintbrush}
              iconColor={colors.primary}
              title="Appearance & Theme"
              subtitle={`Active: ${themeLabel}`}
              onPress={() => navigation.navigate("AppearanceSettings")}
            />
          </Surface>
        </View>

        {/* ── AI & Workspace ── */}
        <View style={styles.section}>
          <SectionHeader icon={Settings2} title="Configuration" />
          <Surface style={[styles.tileGroup, { borderColor: colors.glassBorder }]}>
            <NavTile
              icon={Cpu}
              iconColor={colors.primary}
              title="Models & Reasoning"
              subtitle="Active LLM, reasoning effort, context window"
              onPress={() => navigation.navigate("Models")}
            />
            <NavTile
              icon={FolderGit2}
              iconColor={colors.success}
              title="Workspace"
              subtitle="Default directory, path shortcuts, context docs"
              onPress={() => navigation.navigate("WorkspaceSettings")}
            />
            <NavTile
              icon={Server}
              iconColor={colors.primary}
              title="Server & Protocol"
              subtitle="Daemon status, RSS memory, RPC telemetry"
              onPress={() => navigation.navigate("ServerSettings")}
            />
          </Surface>
        </View>

        {/* ── System & Permissions ── */}
        <View style={styles.section}>
          <SectionHeader icon={Shield} title="System & Policies" />
          <Surface style={[styles.tileGroup, { borderColor: colors.glassBorder }]}>
            <NavTile
              icon={Bell}
              iconColor={colors.primary}
              title="Notifications"
              subtitle="Foreground service, push alerts, native channels"
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <NavTile
              icon={Shield}
              iconColor={colors.warning}
              title="Permissions & Security"
              subtitle="Approval policy, sandbox boundaries, hardware"
              onPress={() => navigation.navigate("PermissionsSettings")}
            />
            <NavTile
              icon={Database}
              iconColor={colors.primary}
              title="Storage & Cache"
              subtitle="Inspect local keys, clear offline queries, reset"
              onPress={() => navigation.navigate("StorageSettings")}
            />
          </Surface>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <SectionHeader icon={User} title="Account" />
          <Surface style={[styles.tileGroup, { borderColor: colors.glassBorder }]}>
            <NavTile
              icon={User}
              iconColor={colors.primary}
              title="Profile & Preferences"
              subtitle="Account identity, agent parameters, session tokens"
              onPress={() => navigation.navigate("Profile")}
            />
          </Surface>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <SectionHeader icon={Zap} title="Quick Actions" />
          <Surface style={[styles.tileGroup, { borderColor: colors.glassBorder }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleClearCache}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={colors.destructive} />
              <Text style={[styles.actionText, { color: colors.destructive }, font("medium")]}>
                Clear Local Query Cache
              </Text>
            </TouchableOpacity>
          </Surface>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }, font("regular")]}>
            {APP.name} Mobile v{APP.version}
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  section: { gap: 12 },
  quickCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  quickLabel: { fontSize: 12.5 },
  quickValue: { fontSize: 12.5, maxWidth: "60%" },
  tileGroup: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileContent: { flex: 1, gap: 2 },
  tileTitle: { fontSize: 14, lineHeight: 20 },
  tileSubtitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  actionText: { fontSize: 13.5, lineHeight: 20 },
  footer: { alignItems: "center", paddingVertical: 16 },
  footerText: { fontSize: 11.5 },
});
