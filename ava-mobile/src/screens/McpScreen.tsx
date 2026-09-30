import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  Key,
  Lock,
  Plug,
  RefreshCw,
  RotateCcw,
  Shield,
  Unlock,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  GlassIconButton,
  PageIntro,
  SkeletonRows,
  Surface,
  Badge,
  GlassCapsule,
} from "@/components/kit";
import type { McpServer } from "@/core/types";
import { useAva } from "@/state/ava-provider";
import { keys, useMcpServers, useReloadMcp, useMcpOAuth, useServerConfig, useWriteConfig } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Approval policy options ───────────────────────────────────────────────

const APPROVAL_POLICIES = [
  { id: "auto", label: "Auto", description: "All tools run automatically without approval", icon: Unlock },
  { id: "prompt", label: "Prompt", description: "Ask before running any tool", icon: Shield },
  { id: "writes", label: "Writes Only", description: "Only ask for tools that write/modify files", icon: Lock },
  { id: "approve", label: "Approve All", description: "Require approval for every tool call", icon: Key },
] as const;

// ── Status icon helper ────────────────────────────────────────────────────
// Auth statuses per protocol: unknown | unsupported | notLoggedIn | bearerToken | oauth

function StatusIcon({ status }: { status: string }) {
  if (status === "bearerToken" || status === "oauth") {
    return <CheckCircle2 size={14} color={COLORS.success} />;
  }
  if (status === "notLoggedIn") {
    return <AlertTriangle size={14} color={COLORS.warning} />;
  }
  return <XCircle size={14} color={COLORS.mutedForeground} />;
}

// ── Server Card ───────────────────────────────────────────────────────────

