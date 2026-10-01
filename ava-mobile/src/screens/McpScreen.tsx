import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
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
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Unlock,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  GlassIconButton,
  PageIntro,
  SectionHeader,
  SkeletonRows,
  Surface,
  Badge,
  GlassCapsule,
  Button,
  Input,
  Label,
} from "@/components/kit";
import type { McpServer } from "@/core/types";
import { useAva } from "@/state/ava-provider";
import { keys, useMcpServers, useReloadMcp, useMcpOAuth, useAddMcpServer, useServerConfig, useWriteConfig } from "@/state/queries";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Approval policy options ───────────────────────────────────────────────

// Must match core AskForApproval (kebab-case): untrusted | on-request | never
const APPROVAL_POLICIES = [
  { id: "untrusted", label: "Prompt on Untrusted", description: "Ask for commands that modify system state outside the workspace", icon: Shield },
  { id: "on-request", label: "On Request", description: "Prompt only when the agent marks an action as high-risk", icon: Lock },
  { id: "never", label: "Never Prompt", description: "Run tools automatically without approval", icon: Unlock },
] as const;

// ── Status icon helper ────────────────────────────────────────────────────
// Auth statuses per protocol: unknown | unsupported | notLoggedIn | bearerToken | oauth

function StatusIcon({ status }: { status: string }) {
  const { colors } = useTheme();
  if (status === "bearerToken" || status === "oauth") {
    return <CheckCircle2 size={14} color={colors.success} />;
  }
  if (status === "notLoggedIn") {
    return <AlertTriangle size={14} color={colors.warning} />;
  }
  return <XCircle size={14} color={colors.mutedForeground} />;
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
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const needsAuth = server.authStatus === "notLoggedIn";
  const isOnline = server.status === "ready" || server.status === "connected";
  const statusColor = isOnline
    ? colors.success
    : server.status === "error" || server.status === "failed"
    ? colors.destructive
    : needsAuth
    ? colors.warning
    : colors.mutedForeground;

  return (
    <Surface style={[styles.serverCard, { borderColor: colors.glassBorder }]}>
      <TouchableOpacity style={styles.serverHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={[styles.serverIcon, { backgroundColor: `${statusColor}14` }]}>
          <Plug size={16} color={statusColor} />
        </View>
        <View style={styles.serverMeta}>
          <Text style={[styles.serverName, { color: colors.foreground }, font("semibold")]}>{server.name}</Text>
          <Text style={[styles.serverTools, { color: colors.mutedForeground }, font("regular")]}>
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
        <ChevronRight size={14} color={colors.mutedForeground} style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.serverBody, { borderTopColor: colors.border }]}>
          {/* Auth & Actions */}
          <View style={[styles.serverActions, { borderBottomColor: colors.border }]}>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => onReload(server.name)} activeOpacity={0.7}>
              <RotateCcw size={13} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }, font("medium")]}>Reload</Text>
            </TouchableOpacity>

            {needsAuth && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }, { backgroundColor: colors.warning + "1A", borderColor: colors.warning + "40" }]}
                onPress={() => onOAuth(server.name)}
                activeOpacity={0.7}
              >
                <Key size={13} color={colors.warning} />
                <Text style={[styles.actionText, font("medium"), { color: colors.warning }]}>Login with OAuth</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Auth Status */}
          {server.authStatus && (
            <View style={[styles.authRow, { borderBottomColor: colors.border }]}>
              <StatusIcon status={server.authStatus} />
              <Text style={[styles.authText, { color: colors.mutedForeground }, font("regular")]}>
                Auth: {formatAuthStatus(server.authStatus)}
              </Text>
            </View>
          )}

          {/* Tools list */}
          <View style={styles.toolsList}>
            <Text style={[styles.toolsHeader, { color: colors.mutedForeground }, font("semibold")]}>Available Tools</Text>
            {server.tools.length === 0 ? (
              <Text style={[styles.noTools, { color: colors.mutedForeground }, font("regular")]}>No tools available</Text>
            ) : (
              server.tools.map((t) => (
                <View key={t.name} style={styles.toolItem}>
                  <Wrench size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toolName, { color: colors.foreground }, mono("medium")]}>{t.name}</Text>
                    {t.description ? (
                      <Text style={[styles.toolDesc, { color: colors.mutedForeground }, font("regular")]} numberOfLines={2}>
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
  const { colors } = useTheme();
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTransport, setAddTransport] = useState<"stdio" | "http">("http");
  const [addName, setAddName] = useState("");
  const [addCommand, setAddCommand] = useState("");
  const [addArgs, setAddArgs] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addBearerEnv, setAddBearerEnv] = useState("");
  const addMcp = useAddMcpServer();

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

  const handleAddServer = useCallback(async () => {
    try {
      await addMcp.mutateAsync({
        name: addName,
        transport: addTransport,
        command: addTransport === "stdio" ? addCommand : undefined,
        args: addTransport === "stdio" && addArgs.trim() ? addArgs.split(/\s+/) : undefined,
        url: addTransport === "http" ? addUrl : undefined,
        bearerTokenEnvVar: addTransport === "http" ? addBearerEnv || undefined : undefined,
      });
      setShowAddModal(false);
      setAddName(""); setAddCommand(""); setAddArgs(""); setAddUrl(""); setAddBearerEnv("");
      Alert.alert("Added", "MCP server added and reloaded.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add server.");
    }
  }, [addMcp, addName, addTransport, addCommand, addArgs, addUrl, addBearerEnv]);

  const activeCount = servers.filter((s) => s.status === "ready" || s.status === "connected").length;
  const authRequiredCount = servers.filter((s) => s.authStatus === "notLoggedIn").length;
  const totalTools = servers.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <AppShell
      title="MCP Servers"
      actions={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <GlassIconButton icon={Plus} size={18} onPress={() => setShowAddModal(true)} />
          <GlassIconButton icon={RefreshCw} size={18} onPress={handleReload} disabled={reload.isPending} />
        </View>
      }
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
          <SectionHeader
            icon={Shield}
            title="Tool Permission Policy"
            description="Controls how the agent requests approval before running tools."
          />
          <Surface style={[styles.card, { borderColor: colors.glassBorder }]}>
            {APPROVAL_POLICIES.map((p) => {
              const isActive = currentPolicy === p.id;
              const Icon = p.icon;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.policyRow, { borderBottomColor: colors.border }, isActive && { backgroundColor: colors.primary + "0F" }]}
                  onPress={() => handleSetPolicy(p.id)}
                  disabled={applyingPolicy}
                  activeOpacity={0.7}
                >
                  <View style={[styles.policyIcon, { backgroundColor: isActive ? colors.primary + "14" : colors.secondary }]}>
                    <Icon size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={styles.policyInfo}>
                    <Text style={[styles.policyLabel, { color: colors.foreground }, font("semibold")]}>{p.label}</Text>
                    <Text style={[styles.policyDesc, { color: colors.mutedForeground }, font("regular")]}>{p.description}</Text>
                  </View>
                  {isActive && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Surface>
        </View>

        {/* ── Server List ── */}
        <View style={styles.section}>
          <SectionHeader icon={Plug} title="Servers" />

          {isLoading && <SkeletonRows count={3} />}
          {error && <EmptyState icon={Plug} title="Could not load servers" description={(error as Error).message} />}
          {!isLoading && servers.length === 0 && (
            <EmptyState
              icon={Plug}
              title="No MCP servers configured"
              description="Tap + to add an MCP server and give your agent additional tools."
            />
          )}

          {servers.map((s) => (
            <ServerCard key={s.name} server={s} onReload={handleRestartServer} onOAuth={handleOAuth} />
          ))}
        </View>

        {/* ── Info ── */}
        <View style={[styles.infoBox, { borderColor: colors.border }]}>
          <Info size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }, font("regular")]}>
            OAuth-enabled servers require browser authentication. Use Reload after changing server config.
          </Text>
        </View>
      </ScrollView>

      {/* ── Add Server Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }, font("semibold")]}>Add MCP Server</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Label>Server name</Label>
                <Input placeholder="e.g. my-tools" value={addName} onChangeText={setAddName} autoCapitalize="none" />
              </View>
              <View style={styles.fieldGroup}>
                <Label>Transport</Label>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["http", "stdio"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setAddTransport(t)}
                      style={[
                        styles.transportPill,
                        { borderColor: colors.border },
                        addTransport === t && { backgroundColor: colors.primary + "14", borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.transportPillText,
                          { color: addTransport === t ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {t === "http" ? "HTTP" : "Stdio"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {addTransport === "http" ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Label>Server URL</Label>
                    <Input placeholder="https://example.com/mcp" value={addUrl} onChangeText={setAddUrl} autoCapitalize="none" />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Label>Bearer token env var (optional)</Label>
                    <Input placeholder="e.g. MY_MCP_TOKEN" value={addBearerEnv} onChangeText={setAddBearerEnv} autoCapitalize="none" />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <Label>Command</Label>
                    <Input placeholder="e.g. npx" value={addCommand} onChangeText={setAddCommand} autoCapitalize="none" />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Label>Args (space-separated, optional)</Label>
                    <Input placeholder="e.g. -y @modelcontextprotocol/server-filesystem" value={addArgs} onChangeText={setAddArgs} autoCapitalize="none" />
                  </View>
                </>
              )}
              <Button variant="default" loading={addMcp.isPending} onPress={handleAddServer} style={{ marginTop: 8 }}>
                Add server
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
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
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 12 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },

  // Stats Capsules
  capsuleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Policy
  policyRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  policyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  policyInfo: { flex: 1, gap: 2 },
  policyLabel: { fontSize: 13.5, lineHeight: 20 },
  policyDesc: { fontSize: 11.5, letterSpacing: 0.2, lineHeight: 16 },

  // Server card
  serverCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  serverHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  serverIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  serverMeta: { flex: 1, gap: 2 },
  serverName: { fontSize: 14, lineHeight: 20 },
  serverTools: { fontSize: 11.5, letterSpacing: 0.2 },
  serverBody: { borderTopWidth: StyleSheet.hairlineWidth },
  serverActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth },
  actionText: { fontSize: 12, letterSpacing: 0.2 },

  // Auth
  authRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  authText: { fontSize: 12, lineHeight: 18 },

  // Tools
  toolsList: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  toolsHeader: { fontSize: 12 },
  noTools: { fontSize: 12, fontStyle: "italic" },
  toolItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  toolName: { fontSize: 12.5, lineHeight: 18 },
  toolDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },

  // Info
  infoBox: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "transparent", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
  },
  form: {
    gap: 8,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  transportPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  transportPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
