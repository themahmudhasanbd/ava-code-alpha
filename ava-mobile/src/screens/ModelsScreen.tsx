import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Info,
  Key,
  Layers,
  Plug,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, Surface } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { keys, useModels, useServerConfig, useWriteConfig } from "@/state/queries";
import {
  BUILTIN_PROVIDER_PRESETS,
  deleteCustomProvider,
  fetchOpenAiCompatibleModels,
  getCustomProviders,
  getModelFallbackChain,
  saveCustomProvider,
  saveModelFallbackChain,
  toggleCustomProvider,
  type CustomProvider,
} from "@/core/custom-models";
import { REASONING_EFFORTS } from "@/config/models";
import { pushCustomProviderToServer } from "@/core/api/system";
import type { ModelInfo } from "@/core/types";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

type CategoryFilter = "all" | "antigravity" | "openai" | "anthropic" | "google" | "deepseek" | "custom";

export function ModelsScreen() {
  const { modelId, setModelId, effort, setEffort, rpc } = useAva();
  const { isDark, colors } = useTheme();
  const qc = useQueryClient();
  const { data: models = [], isLoading, refetch: refetchModels } = useModels();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();

  const activeId = modelId || models.find((m) => m.isDefault)?.id || models[0]?.id;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [isReloading, setIsReloading] = useState(false);

  // Collapsed sections map
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Custom Providers State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("antigravity");
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerBaseUrl, setProviderBaseUrl] = useState("");
  const [providerProjectId, setProviderProjectId] = useState("");
  const [providerApiKeys, setProviderApiKeys] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [testedProviderModels, setTestedProviderModels] = useState<ModelInfo[]>([]);

  // Provider Settings / Edit Modal
  const [activeEditingProvider, setActiveEditingProvider] = useState<CustomProvider | null>(null);
  const [editProviderApiKeys, setEditProviderApiKeys] = useState<string[]>([]);
  const [editProviderProjectId, setEditProviderProjectId] = useState("");
  const [editNewKeyInput, setEditNewKeyInput] = useState("");

  // Fallback Chain State
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [showAddChainModal, setShowAddChainModal] = useState(false);
  const [isSavingChain, setIsSavingChain] = useState(false);

  const [applying, setApplying] = useState(false);

  // Load Provider & Fallback state on mount
  useEffect(() => {
    loadLocalState();
  }, []);

  const loadLocalState = async () => {
    try {
      const providers = await getCustomProviders();
      setCustomProviders(providers);
      const chain = await getModelFallbackChain();
      if (chain.length > 0) {
        setFallbackChain(chain);
      } else if (
        config.data?.model_fallback_chain &&
        Array.isArray(config.data.model_fallback_chain)
      ) {
        setFallbackChain(config.data.model_fallback_chain as string[]);
      }
    } catch (e) {
      console.warn("Failed loading local model state:", e);
    }
  };

  const handleReloadModels = async () => {
    if (isReloading) return;
    setIsReloading(true);
    try {
      await loadLocalState();
      await refetchModels();
      Alert.alert("Reload Complete", "AI models and providers reloaded dynamically.");
    } catch (e: any) {
      Alert.alert("Reload Error", e?.message || "Failed to reload models.");
    } finally {
      setIsReloading(false);
    }
  };

  const toggleSectionCollapse = (providerKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [providerKey]: !prev[providerKey],
    }));
  };

  // Group models by Provider
  const groupedModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = models;

    if (q) {
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.provider && m.provider.toLowerCase().includes(q))
      );
    }

    if (activeFilter !== "all") {
      if (activeFilter === "antigravity") {
        filtered = filtered.filter(
          (m) =>
            m.provider === "antigravity" ||
            m.id.toLowerCase().includes("antigravity") ||
            (m.description && m.description.toLowerCase().includes("antigravity"))
        );
      } else if (activeFilter === "openai") {
        filtered = filtered.filter(
          (m) =>
            m.provider === "openai" ||
            m.id.toLowerCase().includes("gpt") ||
            m.id.toLowerCase().includes("o1") ||
            m.id.toLowerCase().includes("o3")
        );
      } else if (activeFilter === "anthropic") {
        filtered = filtered.filter(
          (m) => m.provider === "anthropic" || m.id.toLowerCase().includes("claude")
        );
      } else if (activeFilter === "google") {
        filtered = filtered.filter(
          (m) => m.provider === "google" || m.provider === "gemini" || m.id.toLowerCase().includes("gemini")
        );
      } else if (activeFilter === "deepseek") {
        filtered = filtered.filter(
          (m) => m.provider === "deepseek" || m.id.toLowerCase().includes("deepseek")
        );
      } else if (activeFilter === "custom") {
        filtered = filtered.filter(
          (m) =>
            m.provider === "custom" ||
            m.provider === "together" ||
            m.provider === "groq" ||
            m.provider === "openrouter" ||
            m.provider === "ollama" ||
            m.provider === "lmstudio"
        );
      }
    }

    const groups: Record<string, ModelInfo[]> = {};
    for (const m of filtered) {
      let p = m.provider || "AvA Core Server";
      if (p === "antigravity") p = "Google Antigravity";
      else if (p === "openai") p = "OpenAI";
      else if (p === "anthropic") p = "Anthropic";
      else if (p === "google" || p === "gemini") p = "Google Gemini";
      else if (p === "deepseek") p = "DeepSeek";
      else if (p === "groq") p = "Groq";
      else if (p === "openrouter") p = "OpenRouter";
      else if (p === "together") p = "Together AI";
      else if (p === "mistral") p = "Mistral AI";
      else if (p === "ollama") p = "Ollama (Local)";
      else if (p === "lmstudio") p = "LM Studio (Local)";
      else if (p === "server") p = "AvA Core Server";

      if (!groups[p]) groups[p] = [];
      groups[p].push(m);
    }

    return groups;
  }, [models, searchQuery, activeFilter]);

  const handleSelectModel = (id: string) => {
    setModelId(id);
  };

  // ── Custom Provider Handlers ──
  const handleOpenConnector = () => {
    const defaultPreset =
      BUILTIN_PROVIDER_PRESETS.find((p) => p.id === "antigravity") ||
      BUILTIN_PROVIDER_PRESETS[0];
    setSelectedPresetId(defaultPreset.id);
    setProviderId(defaultPreset.id);
    setProviderName(defaultPreset.name);
    setProviderBaseUrl(defaultPreset.baseUrl);
    setProviderProjectId("");
    setProviderApiKeys([]);
    setNewKeyInput("");
    setTestedProviderModels([]);
    setShowConnectorModal(true);
  };

  const handleSelectPreset = (preset: (typeof BUILTIN_PROVIDER_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    setProviderId(preset.id);
    setProviderName(preset.name);
    setProviderBaseUrl(preset.baseUrl);
    setTestedProviderModels([]);
  };

  const handleAddTokenToNew = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;
    const splitTokens = trimmed.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
    const updated = Array.from(new Set([...providerApiKeys, ...splitTokens]));
    setProviderApiKeys(updated);
    setNewKeyInput("");
  };

  const handleRemoveTokenFromNew = (idx: number) => {
    setProviderApiKeys(providerApiKeys.filter((_, i) => i !== idx));
  };

  const handleTestAndFetchProvider = async () => {
    if (!providerBaseUrl.trim()) {
      Alert.alert("Required", "Base URL is required to fetch models.");
      return;
    }

    const effectiveKey =
      providerApiKeys[0] ||
      newKeyInput.trim() ||
      undefined;

    setIsTestingProvider(true);
    try {
      const fetched = await fetchOpenAiCompatibleModels(
        providerBaseUrl.trim(),
        effectiveKey,
        providerId.trim() || "custom"
      );
      setTestedProviderModels(fetched);
      if (fetched.length === 0) {
        Alert.alert(
          "No Models Found",
          "Connected to endpoint but no models were returned by /models."
        );
      } else {
        Alert.alert(
          "Discovery Successful",
          `Discovered ${fetched.length} model(s) for "${providerName || providerId}".`
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Connection Failed",
        err?.message || "Could not fetch models from provider endpoint."
      );
    } finally {
      setIsTestingProvider(false);
    }
  };

  const handleSaveProvider = async () => {
    const pId = providerId.trim().toLowerCase();
    const pUrl = providerBaseUrl.trim();
    if (!pId || !pUrl) {
      Alert.alert("Required", "Provider ID and Base URL are required.");
      return;
    }

    const allKeys = Array.from(
      new Set(
        [
          ...providerApiKeys,
          ...(newKeyInput.trim() ? newKeyInput.trim().split(/[,;\n]/) : []),
        ]
          .map((k) => k.trim())
          .filter(Boolean)
      )
    );

    try {
      const modelsToSave = testedProviderModels.length > 0 ? testedProviderModels : [];
      const preset = BUILTIN_PROVIDER_PRESETS.find((pr) => pr.id === selectedPresetId);
      const providerToSave: CustomProvider = {
        id: pId,
        name: providerName.trim() || pId,
        baseUrl: pUrl,
        projectId: providerProjectId.trim() || undefined,
        apiKey: allKeys[0] || "",
        apiKeys: allKeys,
        authType: preset?.authType,
        wireApi: preset?.wireApi,
        enabled: true,
        models: modelsToSave,
      };
      await saveCustomProvider(providerToSave);

      // Register with AvA Core so chat can actually route to this provider
      // (device storage alone is invisible to the server).
      const pushRes = rpc
        ? await pushCustomProviderToServer(rpc, providerToSave)
        : { ok: false, reason: "server offline" };

      await loadLocalState();
      await qc.invalidateQueries({ queryKey: keys.models });
      setShowConnectorModal(false);
      Alert.alert(
        "Provider Saved",
        `Provider "${pId}" configured with ${allKeys.length} token(s) and ${modelsToSave.length} models.` +
          (pushRes.ok
            ? "\nSynced to AvA Core -- chat can now route to it."
            : `\nNote: not synced to server (${pushRes.reason}).`)
      );
    } catch (err: any) {
      Alert.alert("Save Error", err?.message || "Failed to save provider.");
    }
  };

  const handleOpenEditProvider = (cp: CustomProvider) => {
    setActiveEditingProvider(cp);
    const existing =
      cp.apiKeys && cp.apiKeys.length > 0
        ? cp.apiKeys
        : cp.apiKey
        ? [cp.apiKey]
        : [];
    setEditProviderApiKeys(existing);
    setEditProviderProjectId(cp.projectId || "");
    setEditNewKeyInput("");
  };

  const handleAddTokenToEdit = () => {
    const trimmed = editNewKeyInput.trim();
    if (!trimmed) return;
    const splitTokens = trimmed.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
    const updated = Array.from(new Set([...editProviderApiKeys, ...splitTokens]));
    setEditProviderApiKeys(updated);
    setEditNewKeyInput("");
  };

  const handleRemoveTokenFromEdit = (idx: number) => {
    setEditProviderApiKeys(editProviderApiKeys.filter((_, i) => i !== idx));
  };

  const handleSaveEditedProvider = async () => {
    if (!activeEditingProvider) return;
    const allKeys = Array.from(
      new Set(
        [
          ...editProviderApiKeys,
          ...(editNewKeyInput.trim() ? editNewKeyInput.trim().split(/[,;\n]/) : []),
        ]
          .map((k) => k.trim())
          .filter(Boolean)
      )
    );

    try {
      const updatedProvider: CustomProvider = {
        ...activeEditingProvider,
        apiKey: allKeys[0] || "",
        apiKeys: allKeys,
        projectId: editProviderProjectId.trim() || undefined,
      };
      await saveCustomProvider(updatedProvider);
      const pushRes = rpc
        ? await pushCustomProviderToServer(rpc, updatedProvider)
        : { ok: false, reason: "server offline" };
      await loadLocalState();
      await qc.invalidateQueries({ queryKey: keys.models });
      setActiveEditingProvider(null);
      Alert.alert(
        "Tokens Updated",
        `Provider "${activeEditingProvider.name}" saved with ${allKeys.length} token(s).` +
          (pushRes.ok
            ? "\nSynced to AvA Core."
            : `\nNote: not synced to server (${pushRes.reason}).`)
      );
    } catch (err: any) {
      Alert.alert("Save Error", err?.message || "Failed to update provider.");
    }
  };

  const handleDeleteProvider = async (id: string) => {
    Alert.alert(
      "Delete Provider",
      `Remove provider "${id}" and its models from this device?\nNote: its AvA Core server entry is kept (the config API cannot delete keys).`,
      [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomProvider(id);
          await loadLocalState();
          await qc.invalidateQueries({ queryKey: keys.models });
          setActiveEditingProvider(null);
        },
      },
    ]);
  };

  const handleToggleProvider = async (id: string, enabled: boolean) => {
    await toggleCustomProvider(id, enabled);
    await loadLocalState();
    await qc.invalidateQueries({ queryKey: keys.models });
  };

  // ── Fallback Chain Handlers ──
  const handleAddToChain = (mId: string) => {
    if (!fallbackChain.includes(mId) && mId !== activeId) {
      const nextChain = [...fallbackChain, mId];
      setFallbackChain(nextChain);
      saveModelFallbackChain(nextChain);
    }
    setShowAddChainModal(false);
  };

  const handleRemoveFromChain = (index: number) => {
    const nextChain = fallbackChain.filter((_, i) => i !== index);
    setFallbackChain(nextChain);
    saveModelFallbackChain(nextChain);
  };

  const handleMoveChainItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fallbackChain.length) return;
    const nextChain = [...fallbackChain];
    const temp = nextChain[index];
    nextChain[index] = nextChain[targetIdx];
    nextChain[targetIdx] = temp;
    setFallbackChain(nextChain);
    saveModelFallbackChain(nextChain);
  };

  const handleSaveFallbackChain = async () => {
    setIsSavingChain(true);
    try {
      await saveModelFallbackChain(fallbackChain);
      const res = await writeConfig.mutateAsync({
        model_fallback_chain: fallbackChain,
      });
      if (res.success) {
        Alert.alert(
          "Fallback Chain Saved",
          `Configured ${fallbackChain.length} failover target(s) on server.`
        );
        qc.invalidateQueries({ queryKey: keys.serverConfig });
      } else {
        Alert.alert("Save Warning", res.error || "Saved locally to device.");
      }
    } catch (e: any) {
      Alert.alert("Saved Locally", "Fallback chain saved to local storage.");
    } finally {
      setIsSavingChain(false);
    }
  };

  // ── Save Active Model to Server Config ──
  const handleApplyToServer = async () => {
    setApplying(true);
    try {
      const fields: Record<string, unknown> = {};
      if (activeId) {
        fields.model = activeId;
        const selectedModel = models.find((m) => m.id === activeId);
        if (selectedModel?.provider && selectedModel.provider !== "server") {
          fields.model_provider = selectedModel.provider;
        }
      }
      if (effort) fields.model_reasoning_effort = effort;
      if (fallbackChain.length > 0) {
        fields.model_fallback_chain = fallbackChain;
      }

      const result = await writeConfig.mutateAsync(fields);
      if (result.success) {
        Alert.alert(
          "Saved to Server",
          `Model "${activeId}" (${effort.toUpperCase()} reasoning) saved to server configuration.`
        );
        qc.invalidateQueries({ queryKey: keys.serverConfig });
        qc.invalidateQueries({ queryKey: keys.models });
      } else {
        Alert.alert("Error", result.error || "Failed to update server configuration.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update server configuration.");
    } finally {
      setApplying(false);
    }
  };

  const getProviderColor = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes("antigravity")) return "#4285F4";
    if (l.includes("openai")) return "#10A37F";
    if (l.includes("anthropic")) return "#D97706";
    if (l.includes("google") || l.includes("gemini")) return "#3B82F6";
    if (l.includes("deepseek")) return "#0284C7";
    if (l.includes("groq")) return "#F97316";
    if (l.includes("openrouter")) return "#6366F1";
    if (l.includes("together")) return "#0EA5E9";
    if (l.includes("ollama")) return "#10B981";
    if (l.includes("lmstudio")) return "#8B5CF6";
    return "#6366F1";
  };

  return (
    <AppShell title="AI Models & Routing">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Bar */}
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainHeading, { color: colors.foreground }, font("bold")]}>
              AI Models & Providers
            </Text>
            <Text style={[styles.mainSubheading, { color: colors.mutedForeground }, font("regular")]}>
              {models.length} active models • Multi-token pooling & failover routing
            </Text>
          </View>

          <View style={styles.headerBtnGroup}>
            <TouchableOpacity
              style={[styles.reloadBtn, { borderColor: colors.primary + "59", backgroundColor: colors.primary + "14" }]}
              onPress={handleReloadModels}
              disabled={isReloading}
              activeOpacity={0.7}
            >
              {isReloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RotateCw size={14} color={colors.primary} />
              )}
              <Text style={[styles.reloadBtnText, { color: colors.primary }, font("semibold")]}>
                {isReloading ? "Reloading…" : "Reload"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: colors.primary }]}
              onPress={handleOpenConnector}
              activeOpacity={0.8}
            >
              <Plug size={14} color={colors.primaryForeground} />
              <Text style={[styles.connectBtnText, { color: colors.primaryForeground }, font("bold")]}>Connect API</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 1. AI PROVIDERS & MULTI-TOKEN CONNECTIONS ── */}
        <Surface style={[styles.providersCard, { borderColor: colors.border }]}>
          <View style={styles.providersHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "14" }]}>
              <Cpu size={15} color={colors.primary} />
            </View>
            <Text style={[styles.providersSectionTitle, { color: colors.mutedForeground }, font("bold")]}>
              AI providers & multi-token auth
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countBadgeText, { color: colors.mutedForeground }, font("bold")]}>
                {customProviders.length || 0}
              </Text>
            </View>
          </View>

          {/* Empty state when no custom providers */}
          {customProviders.length === 0 && (
            <EmptyState
              icon={Server}
              title="No external providers connected"
              description="Connect Google Antigravity or OpenAI-compatible endpoints with multi-token rotation."
              action={
                <TouchableOpacity
                  style={[styles.connectBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenConnector}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color={colors.primaryForeground} />
                  <Text style={[styles.connectBtnText, { color: colors.primaryForeground }, font("bold")]}>Add Provider</Text>
                </TouchableOpacity>
              }
            />
          )}

          {/* Custom Connected Providers */}
          {customProviders.map((cp) => {
            const color = getProviderColor(cp.name);
            const isEnabled = cp.enabled !== false;
            const tokenCount =
              cp.apiKeys && cp.apiKeys.length > 0 ? cp.apiKeys.length : cp.apiKey ? 1 : 0;

            return (
              <View
                key={cp.id}
                style={[
                  styles.providerRow,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <View style={[styles.providerLogoBox, { backgroundColor: `${color}16` }]}>
                  <Server size={17} color={color} />
                </View>

                <View style={styles.providerInfoCol}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[styles.providerRowName, { color: colors.foreground }, font("bold")]}>
                      {cp.name}
                    </Text>
                    {tokenCount > 1 ? (
                      <View style={[styles.tokenMultiBadge, { backgroundColor: colors.success + "1F" }]}>
                        <ShieldCheck size={11} color={colors.success} />
                        <Text style={[styles.tokenMultiBadgeText, { color: colors.success }, font("bold")]}>
                          {tokenCount} Tokens (Auto-Rotate)
                        </Text>
                      </View>
                    ) : tokenCount === 1 ? (
                      <View style={[styles.tokenMultiBadge, { backgroundColor: colors.primary + "1F" }]}>
                        <Key size={10} color={colors.primary} />
                        <Text style={[styles.tokenMultiBadgeText, { color: colors.primary }, font("bold")]}>
                          1 Token
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.providerRowSub, { color: colors.mutedForeground }, mono("regular")]} numberOfLines={1}>
                    {cp.baseUrl}
                  </Text>
                  {cp.projectId && (
                    <Text style={[styles.providerRowProject, { color: colors.primary }, mono("regular")]}>
                      Project: {cp.projectId}
                    </Text>
                  )}
                </View>

                <View style={styles.providerActionCol}>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { borderColor: colors.border }]}
                    onPress={() => handleOpenEditProvider(cp)}
                    activeOpacity={0.7}
                  >
                    <Settings size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <Switch
                    value={isEnabled}
                    onValueChange={(val) => handleToggleProvider(cp.id, val)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={Platform.OS === "android" ? "#FFF" : undefined}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>
            );
          })}
        </Surface>

        {/* ── 2. MODEL FALLBACK ROUTING CHAIN ── */}
        <Surface style={[styles.fallbackChainCard, { borderColor: colors.primary + "4D" }]}>
          <View style={styles.fallbackChainHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "14" }]}>
                <Layers size={15} color={colors.primary} />
              </View>
              <Text style={[styles.fallbackChainTitle, { color: colors.primary }, font("bold")]}>
                Model fallback routing chain
              </Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countBadgeText, { color: colors.mutedForeground }, font("bold")]}>
                {fallbackChain.length > 0 ? fallbackChain.length + 1 : 1} Target(s)
              </Text>
            </View>
          </View>

          <Text style={[styles.fallbackChainDescription, { color: colors.mutedForeground }, font("regular")]}>
            If the primary model hits rate limits (429) or provider outages, AvA automatically routes to the next model in this chain.
          </Text>

          {/* Primary Model (Active Selection) */}
          <View style={[styles.chainItemPrimary, { backgroundColor: colors.secondary, borderColor: colors.success + "59" }]}>
            <View style={[styles.chainRankBadgePrimary, { backgroundColor: colors.success }]}>
              <Text style={[styles.chainRankTextPrimary, font("bold")]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.chainItemName, { color: colors.foreground }, font("bold")]}>
                  {models.find((m) => m.id === activeId)?.name || activeId || "No Model Selected"}
                </Text>
                <View style={[styles.activeDotPulse, { backgroundColor: colors.success }]} />
              </View>
              <Text style={[styles.chainItemSub, { color: colors.mutedForeground }, mono("regular")]}>
                Primary Active Model ({activeId})
              </Text>
            </View>
            <Zap size={15} color={colors.success} />
          </View>

          {/* Fallback Targets */}
          {fallbackChain.map((fId, idx) => {
            const mObj = models.find((m) => m.id === fId);
            return (
              <View
                key={`${fId}-${idx}`}
                style={[
                  styles.chainItemSecondary,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <View style={[styles.chainRankBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.chainRankText, { color: colors.mutedForeground }, font("bold")]}>
                    {idx + 2}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chainItemName, { color: colors.foreground }, font("semibold")]}>
                    {mObj?.name || fId}
                  </Text>
                  <Text style={[styles.chainItemSub, { color: colors.mutedForeground }, mono("regular")]}>
                    Fallback #{idx + 1} ({fId})
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.chainIconBtn, { backgroundColor: colors.card }]}
                    onPress={() => handleMoveChainItem(idx, "up")}
                    disabled={idx === 0}
                    activeOpacity={0.6}
                  >
                    <ChevronUp size={14} color={idx === 0 ? colors.border : colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chainIconBtn, { backgroundColor: colors.card }]}
                    onPress={() => handleMoveChainItem(idx, "down")}
                    disabled={idx === fallbackChain.length - 1}
                    activeOpacity={0.6}
                  >
                    <ChevronDown size={14} color={idx === fallbackChain.length - 1 ? colors.border : colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chainIconBtn, { backgroundColor: colors.card }]}
                    onPress={() => handleRemoveFromChain(idx)}
                    activeOpacity={0.6}
                  >
                    <Trash2 size={13} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={styles.chainActionsRow}>
            <TouchableOpacity
              style={[styles.addChainBtn, { borderColor: colors.primary + "59", backgroundColor: colors.primary + "14" }]}
              onPress={() => setShowAddChainModal(true)}
              activeOpacity={0.7}
            >
              <Plus size={13} color={colors.primary} />
              <Text style={[styles.addChainBtnText, { color: colors.primary }, font("bold")]}>Add Fallback Model</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveChainBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveFallbackChain}
              disabled={isSavingChain}
              activeOpacity={0.8}
            >
              {isSavingChain ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Check size={13} color={colors.primaryForeground} />
              )}
              <Text style={[styles.saveChainBtnText, { color: colors.primaryForeground }, font("bold")]}>
                {isSavingChain ? "Saving…" : "Save Chain"}
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* ── 3. SEARCH & CATEGORY FILTER ── */}
        <View style={styles.searchFilterSection}>
          <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Search size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }, font("regular")]}
              placeholder="Search model names or provider..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {(
              [
                { id: "all", label: "All Models" },
                { id: "antigravity", label: "Antigravity" },
                { id: "openai", label: "OpenAI" },
                { id: "anthropic", label: "Anthropic" },
                { id: "google", label: "Gemini" },
                { id: "deepseek", label: "DeepSeek" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterPill,
                    { backgroundColor: "transparent", borderColor: "transparent" },
                    active && [styles.filterPillActive, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                  onPress={() => setActiveFilter(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: active ? colors.foreground : colors.mutedForeground },
                      font(active ? "bold" : "regular"),
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 4. MODEL CATALOG GROUPED BY PROVIDER ── */}
        {isLoading && (
          <View style={{ padding: 20, alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 12 }, font("regular")]}>
              Loading model catalog...
            </Text>
          </View>
        )}

        {Object.entries(groupedModels).map(([pName, pModels]) => {
          const isCollapsed = !!collapsedSections[pName];
          const color = getProviderColor(pName);

          return (
            <Surface key={pName} style={[styles.providerGroupCard, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.groupHeaderRow, { backgroundColor: colors.secondary }]}
                onPress={() => toggleSectionCollapse(pName)}
                activeOpacity={0.8}
              >
                <View style={[styles.groupLogoBox, { backgroundColor: `${color}18` }]}>
                  <Server size={14} color={color} />
                </View>
                <Text style={[styles.groupTitle, { color: colors.foreground }, font("bold")]}>
                  {pName}
                </Text>
                <View style={[styles.groupCountBadge, { backgroundColor: colors.card }]}>
                  <Text style={[styles.groupCountText, { color: colors.mutedForeground }, font("bold")]}>
                    {pModels.length}
                  </Text>
                </View>
                <View style={{ marginLeft: "auto" }}>
                  {isCollapsed ? (
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  ) : (
                    <ChevronUp size={16} color={colors.mutedForeground} />
                  )}
                </View>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={styles.modelsList}>
                  {pModels.map((m) => {
                    const isSelected = m.id === activeId;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.modelItemCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isSelected && [
                            styles.modelItemCardSelected,
                            { borderColor: colors.primary, backgroundColor: colors.primary + "0A" },
                          ],
                        ]}
                        onPress={() => handleSelectModel(m.id)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.modelItemTop}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.modelNameRow}>
                              <Text style={[styles.modelItemName, { color: colors.foreground }, font("bold")]}>
                                {m.name}
                              </Text>
                              {m.isDefault && (
                                <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "26" }]}>
                                  <Text style={[styles.defaultBadgeText, { color: colors.primary }, font("bold")]}>DEFAULT</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.modelItemId, { color: colors.mutedForeground }, mono("regular")]}>
                              {m.id}
                            </Text>
                          </View>

                          <View style={styles.selectCol}>
                            {isSelected ? (
                              <View style={[styles.selectedCircle, { backgroundColor: colors.primary }]}>
                                <Check size={12} color={colors.primaryForeground} />
                              </View>
                            ) : (
                              <View style={[styles.unselectedCircle, { borderColor: colors.mutedForeground }]} />
                            )}
                          </View>
                        </View>

                        {/* Badges / Specs */}
                        <View style={styles.metaRow}>
                          {m.supportsImages && (
                            <View style={[styles.specBadge, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.specBadgeText, { color: colors.mutedForeground }, font("semibold")]}>
                                Multimodal
                              </Text>
                            </View>
                          )}
                          {m.reasoning && (
                            <View style={[styles.specBadge, { backgroundColor: colors.primary + "1F" }]}>
                              <Sparkles size={10} color={colors.primary} />
                              <Text style={[styles.specBadgeText, { color: colors.primary }, font("bold")]}>
                                Reasoning
                              </Text>
                            </View>
                          )}
                          {m.contextWindow ? (
                            <View style={[styles.specBadge, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.specBadgeText, { color: colors.mutedForeground }, font("regular")]}>
                                {Math.round(m.contextWindow / 1000)}k Context
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Surface>
          );
        })}

        {/* Empty Search State */}
        {!isLoading && Object.keys(groupedModels).length === 0 && (
          <EmptyState
            icon={AlertCircle}
            title="No Models Found"
            description="No models match your search or filter criteria. Connect a provider or adjust filters."
          />
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── BOTTOM STICKY BAR: ACTIVE MODEL & EFFORT SELECTOR ── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.bottomModelInfo}>
          <Text style={[styles.bottomLabel, { color: colors.mutedForeground }, font("semibold")]}>
            ACTIVE MODEL
          </Text>
          <Text style={[styles.bottomModelName, { color: colors.foreground }, font("bold")]} numberOfLines={1}>
            {models.find((m) => m.id === activeId)?.name || activeId || "None"}
          </Text>
        </View>

        {/* 4 Reasoning Effort Selector: Low, Medium, Max, Ultra */}
        <View style={[styles.effortPills, { backgroundColor: colors.secondary }]}>
          {REASONING_EFFORTS.map((lvl) => {
            const active = effort === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.effortPill, active && [styles.effortPillActive, { backgroundColor: colors.primary }]]}
                onPress={() => setEffort(lvl)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.effortPillText,
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                    font(active ? "bold" : "regular"),
                  ]}
                >
                  {lvl.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={handleApplyToServer}
          disabled={applying}
          activeOpacity={0.8}
        >
          {applying ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Check size={14} color={colors.primaryForeground} />
          )}
          <Text style={[styles.applyBtnText, { color: colors.primaryForeground }, font("bold")]}>
            {applying ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Connect Custom Provider with Multi-Token Pooling ── */}
      <Modal
        visible={showConnectorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConnectorModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowConnectorModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Surface style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "14" }]}>
                      <Plug size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: colors.foreground }, font("bold")]}>
                      Connect API Provider
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowConnectorModal(false)}>
                    <X size={17} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                    Choose Preset / Engine
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScroll}
                  >
                    {BUILTIN_PROVIDER_PRESETS.map((preset) => {
                      const isSel = selectedPresetId === preset.id;
                      return (
                        <TouchableOpacity
                          key={preset.id}
                          style={[
                            styles.presetChip,
                            { backgroundColor: "transparent", borderColor: "transparent" },
                            isSel && { backgroundColor: colors.primary + "1F", borderColor: colors.primary },
                          ]}
                          onPress={() => handleSelectPreset(preset)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              { color: isSel ? colors.primary : colors.mutedForeground },
                              font(isSel ? "bold" : "regular"),
                            ]}
                          >
                            {preset.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {selectedPresetId === "antigravity" && (
                    <View style={[styles.infoBanner, { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "33" }]}>
                      <Info size={13} color={colors.primary} />
                      <Text style={[styles.infoBannerText, { color: colors.primary }, font("regular")]}>
                        Google Antigravity is natively adapted in-binary. Connect OAuth tokens (ya29...) or API keys.
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                    Provider Display Name
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                      font("regular"),
                    ]}
                    placeholder="e.g. Google Antigravity, OpenAI, DeepSeek"
                    placeholderTextColor={colors.mutedForeground}
                    value={providerName}
                    onChangeText={setProviderName}
                  />

                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                    Base URL (OpenAI / Antigravity)
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                      mono("regular"),
                    ]}
                    placeholder="https://api.openai.com/v1"
                    placeholderTextColor={colors.mutedForeground}
                    value={providerBaseUrl}
                    onChangeText={setProviderBaseUrl}
                    autoCapitalize="none"
                  />

                  {/* Optional GCP Project ID for Antigravity */}
                  {selectedPresetId === "antigravity" && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                        GCP Project ID (Optional)
                      </Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                          mono("regular"),
                        ]}
                        placeholder="e.g. aicode-consumers (leave blank for auto-detect)"
                        placeholderTextColor={colors.mutedForeground}
                        value={providerProjectId}
                        onChangeText={setProviderProjectId}
                        autoCapitalize="none"
                      />
                    </>
                  )}

                  {/* Multi-Token API Key Section */}
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                        API Keys / Tokens ({providerApiKeys.length})
                      </Text>
                      <Text style={[{ fontSize: 10, color: colors.success }, font("bold")]}>
                        Auto-Failover on 429/401
                      </Text>
                    </View>

                    <View style={styles.tokenInputRow}>
                      <TextInput
                        style={[
                          styles.tokenInput,
                          { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                          mono("regular"),
                        ]}
                        placeholder={
                          selectedPresetId === "antigravity"
                            ? "Paste ya29... token or API key"
                            : "Paste API key (comma or newline separated)"
                        }
                        placeholderTextColor={colors.mutedForeground}
                        value={newKeyInput}
                        onChangeText={setNewKeyInput}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[styles.addTokenBtn, { backgroundColor: colors.primary }]}
                        onPress={handleAddTokenToNew}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={colors.primaryForeground} />
                        <Text style={[styles.addTokenBtnText, { color: colors.primaryForeground }, font("bold")]}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Chips for added tokens */}
                    <View style={styles.tokensChipsContainer}>
                      {providerApiKeys.map((k, idx) => (
                        <View
                          key={`${k.slice(0, 8)}-${idx}`}
                          style={[styles.tokenChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        >
                          <Key size={11} color={colors.success} />
                          <Text style={[styles.tokenChipText, { color: colors.foreground }, mono("regular")]}>
                            Token #{idx + 1} ({k.slice(0, 4)}...{k.slice(-4)})
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveTokenFromNew(idx)}>
                            <X size={12} color={colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Test & Discover Models */}
                  <TouchableOpacity
                    style={[styles.testBtn, { borderColor: colors.primary + "66", backgroundColor: colors.primary + "14" }]}
                    onPress={handleTestAndFetchProvider}
                    disabled={isTestingProvider}
                    activeOpacity={0.8}
                  >
                    {isTestingProvider ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <RefreshCw size={13} color={colors.primary} />
                    )}
                    <Text style={[styles.testBtnText, { color: colors.primary }, font("bold")]}>
                      {isTestingProvider ? "Discovering Models…" : "Test Connection & Discover"}
                    </Text>
                  </TouchableOpacity>

                  {testedProviderModels.length > 0 && (
                    <View style={[styles.discoveredNote, { backgroundColor: colors.success + "14", borderColor: colors.success + "33" }]}>
                      <Check size={13} color={colors.success} />
                      <Text style={[{ color: colors.success, fontSize: 12 }, font("bold")]}>
                        {testedProviderModels.length} models ready to import
                      </Text>
                    </View>
                  )}

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[styles.saveProviderBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveProvider}
                    activeOpacity={0.8}
                  >
                    <Check size={14} color={colors.primaryForeground} />
                    <Text style={[styles.saveProviderBtnText, { color: colors.primaryForeground }, font("bold")]}>Save Provider</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal: Edit Provider & Multi-Token Pool ── */}
      {activeEditingProvider && (
        <Modal
          visible={!!activeEditingProvider}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveEditingProvider(null)}
        >
          <TouchableWithoutFeedback onPress={() => setActiveEditingProvider(null)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Surface style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "14" }]}>
                        <Settings size={15} color={colors.primary} />
                      </View>
                      <Text style={[styles.modalTitle, { color: colors.foreground }, font("bold")]}>
                        {activeEditingProvider.name} Settings
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveEditingProvider(null)}>
                      <X size={17} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>Base URL</Text>
                  <Text style={[styles.readOnlyText, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }, mono("regular")]}>
                    {activeEditingProvider.baseUrl}
                  </Text>

                  {/* Project ID */}
                  {activeEditingProvider.id === "antigravity" && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                        GCP Project ID
                      </Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                          mono("regular"),
                        ]}
                        placeholder="e.g. aicode-consumers"
                        placeholderTextColor={colors.mutedForeground}
                        value={editProviderProjectId}
                        onChangeText={setEditProviderProjectId}
                        autoCapitalize="none"
                      />
                    </>
                  )}

                  {/* Multi-Token Keys */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }, font("semibold")]}>
                      Configured Tokens ({editProviderApiKeys.length})
                    </Text>
                    <Text style={[{ fontSize: 10, color: colors.success }, font("bold")]}>
                      Auto Failover on 429 & 401/403
                    </Text>
                  </View>

                  <View style={styles.tokenInputRow}>
                    <TextInput
                      style={[
                        styles.tokenInput,
                        { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
                        mono("regular"),
                      ]}
                      placeholder="Add another API key or OAuth token"
                      placeholderTextColor={colors.mutedForeground}
                      value={editNewKeyInput}
                      onChangeText={setEditNewKeyInput}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[styles.addTokenBtn, { backgroundColor: colors.primary }]}
                      onPress={handleAddTokenToEdit}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={colors.primaryForeground} />
                      <Text style={[styles.addTokenBtnText, { color: colors.primaryForeground }, font("bold")]}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Key Chips */}
                  <View style={styles.tokensChipsContainer}>
                    {editProviderApiKeys.map((k, idx) => (
                      <View
                        key={`${k.slice(0, 8)}-${idx}`}
                        style={[styles.tokenChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Key size={11} color={colors.success} />
                        <Text style={[styles.tokenChipText, { color: colors.foreground }, mono("regular")]}>
                          Token #{idx + 1} ({k.slice(0, 4)}...{k.slice(-4)})
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveTokenFromEdit(idx)}>
                          <X size={12} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveEditedProviderBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveEditedProvider}
                    activeOpacity={0.8}
                  >
                    <Check size={14} color={colors.primaryForeground} />
                    <Text style={[styles.saveProviderBtnText, { color: colors.primaryForeground }, font("bold")]}>Save Configuration</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteProviderBtn, { backgroundColor: colors.destructive + "1F", borderColor: colors.destructive + "4D" }]}
                    onPress={() => handleDeleteProvider(activeEditingProvider.id)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={15} color={colors.destructive} />
                    <Text style={[styles.deleteProviderBtnText, { color: colors.destructive }, font("bold")]}>
                      Delete Provider
                    </Text>
                  </TouchableOpacity>
                </Surface>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* ── Modal: Add Fallback Model to Chain ── */}
      <Modal
        visible={showAddChainModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddChainModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddChainModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Surface style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "14" }]}>
                      <Layers size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: colors.foreground }, font("bold")]}>
                      Select Fallback Model
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowAddChainModal(false)}>
                    <X size={17} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
                  {models
                    .filter((m) => m.id !== activeId && !fallbackChain.includes(m.id))
                    .map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chainPickerItem, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        onPress={() => handleAddToChain(m.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.chainPickerName, { color: colors.foreground }, font("bold")]}>
                            {m.name}
                          </Text>
                          <Text style={[styles.chainPickerId, { color: colors.mutedForeground }, mono("regular")]}>
                            {m.id}
                          </Text>
                        </View>
                        <View style={[styles.addToChainBtn, { backgroundColor: colors.primary + "14" }]}>
                          <Plus size={15} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                    ))}

                  {models.filter((m) => m.id !== activeId && !fallbackChain.includes(m.id))
                    .length === 0 && (
                    <Text
                      style={[
                        {
                          color: colors.mutedForeground,
                          fontSize: 12.5,
                          textAlign: "center",
                          paddingVertical: 28,
                        },
                        font("regular"),
                      ]}
                    >
                      All available models are already in the routing chain.
                    </Text>
                  )}
                </ScrollView>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 20,
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  mainHeading: {
    fontSize: 24,
    letterSpacing: -0.2,
  },
  mainSubheading: {
    fontSize: 13,
    marginTop: 4,
  },
  headerBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reloadBtnText: {
    fontSize: 12,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  connectBtnText: {
    fontSize: 12,
  },
  providersCard: {
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  providersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  providersSectionTitle: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: "auto",
  },
  countBadgeText: {
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  providerLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfoCol: {
    flex: 1,
  },
  providerRowName: {
    fontSize: 14,
    lineHeight: 20,
  },
  providerRowSub: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  providerRowProject: {
    fontSize: 10,
    marginTop: 1,
  },
  tokenMultiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tokenMultiBadgeText: {
    fontSize: 9.5,
  },
  providerActionCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallbackChainCard: {
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallbackChainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fallbackChainTitle: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  fallbackChainDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  chainItemPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chainRankBadgePrimary: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chainRankTextPrimary: {
    fontSize: 11,
    color: "#FFF",
  },
  activeDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chainItemSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chainRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chainRankText: {
    fontSize: 11,
  },
  chainItemName: {
    fontSize: 13,
  },
  chainItemSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  chainIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  chainActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  addChainBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addChainBtnText: {
    fontSize: 12,
  },
  saveChainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  saveChainBtnText: {
    fontSize: 12,
  },
  chainPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chainPickerName: {
    fontSize: 13.5,
  },
  chainPickerId: {
    fontSize: 11.5,
    marginTop: 2,
  },
  addToChainBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  searchFilterSection: {
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterPillActive: {
  },
  filterPillText: {
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  providerGroupCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  groupLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  groupCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  groupCountText: {
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  modelsList: {
    padding: 14,
    gap: 12,
  },
  modelItemCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modelItemCardSelected: {
  },
  modelItemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  modelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelItemName: {
    fontSize: 14,
    lineHeight: 20,
  },
  modelItemId: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  defaultBadgeText: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  selectCol: {
    paddingTop: 2,
  },
  selectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    opacity: 0.35,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  specBadgeText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 32 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  bottomModelInfo: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  bottomModelName: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  effortPills: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  effortPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  effortPillActive: {
  },
  effortPillText: {
    fontSize: 9.5,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  applyBtnText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: 20,
    gap: 12,
    maxHeight: "85%",
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 16,
    letterSpacing: -0.1,
  },
  inputLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  presetsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetChipText: {
    fontSize: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  tokenInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  },
  tokenInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  addTokenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  addTokenBtnText: {
    fontSize: 12,
  },
  tokensChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 6,
  },
  tokenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tokenChipText: {
    fontSize: 11.5,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  testBtnText: {
    fontSize: 12.5,
  },
  discoveredNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  saveProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 999,
    marginTop: 12,
  },
  saveEditedProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 999,
    marginTop: 12,
  },
  saveProviderBtnText: {
    fontSize: 13.5,
  },
  readOnlyText: {
    fontSize: 12.5,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  deleteProviderBtnText: {
    fontSize: 13,
  },
});
