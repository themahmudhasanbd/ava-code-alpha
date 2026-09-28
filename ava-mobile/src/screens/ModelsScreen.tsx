import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cpu,
  ExternalLink,
  Eye,
  Globe,
  Key,
  Layers,
  LogOut,
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
  Wrench,
  X,
  Zap,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, GlassCapsule, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { keys, useModels, useServerConfig, useWriteConfig } from "@/state/queries";
import {
  BUILTIN_PROVIDER_PRESETS,
  clearAntigravityAuth,
  deleteCustomModel,
  deleteCustomProvider,
  exchangeAntigravityOAuthCode,
  fetchAntigravityModels,
  fetchOpenAiCompatibleModels,
  getAntigravityAuth,
  getCustomModels,
  getCustomProviders,
  saveAntigravityAuth,
  saveCustomModel,
  saveCustomProvider,
  toggleCustomProvider,
  type AntigravityAuthData,
  type CustomProvider,
} from "@/core/custom-models";
import { getAntigravityAuthUrl, REASONING_EFFORTS } from "@/config/models";
import type { ModelInfo } from "@/core/types";
import { COLORS, useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

type CategoryFilter = "all" | "antigravity" | "openai" | "anthropic" | "google" | "deepseek" | "custom";

export function ModelsScreen() {
  const { modelId, setModelId, effort, setEffort } = useAva();
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const { data: models = [], isLoading, error, refetch: refetchModels } = useModels();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();

  const activeId = modelId || models.find((m) => m.isDefault)?.id || models[0]?.id;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [isReloading, setIsReloading] = useState(false);

  // Collapsed sections map
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Antigravity OAuth State
  const [antigravityAuth, setAntigravityAuth] = useState<AntigravityAuthData | null>(null);
  const [showAntigravityAuthBox, setShowAntigravityAuthBox] = useState(false);
  const [antigravityInput, setAntigravityInput] = useState("");
  const [isExchangingAntigravity, setIsExchangingAntigravity] = useState(false);
  const [isSyncingAntigravity, setIsSyncingAntigravity] = useState(false);

  // Custom Providers State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("openai");
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerBaseUrl, setProviderBaseUrl] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [testedProviderModels, setTestedProviderModels] = useState<ModelInfo[]>([]);

  // Provider Settings / Edit Modal
  const [activeEditingProvider, setActiveEditingProvider] = useState<CustomProvider | null>(null);

  const [applying, setApplying] = useState(false);

  // Load Antigravity & Provider state on mount
  useEffect(() => {
    loadLocalState();
  }, []);

  const loadLocalState = async () => {
    try {
      const [auth, providers] = await Promise.all([getAntigravityAuth(), getCustomProviders()]);
      setAntigravityAuth(auth);
      setCustomProviders(providers);
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
          (m) => m.provider === "antigravity" || m.id.startsWith("antigravity/")
        );
      } else if (activeFilter === "openai") {
        filtered = filtered.filter(
          (m) => m.provider === "openai" || m.id.toLowerCase().includes("gpt") || m.id.toLowerCase().includes("o1") || m.id.toLowerCase().includes("o3")
        );
      } else if (activeFilter === "anthropic") {
        filtered = filtered.filter(
          (m) => m.provider === "anthropic" || m.id.toLowerCase().includes("claude")
        );
      } else if (activeFilter === "google") {
        filtered = filtered.filter(
          (m) => m.provider === "google" || m.id.toLowerCase().includes("gemini")
        );
      } else if (activeFilter === "deepseek") {
        filtered = filtered.filter(
          (m) => m.provider === "deepseek" || m.id.toLowerCase().includes("deepseek")
        );
      } else if (activeFilter === "custom") {
        filtered = filtered.filter((m) => m.provider === "custom");
      }
    }

    const groups: Record<string, ModelInfo[]> = {};
    for (const m of filtered) {
      let p = m.provider || "Server Core";
      if (m.id.startsWith("antigravity/")) p = "Google Antigravity";
      else if (p === "antigravity") p = "Google Antigravity";
      else if (p === "openai") p = "OpenAI";
      else if (p === "anthropic") p = "Anthropic";
      else if (p === "google") p = "Google Gemini";
      else if (p === "deepseek") p = "DeepSeek";
      else if (p === "groq") p = "Groq";
      else if (p === "openrouter") p = "OpenRouter";
      else if (p === "server" || p === "omniroute") p = "AvA Core Server";

      if (!groups[p]) groups[p] = [];
      groups[p].push(m);
    }

    return groups;
  }, [models, searchQuery, activeFilter]);

  const handleSelectModel = (id: string) => {
    setModelId(id);
  };

  // ── Antigravity OAuth Handlers ──
  const handleOpenGoogleOAuth = async () => {
    const url = getAntigravityAuthUrl();
    try {
      await Linking.openURL(url);
      setShowAntigravityAuthBox(true);
    } catch {
      Alert.alert("OAuth Error", "Could not open browser for Google authentication.");
    }
  };

  const handleConnectAntigravity = async () => {
    const trimmed = antigravityInput.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please paste your OAuth redirect URI or authorization code.");
      return;
    }

    setIsExchangingAntigravity(true);
    try {
      const res = await exchangeAntigravityOAuthCode(trimmed);
      if (res.success && res.accessToken) {
        const dynamicModels = await fetchAntigravityModels(res.accessToken);
        await loadLocalState();
        await qc.invalidateQueries({ queryKey: keys.models });
        setAntigravityInput("");
        setShowAntigravityAuthBox(false);
        Alert.alert(
          "Antigravity Connected!",
          `Successfully connected Google Antigravity. Discovered ${dynamicModels.length || 33} dynamic reasoning models.`
        );
      } else {
        Alert.alert("Authentication Failed", res.error || "Could not exchange authorization code.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to authenticate with Google Antigravity.");
    } finally {
      setIsExchangingAntigravity(false);
    }
  };

  const handleSyncAntigravity = async () => {
    if (!antigravityAuth?.accessToken) {
      Alert.alert("Not Connected", "Please sign in to Google Antigravity first.");
      return;
    }

    setIsSyncingAntigravity(true);
    try {
      const dynamicModels = await fetchAntigravityModels(antigravityAuth.accessToken);
      await qc.invalidateQueries({ queryKey: keys.models });
      Alert.alert(
        "Sync Complete",
        `Refreshed ${dynamicModels.length} dynamic Antigravity models.`
      );
    } catch (err: any) {
      Alert.alert("Sync Error", err?.message || "Failed to sync Antigravity models.");
    } finally {
      setIsSyncingAntigravity(false);
    }
  };

  const handleDisconnectAntigravity = async () => {
    Alert.alert("Disconnect Antigravity", "Are you sure you want to remove Google Antigravity credentials?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await clearAntigravityAuth();
          await loadLocalState();
          await qc.invalidateQueries({ queryKey: keys.models });
        },
      },
    ]);
  };

  // ── Custom Provider Handlers ──
  const handleOpenConnector = () => {
    const defaultPreset = BUILTIN_PROVIDER_PRESETS.find((p) => p.id === "openai") || BUILTIN_PROVIDER_PRESETS[1];
    setSelectedPresetId(defaultPreset.id);
    setProviderId(defaultPreset.id);
    setProviderName(defaultPreset.name);
    setProviderBaseUrl(defaultPreset.baseUrl);
    setProviderApiKey("");
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

  const handleTestAndFetchProvider = async () => {
    if (!providerBaseUrl.trim()) {
      Alert.alert("Required", "Base URL is required to fetch models.");
      return;
    }

    setIsTestingProvider(true);
    try {
      const fetched = await fetchOpenAiCompatibleModels(
        providerBaseUrl.trim(),
        providerApiKey.trim() || undefined,
        providerId.trim() || "custom"
      );
      setTestedProviderModels(fetched);
      if (fetched.length === 0) {
        Alert.alert("No Models Found", "Connected to endpoint but no models were returned by /models.");
      } else {
        Alert.alert("Discovery Successful", `Discovered ${fetched.length} models from ${providerBaseUrl}.`);
      }
    } catch (err: any) {
      Alert.alert("Connection Failed", err?.message || "Could not fetch models from provider endpoint.");
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

    try {
      const modelsToSave = testedProviderModels.length > 0 ? testedProviderModels : [];
      await saveCustomProvider({
        id: pId,
        name: providerName.trim() || pId,
        baseUrl: pUrl,
        apiKey: providerApiKey.trim() || undefined,
        enabled: true,
        models: modelsToSave,
      });

      await loadLocalState();
      await qc.invalidateQueries({ queryKey: keys.models });
      setShowConnectorModal(false);
      Alert.alert("Provider Saved", `Provider "${pId}" configured with ${modelsToSave.length} models.`);
    } catch (err: any) {
      Alert.alert("Save Error", err?.message || "Failed to save provider.");
    }
  };

  const handleDeleteProvider = async (id: string) => {
    Alert.alert("Delete Provider", `Remove provider "${id}" and its models?`, [
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

  // ── Save to Server Config ──
  const handleApplyToServer = async () => {
    setApplying(true);
    try {
      const fields: Record<string, unknown> = {};
      if (activeId) {
        fields.model = activeId;
        const selectedModel = models.find((m) => m.id === activeId);
        if (selectedModel?.provider === "antigravity" || activeId.startsWith("antigravity/")) {
          fields.model_provider = "antigravity";
        } else if (selectedModel?.provider && selectedModel.provider !== "server") {
          fields.model_provider = selectedModel.provider;
        }
      }
      if (effort) fields.model_reasoning_effort = effort;

      const result = await writeConfig.mutateAsync(fields);
      if (result.success) {
        Alert.alert("Saved to Server", `Model "${activeId}" (${effort} reasoning) saved to server configuration.`);
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
    if (l.includes("antigravity")) return "#38BDF8";
    if (l.includes("openai")) return "#10A37F";
    if (l.includes("anthropic")) return "#D97706";
    if (l.includes("google") || l.includes("gemini")) return "#4285F4";
    if (l.includes("deepseek")) return "#3B82F6";
    if (l.includes("groq")) return "#F97316";
    if (l.includes("openrouter")) return "#6366F1";
    return "#8B5CF6";
  };

  return (
    <AppShell title="AI Models & Providers">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Bar matching Flutter */}
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainHeading, font("bold")]}>AI Models & Providers</Text>
            <Text style={[styles.mainSubheading, font("regular")]}>
              {models.length} models across {Object.keys(groupedModels).length} active providers
            </Text>
          </View>

          <View style={styles.headerBtnGroup}>
            <TouchableOpacity
              style={styles.reloadBtn}
              onPress={handleReloadModels}
              disabled={isReloading}
              activeOpacity={0.7}
            >
              {isReloading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <RotateCw size={14} color="#6366F1" />
              )}
              <Text style={[styles.reloadBtnText, font("semibold")]}>
                {isReloading ? "Reloading…" : "Reload"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleOpenConnector}
              activeOpacity={0.8}
            >
              <Plug size={14} color="#FFF" />
              <Text style={[styles.connectBtnText, font("bold")]}>Connect API</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 1. AI PROVIDERS & CONNECTIONS Section matching Flutter _providersSection ── */}
        <Surface style={styles.providersCard}>
          <View style={styles.providersHeaderRow}>
            <Cpu size={15} color="#6366F1" />
            <Text style={[styles.providersSectionTitle, font("bold")]}>
              AI PROVIDERS & CONNECTIONS
            </Text>
            <View style={styles.countBadge}>
              <Text style={[styles.countBadgeText, font("bold")]}>
                {(customProviders.length || 0) + 1}
              </Text>
            </View>
          </View>

          {/* Antigravity Provider Item */}
          <View style={styles.providerRow}>
            <View style={[styles.providerLogoBox, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
              <Sparkles size={18} color="#38BDF8" />
            </View>

            <View style={styles.providerInfoCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.providerRowName, font("bold")]}>Google Antigravity</Text>
                <GlassCapsule label="Inbuilt" variant="cyan" size="xs" active />
              </View>
              <Text style={[styles.providerRowSub, font("regular")]}>
                {antigravityAuth?.accessToken
                  ? "OAuth Connected · Dynamic Reasoning"
                  : "Google Cloud Code PA OAuth Engine"}
              </Text>
            </View>

            <View style={styles.providerActionCol}>
              {antigravityAuth?.accessToken ? (
                <View style={styles.connectedTag}>
                  <View style={styles.greenDot} />
                  <Text style={[styles.connectedTagText, font("medium")]}>Connected</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.signInGoogleBtn}
                  onPress={handleOpenGoogleOAuth}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={12} color="#FFF" />
                  <Text style={[styles.signInGoogleText, font("semibold")]}>Sign In</Text>
                </TouchableOpacity>
              )}

              {antigravityAuth?.accessToken && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={handleSyncAntigravity}
                  disabled={isSyncingAntigravity}
                  activeOpacity={0.7}
                >
                  <RefreshCw
                    size={13}
                    color={isSyncingAntigravity ? "#38BDF8" : COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Antigravity OAuth Code Box if triggered */}
          {showAntigravityAuthBox && (
            <View style={styles.authBoxContainer}>
              <Text style={[styles.authBoxLabel, font("medium")]}>
                Paste Authorization Code or Redirect URL:
              </Text>
              <View style={styles.authBoxInputRow}>
                <TextInput
                  style={[styles.authInput, mono("regular")]}
                  placeholder="Paste 4/0A... or ya29..."
                  placeholderTextColor={COLORS.mutedForeground}
                  value={antigravityInput}
                  onChangeText={setAntigravityInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.authSubmitBtn, isExchangingAntigravity && { opacity: 0.6 }]}
                  onPress={handleConnectAntigravity}
                  disabled={isExchangingAntigravity}
                  activeOpacity={0.8}
                >
                  {isExchangingAntigravity ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Check size={14} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Custom Connected Providers */}
          {customProviders.map((cp) => {
            const color = getProviderColor(cp.name);
            const isEnabled = cp.enabled !== false;
            return (
              <View key={cp.id} style={styles.providerRow}>
                <View style={[styles.providerLogoBox, { backgroundColor: `${color}16` }]}>
                  <Server size={17} color={color} />
                </View>

                <View style={styles.providerInfoCol}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.providerRowName, font("bold")]}>{cp.name}</Text>
                    <GlassCapsule label="Custom" variant="purple" size="xs" active />
                  </View>
                  <Text style={[styles.providerRowSub, font("regular")]}>
                    {cp.baseUrl}
                  </Text>
                </View>

                <View style={styles.providerActionCol}>
                  <Switch
                    value={isEnabled}
                    onValueChange={(val) => handleToggleProvider(cp.id, val)}
                    trackColor={{ false: COLORS.border, true: "#6366F1" }}
                    thumbColor="#FFF"
                  />
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => setActiveEditingProvider(cp)}
                    activeOpacity={0.7}
                  >
                    <Settings size={14} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Surface>

        {/* ── 2. Search & Category Filter Pills matching Flutter ── */}
        <View style={styles.searchFilterSection}>
          <View style={styles.searchBox}>
            <Search size={15} color={COLORS.mutedForeground} />
            <TextInput
              style={[styles.searchInput, font("regular")]}
              placeholder="Search models across providers..."
              placeholderTextColor={COLORS.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={15} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {[
              { id: "all", label: "All Models" },
              { id: "antigravity", label: "Antigravity" },
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
              { id: "google", label: "Google" },
              { id: "deepseek", label: "DeepSeek" },
              { id: "custom", label: "Custom" },
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setActiveFilter(tab.id as CategoryFilter)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                      font("medium"),
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 3. Models List grouped by Provider ── */}
        {isLoading ? (
          <Surface style={{ padding: 20 }}>
            <SkeletonRows count={4} />
          </Surface>
        ) : Object.keys(groupedModels).length === 0 ? (
          <Surface style={styles.emptyContainer}>
            <Bot size={36} color={COLORS.mutedForeground} />
            <Text style={[styles.emptyTitle, font("bold")]}>No matching models found</Text>
            <Text style={[styles.emptySub, font("regular")]}>
              Try adjusting your search query or provider filters.
            </Text>
          </Surface>
        ) : (
          Object.entries(groupedModels).map(([providerName, pModels]) => {
            const isCollapsed = !!collapsedSections[providerName];
            const pColor = getProviderColor(providerName);
            const hasSelectedModel = pModels.some((m) => m.id === activeId);

            return (
              <Surface key={providerName} style={styles.providerGroupCard}>
                {/* Group Header */}
                <TouchableOpacity
                  style={styles.groupHeaderRow}
                  onPress={() => toggleSectionCollapse(providerName)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.groupLogoBox, { backgroundColor: `${pColor}16` }]}>
                    <Cpu size={15} color={pColor} />
                  </View>
                  <Text style={[styles.groupTitle, font("bold")]}>{providerName}</Text>
                  <View style={styles.groupCountBadge}>
                    <Text style={[styles.groupCountText, font("semibold")]}>
                      {pModels.length}
                    </Text>
                  </View>
                  {hasSelectedModel && (
                    <GlassCapsule label="Active" variant="success" size="xs" active />
                  )}
                  <View style={{ marginLeft: "auto" }}>
                    {isCollapsed ? (
                      <ChevronDown size={16} color={COLORS.mutedForeground} />
                    ) : (
                      <ChevronUp size={16} color={COLORS.mutedForeground} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Models within this provider */}
                {!isCollapsed && (
                  <View style={styles.modelsList}>
                    {pModels.map((model) => {
                      const isSelected = model.id === activeId;
                      const hasVision = model.supportsImages;
                      const hasReasoning = model.reasoning;

                      return (
                        <TouchableOpacity
                          key={model.id}
                          style={[
                            styles.modelItemCard,
                            isSelected && styles.modelItemCardSelected,
                          ]}
                          onPress={() => handleSelectModel(model.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.modelItemTop}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.modelNameRow}>
                                <Text
                                  style={[
                                    styles.modelItemName,
                                    isSelected && { color: "#6366F1" },
                                    font(isSelected ? "bold" : "semibold"),
                                  ]}
                                >
                                  {model.name}
                                </Text>
                                {model.isDefault && (
                                  <GlassCapsule label="Default" variant="primary" size="xs" active />
                                )}
                              </View>
                              <Text style={[styles.modelItemId, mono("regular")]} numberOfLines={1}>
                                {model.id}
                              </Text>
                            </View>

                            {/* Radio / Checkmark Selection */}
                            <View style={styles.selectCol}>
                              {isSelected ? (
                                <View style={styles.selectedCircle}>
                                  <Check size={13} color="#FFF" />
                                </View>
                              ) : (
                                <View style={styles.unselectedCircle} />
                              )}
                            </View>
                          </View>

                          {/* Capabilities & Metadata Row */}
                          <View style={styles.metaRow}>
                            {model.contextWindow ? (
                              <View style={styles.specBadge}>
                                <Layers size={10} color={COLORS.mutedForeground} />
                                <Text style={[styles.specBadgeText, mono("regular")]}>
                                  {model.contextWindow >= 1000000
                                    ? `${(model.contextWindow / 1000000).toFixed(1)}M`
                                    : `${Math.round(model.contextWindow / 1000)}k`}
                                </Text>
                              </View>
                            ) : null}

                            {hasVision && (
                              <View style={styles.specBadge}>
                                <Eye size={10} color="#10B981" />
                                <Text style={[styles.specBadgeText, font("medium")]}>Vision</Text>
                              </View>
                            )}

                            {hasReasoning && (
                              <View style={styles.specBadge}>
                                <Brain size={10} color="#38BDF8" />
                                <Text style={[styles.specBadgeText, font("medium")]}>Thinking</Text>
                              </View>
                            )}

                            <View style={styles.specBadge}>
                              <Wrench size={10} color="#F59E0B" />
                              <Text style={[styles.specBadgeText, font("medium")]}>Tools</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </Surface>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── 4. Bottom Active Model & Apply Bar ── */}
      <Surface style={styles.bottomBar}>
        <View style={styles.bottomModelInfo}>
          <Text style={[styles.bottomLabel, font("medium")]}>Active Model:</Text>
          <Text style={[styles.bottomModelName, font("bold")]} numberOfLines={1}>
            {activeId || "None selected"}
          </Text>
        </View>

        {/* Reasoning Effort Selector */}
        <View style={styles.effortPills}>
          {(["low", "medium", "high"] as const).map((lvl) => {
            const active = effort === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.effortPill, active && styles.effortPillActive]}
                onPress={() => setEffort(lvl)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.effortPillText,
                    active && styles.effortPillTextActive,
                    font("medium"),
                  ]}
                >
                  {lvl.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save to Server Button */}
        <TouchableOpacity
          style={[styles.applyBtn, applying && { opacity: 0.6 }]}
          onPress={handleApplyToServer}
          disabled={applying}
          activeOpacity={0.8}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Check size={14} color="#FFF" />
          )}
          <Text style={[styles.applyBtnText, font("bold")]}>Save to Server</Text>
        </TouchableOpacity>
      </Surface>

      {/* ── Modal: Connect API / Add Custom Provider ── */}
      <Modal
        visible={showConnectorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConnectorModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowConnectorModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Surface style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Plug size={17} color="#6366F1" />
                    <Text style={[styles.modalTitle, font("bold")]}>Connect AI Provider</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowConnectorModal(false)}>
                    <X size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Presets */}
                  <Text style={[styles.inputLabel, font("semibold")]}>Provider Preset</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScroll}
                  >
                    {BUILTIN_PROVIDER_PRESETS.filter((p) => p.id !== "antigravity").map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.presetChip,
                          selectedPresetId === p.id && styles.presetChipActive,
                        ]}
                        onPress={() => handleSelectPreset(p)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            selectedPresetId === p.id && styles.presetChipTextActive,
                            font("medium"),
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.inputLabel, font("semibold")]}>Provider Name</Text>
                  <TextInput
                    style={[styles.modalInput, font("regular")]}
                    placeholder="e.g. OpenAI, DeepSeek, Groq"
                    placeholderTextColor={COLORS.mutedForeground}
                    value={providerName}
                    onChangeText={setProviderName}
                  />

                  <Text style={[styles.inputLabel, font("semibold")]}>Base URL (/v1)</Text>
                  <TextInput
                    style={[styles.modalInput, mono("regular")]}
                    placeholder="https://api.openai.com/v1"
                    placeholderTextColor={COLORS.mutedForeground}
                    value={providerBaseUrl}
                    onChangeText={setProviderBaseUrl}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.inputLabel, font("semibold")]}>API Key (Optional for local)</Text>
                  <TextInput
                    style={[styles.modalInput, mono("regular")]}
                    placeholder="sk-..."
                    placeholderTextColor={COLORS.mutedForeground}
                    value={providerApiKey}
                    onChangeText={setProviderApiKey}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  {/* Test & Fetch */}
                  <TouchableOpacity
                    style={[styles.testBtn, isTestingProvider && { opacity: 0.6 }]}
                    onPress={handleTestAndFetchProvider}
                    disabled={isTestingProvider}
                    activeOpacity={0.8}
                  >
                    {isTestingProvider ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <RotateCw size={14} color="#6366F1" />
                    )}
                    <Text style={[styles.testBtnText, font("semibold")]}>
                      {isTestingProvider ? "Discovering Models…" : "Test & Discover Models"}
                    </Text>
                  </TouchableOpacity>

                  {testedProviderModels.length > 0 && (
                    <Text style={[styles.discoveredNote, font("medium")]}>
                      Discovered {testedProviderModels.length} models ready to import.
                    </Text>
                  )}

                  {/* Save */}
                  <TouchableOpacity
                    style={styles.saveProviderBtn}
                    onPress={handleSaveProvider}
                    activeOpacity={0.8}
                  >
                    <Check size={15} color="#FFF" />
                    <Text style={[styles.saveProviderBtnText, font("bold")]}>Save Provider</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal: Edit / Delete Provider ── */}
      {activeEditingProvider && (
        <Modal
          visible={!!activeEditingProvider}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveEditingProvider(null)}
        >
          <TouchableWithoutFeedback onPress={() => setActiveEditingProvider(null)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <Surface style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={[styles.modalTitle, font("bold")]}>
                      {activeEditingProvider.name} Settings
                    </Text>
                    <TouchableOpacity onPress={() => setActiveEditingProvider(null)}>
                      <X size={17} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, font("semibold")]}>Base URL</Text>
                  <Text style={[styles.readOnlyText, mono("regular")]}>
                    {activeEditingProvider.baseUrl}
                  </Text>

                  <Text style={[styles.inputLabel, font("semibold")]}>Configured Models</Text>
                  <Text style={[styles.readOnlyText, font("regular")]}>
                    {activeEditingProvider.models?.length || 0} models imported
                  </Text>

                  <TouchableOpacity
                    style={styles.deleteProviderBtn}
                    onPress={() => handleDeleteProvider(activeEditingProvider.id)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={15} color="#EF4444" />
                    <Text style={[styles.deleteProviderBtnText, font("bold")]}>
                      Delete Provider
                    </Text>
                  </TouchableOpacity>
                </Surface>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  mainHeading: {
    fontSize: 20,
    color: COLORS.foreground,
  },
  mainSubheading: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.35)",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  reloadBtnText: {
    fontSize: 12,
    color: "#6366F1",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#6366F1",
  },
  connectBtnText: {
    fontSize: 12,
    color: "#FFF",
  },
  providersCard: {
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  providersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  providersSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: COLORS.mutedForeground,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    marginLeft: "auto",
  },
  countBadgeText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfoCol: {
    flex: 1,
  },
  providerRowName: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  providerRowSub: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  providerActionCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  connectedTagText: {
    fontSize: 11,
    color: "#10B981",
  },
  signInGoogleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "#38BDF8",
  },
  signInGoogleText: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "700",
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 7,
    backgroundColor: COLORS.card,
  },
  authBoxContainer: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  authBoxLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  authBoxInputRow: {
    flexDirection: "row",
    gap: 6,
  },
  authInput: {
    flex: 1,
    height: 34,
    borderRadius: 7,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    fontSize: 11,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  searchFilterSection: {
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  filterPillText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  filterPillTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  providerGroupCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.secondary,
  },
  groupLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  groupCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.card,
  },
  groupCountText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  modelsList: {
    padding: 10,
    gap: 8,
  },
  modelItemCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  modelItemCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(99, 102, 241, 0.04)",
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
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  modelItemId: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  selectCol: {
    paddingTop: 2,
  },
  selectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: COLORS.mutedForeground,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  specBadgeText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  emptySub: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
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
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 8,
  },
  bottomModelInfo: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  bottomModelName: {
    fontSize: 12.5,
    color: COLORS.foreground,
    marginTop: 1,
  },
  effortPills: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    padding: 2,
  },
  effortPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  effortPillActive: {
    backgroundColor: "#6366F1",
  },
  effortPillText: {
    fontSize: 9.5,
    color: COLORS.mutedForeground,
  },
  effortPillTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#10B981",
  },
  applyBtnText: {
    fontSize: 12,
    color: "#FFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 15,
    color: COLORS.foreground,
  },
  inputLabel: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  presetsScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "#6366F1",
  },
  presetChipText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  presetChipTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  modalInput: {
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    fontSize: 12,
    color: COLORS.foreground,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.4)",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    marginTop: 6,
  },
  testBtnText: {
    fontSize: 12,
    color: "#6366F1",
  },
  discoveredNote: {
    fontSize: 11,
    color: "#10B981",
    textAlign: "center",
  },
  saveProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#6366F1",
    marginTop: 6,
  },
  saveProviderBtnText: {
    fontSize: 13,
    color: "#FFF",
  },
  readOnlyText: {
    fontSize: 12,
    color: COLORS.foreground,
    padding: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  deleteProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginTop: 10,
  },
  deleteProviderBtnText: {
    fontSize: 12.5,
    color: "#EF4444",
  },
});
