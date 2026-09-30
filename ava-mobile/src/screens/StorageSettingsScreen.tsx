import React, { useState } from "react";
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
  Database,
  HardDrive,
  Key,
  Layers,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, Surface } from "@/components/kit";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { APP } from "@/config/app";
import { storage } from "@/core/storage";
import * as NativeAgent from "@/core/native-agent";
import { chatStore } from "@/state/chat-store";
import { useAva } from "@/state/ava-provider";

export function StorageSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { activeSessionId, workingCwd, setWorkingCwd, signOut } = useAva();

  const [refreshKey, setRefreshKey] = useState(0);

  // Read stored items
  const savedCwd = storage.get("ava.working.cwd") || storage.get("ava.workingCwd");
  const savedTheme = storage.get("ava.theme");
  const savedSessionId = activeSessionId || storage.get("ava.active.session");
  const savedModel = storage.get("ava.model");
  const queryCacheCount = queryClient.getQueryCache().getAll().length;

  const handleClearQueryCache = () => {
    queryClient.clear();
    setRefreshKey((k) => k + 1);
    Alert.alert("Success", "In-memory API query cache has been purged.");
  };

  const handleResetCwd = () => {
    storage.remove("ava.working.cwd");
    storage.remove("ava.workingCwd");
    setWorkingCwd(APP.defaultCwd);
    setRefreshKey((k) => k + 1);
    Alert.alert("Reset", `Default workspace directory restored to ${APP.defaultCwd}`);
  };

  const handleResetPreferences = () => {
    storage.remove("ava.model");
    storage.remove("ava.effort");
    setRefreshKey((k) => k + 1);
    Alert.alert("Reset", "Model and reasoning preferences reset.");
  };

  const handleNuclearWipe = () => {
    Alert.alert(
      "Nuclear Storage Wipe",
      "This will remove all stored session tokens, preferences, and offline caches from this device. You will need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Everything",
          style: "destructive",
          onPress: async () => {
            queryClient.clear();
            // Stop any live agent state before wiping: clear chat transcripts
            // and stop the foreground service, then sign out.
            chatStore.clearAll();
            try {
              const sessionId =
                activeSessionId || (await NativeAgent.getSessionState())?.lastSessionId;
              if (sessionId) {
                await NativeAgent.stopForegroundService({ sessionId, isSuccess: true });
              }
            } catch {
              // Best-effort: the wipe proceeds regardless.
            }
            await storage.clear();
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <AppShell
      title="Storage & Cache"
      showBack
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Storage & Cache"
          description="Manage client-side caching, local storage tokens, and session history state."
        />

        {/* ── Cache Overview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HardDrive size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Local Cache Overview
            </Text>
          </View>

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <View style={styles.statGrid}>
              <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Layers size={16} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, font("regular")]}>
                  Query Cache Items
                </Text>
                <Text style={[styles.statNumber, { color: colors.foreground }, mono("semibold")]}>
                  {queryCacheCount}
                </Text>
              </View>

              <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Database size={16} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, font("regular")]}>
                  Active Session
                </Text>
                <Text style={[styles.statNumber, { color: colors.foreground }, mono("semibold")]} numberOfLines={1}>
                  {savedSessionId ? `${savedSessionId.slice(0, 8)}...` : "None"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={handleClearQueryCache}
              activeOpacity={0.7}
            >
              <Trash2 size={14} color={colors.secondaryForeground} />
              <Text style={[styles.actionBtnText, { color: colors.secondaryForeground }, font("medium")]}>
                Clear Query Cache ({queryCacheCount} entries)
              </Text>
            </TouchableOpacity>
          </Surface>
        </View>

        {/* ── Persistent Storage Inspection ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Client Key-Value Store
            </Text>
          </View>

          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            <View style={styles.keyRow}>
              <Text style={[styles.keyName, { color: colors.foreground }, mono("regular")]}>
                ava.theme
              </Text>
              <Text style={[styles.keyValue, { color: colors.primary }, mono("regular")]}>
                {savedTheme || "system"}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.keyRow}>
              <Text style={[styles.keyName, { color: colors.foreground }, mono("regular")]}>
                ava.working.cwd
              </Text>
              <Text style={[styles.keyValue, { color: colors.mutedForeground }, mono("regular")]} numberOfLines={1}>
                {savedCwd || workingCwd || APP.defaultCwd}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.keyRow}>
              <Text style={[styles.keyName, { color: colors.foreground }, mono("regular")]}>
                ava.model
              </Text>
              <Text style={[styles.keyValue, { color: colors.mutedForeground }, mono("regular")]} numberOfLines={1}>
                {savedModel || "(server default)"}
              </Text>
            </View>

            <View style={[styles.actionsRow, { marginTop: 6 }]}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: colors.secondary }]}
                onPress={handleResetCwd}
                activeOpacity={0.7}
              >
                <RotateCcw size={12} color={colors.secondaryForeground} />
                <Text style={[styles.smallBtnText, { color: colors.secondaryForeground }, font("medium")]}>
                  Reset CWD
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: colors.secondary }]}
                onPress={handleResetPreferences}
                activeOpacity={0.7}
              >
                <RotateCcw size={12} color={colors.secondaryForeground} />
                <Text style={[styles.smallBtnText, { color: colors.secondaryForeground }, font("medium")]}>
                  Reset Model Prefs
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>

        {/* ── Nuclear Wipe ── */}
        <TouchableOpacity
          style={[styles.nuclearBtn, { backgroundColor: `${colors.destructive}15`, borderColor: colors.destructive }]}
          onPress={handleNuclearWipe}
          activeOpacity={0.8}
        >
          <Trash2 size={16} color={colors.destructive} />
          <Text style={[styles.nuclearText, { color: colors.destructive }, font("medium")]}>
            Clear All Offline Data & Reset App
          </Text>
        </TouchableOpacity>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  statLabel: { fontSize: 11 },
  statNumber: { fontSize: 14 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 12 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  keyName: { fontSize: 12 },
  keyValue: { fontSize: 11.5, flexShrink: 1 },
  divider: { height: 1 },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 11.5 },
  nuclearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  nuclearText: { fontSize: 13 },
});