function ServerCard({
  server,
  onReload,
  onOAuth,
}: {
  server: McpServer;
  onReload: (name: string) => void;
  onOAuth: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const needsAuth = server.authStatus === "notLoggedIn";
  const isOnline = server.status === "ready" || server.status === "connected";
  const statusColor = isOnline
    ? COLORS.success
    : server.status === "error" || server.status === "failed"
    ? COLORS.destructive
    : needsAuth
    ? COLORS.warning
    : COLORS.mutedForeground;

  return (
    <Surface style={styles.serverCard}>
      <TouchableOpacity style={styles.serverHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={[styles.serverIcon, { backgroundColor: `${statusColor}14` }]}>
          <Plug size={16} color={statusColor} />
        </View>
        <View style={styles.serverMeta}>
          <Text style={[styles.serverName, font("semibold")]}>{server.name}</Text>
          <Text style={[styles.serverTools, font("regular")]}>
            {server.tools.length} tool{server.tools.length === 1 ? "" : "s"}
            {server.authStatus ? ` · ${formatAuthStatus(server.authStatus)}` : ""}
          </Text>
        </View>
        <GlassCapsule
          label={server.status}
          variant={isOnline ? "success" : "destructive"}
          statusDot={isOnline ? "online" : "offline"}
          size="xs"
        />
        <ChevronRight size={14} color={COLORS.mutedForeground} style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} />
      </TouchableOpacity>

      {open && (
        <View style={styles.serverBody}>
          {/* Auth & Actions */}
          <View style={styles.serverActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onReload(server.name)} activeOpacity={0.7}>
              <RotateCcw size={13} color={COLORS.primary} />
              <Text style={[styles.actionText, font("medium")]}>Reload</Text>
            </TouchableOpacity>

            {needsAuth && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnWarning]}
                onPress={() => onOAuth(server.name)}
                activeOpacity={0.7}
              >
                <Key size={13} color={COLORS.warning} />
                <Text style={[styles.actionText, font("medium"), { color: COLORS.warning }]}>Login with OAuth</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Auth Status */}
          {server.authStatus && (
            <View style={styles.authRow}>
              <StatusIcon status={server.authStatus} />
              <Text style={[styles.authText, font("regular")]}>
                Auth: {formatAuthStatus(server.authStatus)}
              </Text>
            </View>
          )}

          {/* Tools list */}
          <View style={styles.toolsList}>
            <Text style={[styles.toolsHeader, font("semibold")]}>Available Tools</Text>
            {server.tools.length === 0 ? (
              <Text style={[styles.noTools, font("regular")]}>No tools available</Text>
            ) : (
              server.tools.map((t) => (
                <View key={t.name} style={styles.toolItem}>
                  <Wrench size={12} color={COLORS.mutedForeground} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toolName, mono("medium")]}>{t.name}</Text>
                    {t.description ? (
                      <Text style={[styles.toolDesc, font("regular")]} numberOfLines={2}>
                        {t.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </Surface>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function McpScreen() {
  const { rpc } = useAva();
  const queryClient = useQueryClient();
  const { data: servers = [], isLoading, error } = useMcpServers();
  const reload = useReloadMcp();
  const oauth = useMcpOAuth();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();

  // Refresh the server list when the server reports MCP startup status changes.
  useEffect(() => {
    if (!rpc) return;
    return rpc.on(({ method }) => {
      if (method === "mcpServer/startupStatus/updated") {
        void queryClient.invalidateQueries({ queryKey: keys.mcp });
      }
    });
  }, [rpc, queryClient]);

  const [applyingPolicy, setApplyingPolicy] = useState(false);

  const currentPolicy = config.data?.approvalPolicy || "auto";

  const handleReload = useCallback(async () => {
    await reload.mutateAsync();
    Alert.alert("Reloaded", "MCP servers have been re-initialized.");
  }, [reload]);

  const handleOAuth = useCallback(
    async (name: string) => {
      const result = await oauth.mutateAsync(name);
      if (result?.authorizationUrl) {
        Alert.alert("OAuth Login", `Open browser to authenticate with "${name}"?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Browser",
            onPress: () => result.authorizationUrl && Linking.openURL(result.authorizationUrl),
          },
        ]);
      } else {
        Alert.alert("Error", `Could not initiate OAuth login for "${name}".`);
      }
    },
    [oauth]
  );

  const handleRestartServer = useCallback(
    async (name: string) => {
      Alert.alert(
        "Reload all MCP servers",
        `Reloading affects every configured MCP server, not just "${name}". Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reload all",
            onPress: async () => {
              await reload.mutateAsync();
              Alert.alert("Done", "All MCP servers have been reloaded.");
            },
          },
        ]
      );
    },
    [reload]
  );

  const handleSetPolicy = useCallback(
    async (policy: string) => {
      setApplyingPolicy(true);
      try {
        const result = await writeConfig.mutateAsync({ approval_policy: policy });
        if (result.success) {
          Alert.alert("Applied", `Tool policy set to "${policy}".`);
        } else {
          Alert.alert("Error", result.error || "Failed to set policy.");
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to set policy.");
      } finally {
        setApplyingPolicy(false);
      }
    },
    [writeConfig]
  );

  const activeCount = servers.filter((s) => s.status === "ready" || s.status === "connected").length;
  const authRequiredCount = servers.filter((s) => s.authStatus === "notLoggedIn").length;
  const totalTools = servers.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <AppShell
      title="MCP Servers"
      actions={<GlassIconButton icon={RefreshCw} size={18} onPress={handleReload} disabled={reload.isPending} />}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageIntro
          title="MCP Servers"
          description="Model Context Protocol servers provide tools your agent can use."
        />

        {/* ── Stats Overview ── */}
        <View style={styles.capsuleRow}>
          <GlassCapsule label="Servers" value={`${servers.length}`} variant="secondary" size="sm" />
          <GlassCapsule label="Active" value={`${activeCount}`} variant="success" statusDot="online" size="sm" />
          <GlassCapsule label="Auth Needed" value={`${authRequiredCount}`} variant={authRequiredCount > 0 ? "warning" : "secondary"} statusDot={authRequiredCount > 0 ? "busy" : undefined} size="sm" />
          <GlassCapsule label="Tools" value={`${totalTools}`} variant="primary" size="sm" />
        </View>

        {/* ── Tool Permission Policy ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Tool Permission Policy</Text>
          </View>
          <Text style={[styles.sectionDesc, font("regular")]}>
            Controls how the agent requests approval before running tools.
          </Text>
          <Surface style={styles.card}>
            {APPROVAL_POLICIES.map((p) => {
              const isActive = currentPolicy === p.id;
              const Icon = p.icon;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.policyRow, isActive && styles.policyRowActive]}
                  onPress={() => handleSetPolicy(p.id)}
                  disabled={applyingPolicy}
                  activeOpacity={0.7}
                >
                  <View style={[styles.policyIcon, { backgroundColor: isActive ? `${COLORS.primary}12` : COLORS.secondary }]}>
                    <Icon size={16} color={isActive ? COLORS.primary : COLORS.mutedForeground} />
                  </View>
                  <View style={styles.policyInfo}>
                    <Text style={[styles.policyLabel, font("semibold")]}>{p.label}</Text>
                    <Text style={[styles.policyDesc, font("regular")]}>{p.description}</Text>
                  </View>
                  {isActive && <Check size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </Surface>
        </View>

        {/* ── Server List ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Plug size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Servers</Text>
          </View>

          {isLoading && <SkeletonRows count={3} />}
          {error && <EmptyState icon={Plug} title="Could not load servers" description={(error as Error).message} />}
          {!isLoading && servers.length === 0 && (
            <EmptyState
              icon={Plug}
              title="No MCP servers configured"
              description="Add MCP servers to your config.toml to give your agent additional tools."
            />
          )}

          {servers.map((s) => (
            <ServerCard key={s.name} server={s} onReload={handleRestartServer} onOAuth={handleOAuth} />
          ))}
        </View>

        {/* ── Info ── */}
        <View style={styles.infoBox}>
          <Info size={14} color={COLORS.mutedForeground} />
          <Text style={[styles.infoText, font("regular")]}>
            MCP servers are configured in the server's config.toml. OAuth-enabled servers require browser authentication. Use Reload after editing config.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────

function formatAuthStatus(status: string): string {
  const map: Record<string, string> = {
    unknown: "Unknown",
    unsupported: "No Auth",
    notLoggedIn: "Not Logged In",
    bearerToken: "Bearer Token",
    oauth: "OAuth",
  };
  return map[status] || status;
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13.5, color: COLORS.foreground },
  sectionDesc: { fontSize: 12, color: COLORS.mutedForeground, paddingHorizontal: 4, lineHeight: 17 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: "hidden" },

  // Stats Capsules
  capsuleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Policy
  policyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  policyRowActive: { backgroundColor: "rgba(66,64,225,0.06)" },
  policyIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  policyInfo: { flex: 1, gap: 2 },
  policyLabel: { fontSize: 13, color: COLORS.foreground },
  policyDesc: { fontSize: 11, color: COLORS.mutedForeground, lineHeight: 15 },

  // Server card
  serverCard: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: "hidden" },
  serverHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  serverIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  serverMeta: { flex: 1, gap: 2 },
  serverName: { fontSize: 13.5, color: COLORS.foreground },
  serverTools: { fontSize: 11, color: COLORS.mutedForeground },
  serverBody: { borderTopWidth: 1, borderTopColor: COLORS.border },
  serverActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.border },
  actionBtnWarning: { backgroundColor: "rgba(234,179,43,0.1)", borderColor: "rgba(234,179,43,0.3)" },
  actionText: { fontSize: 11.5, color: COLORS.primary },

  // Auth
  authRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  authText: { fontSize: 12, color: COLORS.mutedForeground },

  // Tools
  toolsList: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  toolsHeader: { fontSize: 11, color: COLORS.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
  noTools: { fontSize: 12, color: COLORS.mutedForeground, fontStyle: "italic" },
  toolItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  toolName: { fontSize: 12, color: COLORS.foreground },
  toolDesc: { fontSize: 11, color: COLORS.mutedForeground, marginTop: 1, lineHeight: 15 },

  // Info
  infoBox: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: COLORS.secondary, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  infoText: { flex: 1, fontSize: 11, color: COLORS.mutedForeground, lineHeight: 16 },
});
