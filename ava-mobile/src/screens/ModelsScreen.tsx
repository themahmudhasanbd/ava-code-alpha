import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  Eye,
  Globe,
  Key,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
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
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

type CategoryTab = "all" | "antigravity" | "providers" | "server" | "custom";

export function ModelsScreen() {
  const { modelId, setModelId, effort, setEffort } = useAva();
  const qc = useQueryClient();
  const { data: models = [], isLoading, error, refetch: refetchModels } = useModels();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();

  const activeId = modelId || models.find((m) => m.isDefault)?.id || models[0]?.id;

  // Tabs & Search
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Antigravity OAuth State
  const [antigravityAuth, setAntigravityAuth] = useState<AntigravityAuthData | null>(null);
  const [showAntigravityAuthBox, setShowAntigravityAuthBox] = useState(false);
  const [antigravityInput, setAntigravityInput] = useState("");
  const [isExchangingAntigravity, setIsExchangingAntigravity] = useState(false);
  const [isSyncingAntigravity, setIsSyncingAntigravity] = useState(false);

  // Custom Providers State
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("openai");
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerBaseUrl, setProviderBaseUrl] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [testedProviderModels, setTestedProviderModels] = useState<ModelInfo[]>([]);

  // Standalone Custom Model Form
  const [showAddCustomModel, setShowAddCustomModel] = useState(false);
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customProvider, setCustomProvider] = useState("custom");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [supportsVision, setSupportsVision] = useState(true);
  const [supportsReasoning, setSupportsReasoning] = useState(true);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

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

  // Filtered models
  const filteredModels = useMemo(() => {
    let list = models;

    // Filter by Tab
    if (activeTab === "antigravity") {
      list = list.filter((m) => m.provider === "antigravity" || m.id.startsWith("antigravity/"));
    } else if (activeTab === "providers") {
      list = list.filter(
        (m) =>
          m.provider !== "server" &&
          m.provider !== "antigravity" &&
          m.provider !== "custom" &&
          m.provider !== "omniroute" &&
          !m.id.startsWith("antigravity/")
      );
    } else if (activeTab === "server") {
      list = list.filter(
        (m) =>
          (m.provider === "server" || m.provider === "omniroute") && !m.id.startsWith("antigravity/")
      );
    } else if (activeTab === "custom") {
      list = list.filter((m) => m.provider === "custom");
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.provider && m.provider.toLowerCase().includes(q))
      );
    }

    return list;
  }, [models, activeTab, searchQuery]);

  const handleSelect = (id: string) => {
    setModelId(id);
  };

  // ── Antigravity Handlers ──
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
      Alert.alert("Required", "Please paste your OAuth redirect URI, authorization code, or access token (ya29...).");
      return;
    }

    setIsExchangingAntigravity(true);
    try {
      const res = await exchangeAntigravityOAuthCode(trimmed);
      if (res.success && res.accessToken) {
        // Fetch dynamic models immediately
        const dynamicModels = await fetchAntigravityModels(res.accessToken);
        await loadLocalState();
        await qc.invalidateQueries({ queryKey: keys.models });
        setAntigravityInput("");
        setShowAntigravityAuthBox(false);
        Alert.alert(
          "Antigravity Connected!",
          `Successfully connected Google Antigravity. Discovered ${dynamicModels.length || 33} reasoning models dynamically.`
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
        `Refreshed ${dynamicModels.length} dynamic Antigravity models (Gemini 3.8/3.7/3.6, Claude Sonnet 4.6, Opus 4.6 Thinking).`
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
      setShowAddProviderModal(false);
      setProviderId("");
      setProviderName("");
      setProviderBaseUrl("");
      setProviderApiKey("");
      setTestedProviderModels([]);
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
        },
      },
    ]);
  };

  const handleToggleProvider = async (id: string, enabled: boolean) => {
    await toggleCustomProvider(id, enabled);
    await loadLocalState();
    await qc.invalidateQueries({ queryKey: keys.models });
  };

  // ── Standalone Custom Model Handlers ──
  const handleAddCustomModel = async () => {
    const trimmed = customId.trim();
    if (!trimmed) {
      Alert.alert("Required", "Model ID is required.");
      return;
    }
    setIsSavingCustom(true);
    try {
      await saveCustomModel({
        id: trimmed,
        name: customName.trim() || trimmed,
        provider: customProvider,
        endpoint: customEndpoint.trim() || undefined,
        supportsImages: supportsVision,
        reasoning: supportsReasoning,
      });
      await qc.invalidateQueries({ queryKey: keys.models });
      setModelId(trimmed);
      setCustomId("");
      setCustomName("");
      setCustomEndpoint("");
      setShowAddCustomModel(false);
      Alert.alert("Saved", `Custom model "${trimmed}" added and selected.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save custom model.");
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleDeleteCustomModel = async (id: string) => {
    Alert.alert("Delete Custom Model", `Remove "${id}" from your catalog?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomModel(id);
          await qc.invalidateQueries({ queryKey: keys.models });
          if (activeId === id) setModelId("");
        },
      },
    ]);
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

  return (
    <AppShell title="AI Models & Providers">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageIntro
          title="AI Architecture"
          description="Inbuilt Google Antigravity OAuth, dynamic model discovery, custom providers, and reasoning controls."
        />

        {/* ── 1. Google Antigravity Inbuilt OAuth Card ── */}
        <Surface style={styles.antigravityCard}>
          <View style={styles.agHeaderRow}>
            <View style={styles.agTitleContainer}>
              <View style={styles.agIconBox}>
                <Sparkles size={16} color="#38BDF8" />
              </View>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.agTitle, font("semibold")]}>Google Antigravity</Text>
                  <GlassCapsule label="Inbuilt" variant="cyan" size="xs" active />
                </View>
                <Text style={[styles.agSubtitle, font("regular")]}>
                  {antigravityAuth?.accessToken
                    ? "OAuth Connected · Dynamic Reasoning Models Active"
                    : "Native Google Cloud Code PA OAuth Engine"}
                </Text>
              </View>
            </View>

            {antigravityAuth?.accessToken ? (
              <View style={styles.agStatusConnected}>
                <View style={styles.greenDot} />
                <Text style={[styles.agStatusText, font("medium")]}>Connected</Text>
              </View>
            ) : (
              <View style={styles.agStatusDisconnected}>
                <View style={styles.grayDot} />
                <Text style={[styles.agStatusTextMuted, font("medium")]}>Not Connected</Text>
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.agActionRow}>
            <TouchableOpacity
              style={styles.agAuthBtn}
              onPress={handleOpenGoogleOAuth}
              activeOpacity={0.8}
            >
              <ExternalLink size={13} color="#FFF" />
              <Text style={[styles.agAuthBtnText, font("semibold")]}>Sign in with Google</Text>
            </TouchableOpacity>

            {antigravityAuth?.accessToken && (
              <TouchableOpacity
                style={[styles.agSyncBtn, isSyncingAntigravity && { opacity: 0.6 }]}
                onPress={handleSyncAntigravity}
                disabled={isSyncingAntigravity}
                activeOpacity={0.8}
              >
                <RefreshCw size={13} color="#38BDF8" />
                <Text style={[styles.agSyncBtnText, font("medium")]}>
                  {isSyncingAntigravity ? "Syncing…" : "Sync Models"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.agToggleManualBtn}
              onPress={() => setShowAntigravityAuthBox((v) => !v)}
              activeOpacity={0.8}
            >
              <Key size={13} color={COLORS.mutedForeground} />
              <Text style={[styles.agToggleManualText, font("medium")]}>
                {showAntigravityAuthBox ? "Hide Token Input" : "Paste Token / Code"}
              </Text>
              {showAntigravityAuthBox ? (
                <ChevronUp size={13} color={COLORS.mutedForeground} />
              ) : (
                <ChevronDown size={13} color={COLORS.mutedForeground} />
              )}
            </TouchableOpacity>

            {antigravityAuth?.accessToken && (
              <TouchableOpacity
                style={styles.agDisconnectBtn}
                onPress={handleDisconnectAntigravity}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LogOut size={13} color={COLORS.destructive} />
              </TouchableOpacity>
            )}
          </View>

          {/* Expandable Manual Token / Callback URI Box */}
          {showAntigravityAuthBox && (
            <View style={styles.agExpandableBox}>
              <Text style={[styles.inputLabel, font("medium")]}>
                Paste Redirect URL (http://localhost:51121/callback?code=...), Auth Code, or Access Token (ya29...):
              </Text>
              <TextInput
                style={[styles.textInput, mono("regular")]}
                placeholder="http://localhost:51121/callback?code=... OR ya29..."
                placeholderTextColor={COLORS.mutedForeground}
                value={antigravityInput}
                onChangeText={setAntigravityInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.agSubmitBtn, isExchangingAntigravity && { opacity: 0.6 }]}
                onPress={handleConnectAntigravity}
                disabled={isExchangingAntigravity}
                activeOpacity={0.8}
              >
                <Text style={[styles.agSubmitBtnText, font("semibold")]}>
                  {isExchangingAntigravity ? "Connecting & Discovering Models…" : "Connect & Discover Dynamic Models"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Surface>

        {/* ── 2. Custom Providers Management Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Layers size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>
                Model Providers ({customProviders.length})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.smallAddBtn}
              onPress={() => {
                handleSelectPreset(BUILTIN_PROVIDER_PRESETS[1]); // Default to OpenAI
                setShowAddProviderModal(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={13} color={COLORS.primary} />
              <Text style={[styles.smallAddBtnText, font("semibold")]}>Add Provider</Text>
            </TouchableOpacity>
          </View>

          {/* Configured Providers List */}
          {customProviders.length > 0 && (
            <Surface style={styles.card}>
              {customProviders.map((prov) => {
                const modelCount = prov.models?.length || 0;
                return (
                  <View key={prov.id} style={styles.providerRow}>
                    <View style={styles.providerInfo}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.providerName, font("semibold")]}>{prov.name}</Text>
                        <GlassCapsule
                          label={`${modelCount} models`}
                          variant={prov.enabled ? "primary" : "secondary"}
                          size="xs"
                        />
                      </View>
                      <Text style={[styles.providerUrl, mono("regular")]} numberOfLines={1}>
                        {prov.baseUrl}
                      </Text>
                    </View>

                    <View style={styles.providerActions}>
                      <TouchableOpacity
                        style={[styles.provToggleBtn, prov.enabled && styles.provToggleBtnActive]}
                        onPress={() => handleToggleProvider(prov.id, !prov.enabled)}
                      >
                        <Text style={[styles.provToggleText, font("medium")]}>
                          {prov.enabled ? "Active" : "Disabled"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteProvider(prov.id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={COLORS.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </Surface>
          )}

          {/* Add Provider Modal/Form */}
          {showAddProviderModal && (
            <Surface style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Server size={16} color={COLORS.primary} />
                <Text style={[styles.formTitle, font("semibold")]}>Add Custom Model Provider</Text>
                <TouchableOpacity
                  onPress={() => setShowAddProviderModal(false)}
                  style={{ marginLeft: "auto" }}
                >
                  <X size={15} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Provider Presets */}
              <Text style={[styles.inputLabel, font("medium")]}>Select Provider Preset:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                {BUILTIN_PROVIDER_PRESETS.filter((p) => p.id !== "antigravity").map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.presetChip, selectedPresetId === p.id && styles.presetChipActive]}
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

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Provider ID (lowercase identifier) *</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="e.g. openai, openrouter, deepseek, ollama"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={providerId}
                  onChangeText={setProviderId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Display Name</Text>
                <TextInput
                  style={[styles.textInput, font("regular")]}
                  placeholder="e.g. OpenRouter API"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={providerName}
                  onChangeText={setProviderName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Base URL (OpenAI-compatible /v1) *</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="https://api.openai.com/v1"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={providerBaseUrl}
                  onChangeText={setProviderBaseUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>API Key / Bearer Token (Optional for local)</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="sk-..."
                  placeholderTextColor={COLORS.mutedForeground}
                  value={providerApiKey}
                  onChangeText={setProviderApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Test & Fetch Button */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.testFetchBtn, isTestingProvider && { opacity: 0.6 }]}
                  onPress={handleTestAndFetchProvider}
                  disabled={isTestingProvider}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={13} color={COLORS.primary} />
                  <Text style={[styles.testFetchBtnText, font("semibold")]}>
                    {isTestingProvider
                      ? "Testing & Fetching…"
                      : testedProviderModels.length > 0
                        ? `Re-fetch Models (${testedProviderModels.length})`
                        : "Test & Auto-Fetch Models"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveProviderBtn}
                  onPress={handleSaveProvider}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.saveProviderBtnText, font("semibold")]}>Save Provider</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          )}
        </View>

        {/* ── 3. Search & Category Tabs ── */}
        <View style={styles.searchBar}>
          <Search size={14} color={COLORS.mutedForeground} />
          <TextInput
            style={[styles.searchInput, font("regular")]}
            placeholder="Search models by name, ID, or provider…"
            placeholderTextColor={COLORS.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabBtnText, activeTab === "all" && styles.tabBtnTextActive, font("medium")]}>
              All ({models.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "antigravity" && styles.tabBtnActive]}
            onPress={() => setActiveTab("antigravity")}
          >
            <Text style={[styles.tabBtnText, activeTab === "antigravity" && styles.tabBtnTextActive, font("medium")]}>
              Antigravity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "providers" && styles.tabBtnActive]}
            onPress={() => setActiveTab("providers")}
          >
            <Text style={[styles.tabBtnText, activeTab === "providers" && styles.tabBtnTextActive, font("medium")]}>
              Providers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "server" && styles.tabBtnActive]}
            onPress={() => setActiveTab("server")}
          >
            <Text style={[styles.tabBtnText, activeTab === "server" && styles.tabBtnTextActive, font("medium")]}>
              Server
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "custom" && styles.tabBtnActive]}
            onPress={() => setActiveTab("custom")}
          >
            <Text style={[styles.tabBtnText, activeTab === "custom" && styles.tabBtnTextActive, font("medium")]}>
              Custom
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── 4. Models Catalog ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Bot size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>
                Available Models ({filteredModels.length})
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => refetchModels()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RefreshCw size={13} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {isLoading && <SkeletonRows count={4} />}
          {error && <EmptyState icon={Bot} title="Could not load models" description={(error as Error).message} />}
          {!isLoading && filteredModels.length === 0 && (
            <EmptyState
              icon={Bot}
              title="No models match filter"
              description="Try adjusting your search query or connecting Google Antigravity / Custom Providers."
            />
          )}

          {filteredModels.length > 0 && (
            <Surface style={styles.card}>
              {filteredModels.map((m) => {
                const isSelected = activeId === m.id;
                const isCustom = m.provider === "custom";
                const isAntigravity = m.provider === "antigravity" || m.id.startsWith("antigravity/");
                const isOtherProvider =
                  !isAntigravity && !isCustom && m.provider !== "server" && m.provider !== "omniroute";

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modelRow, isSelected && styles.modelRowActive]}
                    onPress={() => handleSelect(m.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelInfo}>
                      <View style={styles.modelNameRow}>
                        <Text style={[styles.modelName, font("semibold")]}>{m.name}</Text>
                        {isAntigravity && <GlassCapsule label="Antigravity" variant="cyan" size="xs" />}
                        {isOtherProvider && (
                          <GlassCapsule label={(m.provider || "PROVIDER").toUpperCase()} variant="purple" size="xs" />
                        )}
                        {isCustom && <GlassCapsule label="Custom" variant="purple" size="xs" />}
                        {m.isDefault && <GlassCapsule label="Default" variant="primary" size="xs" active />}
                      </View>

                      <Text style={[styles.modelDesc, mono("regular")]} numberOfLines={1}>
                        {m.id}
                      </Text>

                      {m.description && m.description !== m.id && (
                        <Text style={[styles.modelSummary, font("regular")]} numberOfLines={2}>
                          {m.description}
                        </Text>
                      )}

                      <View style={styles.modelCaps}>
                        {m.supportsImages && (
                          <GlassCapsule icon={Eye} label="Vision" variant="secondary" size="xs" />
                        )}
                        {m.reasoning && (
                          <GlassCapsule icon={Zap} label="Reasoning" variant="warning" size="xs" />
                        )}
                      </View>
                    </View>

                    <View style={styles.modelTrailing}>
                      {isSelected ? (
                        <View style={styles.activeCheckCircle}>
                          <Check size={14} color="#FFF" />
                        </View>
                      ) : (
                        <View style={styles.inactiveCircle} />
                      )}

                      {isCustom && (
                        <TouchableOpacity
                          onPress={() => handleDeleteCustomModel(m.id)}
                          style={styles.deleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={15} color={COLORS.destructive} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Surface>
          )}

          {/* Add Standalone Custom Model Button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddCustomModel((v) => !v)}
            activeOpacity={0.7}
          >
            {showAddCustomModel ? (
              <X size={15} color={COLORS.mutedForeground} />
            ) : (
              <Plus size={15} color={COLORS.primary} />
            )}
            <Text style={[styles.addBtnText, font("semibold")]}>
              {showAddCustomModel ? "Close Form" : "Add Single Custom Model"}
            </Text>
          </TouchableOpacity>

          {/* Standalone Custom Model Form */}
          {showAddCustomModel && (
            <Surface style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Bot size={16} color={COLORS.primary} />
                <Text style={[styles.formTitle, font("semibold")]}>Add Single Custom Model</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Model ID (Exact ID on gateway/endpoint) *</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="e.g. deepseek-ai/DeepSeek-R1, gpt-4o"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customId}
                  onChangeText={setCustomId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Display Name</Text>
                <TextInput
                  style={[styles.textInput, font("regular")]}
                  placeholder="e.g. DeepSeek R1"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customName}
                  onChangeText={setCustomName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Custom Endpoint URL (Optional)</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="http://127.0.0.1:11434/v1"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customEndpoint}
                  onChangeText={setCustomEndpoint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, supportsReasoning && styles.toggleBtnActive]}
                  onPress={() => setSupportsReasoning((v) => !v)}
                >
                  <Zap size={13} color={supportsReasoning ? "#F59E0B" : COLORS.mutedForeground} />
                  <Text style={[styles.toggleBtnText, font("medium")]}>Supports Reasoning</Text>
                  {supportsReasoning && <Check size={12} color="#F59E0B" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, supportsVision && styles.toggleBtnActive]}
                  onPress={() => setSupportsVision((v) => !v)}
                >
                  <Eye size={13} color={supportsVision ? COLORS.primary : COLORS.mutedForeground} />
                  <Text style={[styles.toggleBtnText, font("medium")]}>Supports Vision</Text>
                  {supportsVision && <Check size={12} color={COLORS.primary} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, isSavingCustom && { opacity: 0.6 }]}
                onPress={handleAddCustomModel}
                disabled={isSavingCustom}
                activeOpacity={0.75}
              >
                <Text style={[styles.saveBtnText, font("semibold")]}>
                  {isSavingCustom ? "Saving…" : "Save & Activate Model"}
                </Text>
              </TouchableOpacity>
            </Surface>
          )}
        </View>

        {/* ── 5. Reasoning Depth ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Thinking / Reasoning Depth</Text>
          </View>
          <Text style={[styles.sectionSubtitle, font("regular")]}>
            Controls thinking budget and reasoning effort across Antigravity, Frontier, and reasoning models.
          </Text>
          <View style={styles.chipRow}>
            {REASONING_EFFORTS.map((e) => (
              <GlassCapsule
                key={e}
                label={e}
                active={effort === e}
                variant={effort === e ? "primary" : "secondary"}
                onPress={() => setEffort(e)}
              />
            ))}
          </View>
        </View>

        {/* ── 6. Apply to Server ── */}
        <TouchableOpacity
          style={[styles.applyBtn, applying && { opacity: 0.6 }]}
          onPress={handleApplyToServer}
          disabled={applying}
          activeOpacity={0.75}
        >
          <Text style={[styles.applyBtnText, font("semibold")]}>
            {applying ? "Saving to Server Config…" : "Save to Server Config"}
          </Text>
          <Text style={[styles.applyBtnSub, font("regular")]}>
            Persists active model ({activeId}) & {effort} reasoning to /root/.codex/config.toml
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  sectionHeaderBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 13.5, color: COLORS.foreground },
  sectionSubtitle: { fontSize: 12, color: COLORS.mutedForeground, paddingHorizontal: 4 },
  refreshIconBtn: { padding: 4 },

  // Antigravity Card
  antigravityCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    backgroundColor: "rgba(56, 189, 248, 0.04)",
  },
  agHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  agIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  agTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  agSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  agStatusConnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  agStatusDisconnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(161, 161, 170, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(161, 161, 170, 0.2)",
  },
  grayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A1A1AA",
  },
  agStatusText: {
    fontSize: 11,
    color: "#10B981",
  },
  agStatusTextMuted: {
    fontSize: 11,
    color: "#A1A1AA",
  },
  agActionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  agAuthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  agAuthBtnText: {
    fontSize: 12,
    color: "#FFF",
  },
  agSyncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  agSyncBtnText: {
    fontSize: 12,
    color: "#38BDF8",
  },
  agToggleManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  agToggleManualText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  agDisconnectBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  agExpandableBox: {
    marginTop: 8,
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(56, 189, 248, 0.15)",
  },
  agSubmitBtn: {
    backgroundColor: "#0284C7",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  agSubmitBtnText: {
    fontSize: 12.5,
    color: "#FFF",
  },

  // Search & Filters
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
    paddingVertical: 0,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  tabBtnTextActive: {
    color: "#FFF",
  },

  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: "hidden" },

  // Provider List Row
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  providerInfo: { flex: 1, gap: 2 },
  providerName: { fontSize: 13.5, color: COLORS.foreground },
  providerUrl: { fontSize: 11, color: COLORS.mutedForeground },
  providerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  provToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  provToggleBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  provToggleText: { fontSize: 11, color: COLORS.foreground },

  smallAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.3)",
  },
  smallAddBtnText: { fontSize: 11.5, color: COLORS.primary },

  // Model list row
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  modelRowActive: {
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  modelInfo: { flex: 1, gap: 3 },
  modelNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  modelName: { fontSize: 14, color: COLORS.foreground },
  modelDesc: { fontSize: 11.5, color: COLORS.primary },
  modelSummary: { fontSize: 11.5, color: COLORS.mutedForeground, marginTop: 1 },
  modelCaps: { flexDirection: "row", gap: 6, marginTop: 4 },
  modelTrailing: { flexDirection: "row", alignItems: "center", gap: 10 },
  activeCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  deleteBtn: { padding: 4 },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtnText: { fontSize: 13, color: COLORS.primary },

  // Form Card
  formCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 11,
    color: COLORS.foreground,
  },
  presetChipTextActive: {
    color: "#FFF",
  },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 11.5, color: COLORS.mutedForeground },
  textInput: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.foreground,
  },
  testFetchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.3)",
    paddingVertical: 10,
    borderRadius: 8,
  },
  testFetchBtnText: { fontSize: 12.5, color: COLORS.primary },
  saveProviderBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveProviderBtnText: { fontSize: 12.5, color: "#FFF" },

  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnActive: {
    borderColor: COLORS.border,
  },
  toggleBtnText: {
    fontSize: 11.5,
    color: COLORS.foreground,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { fontSize: 13, color: "#FFF" },

  // Reasoning chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Apply button
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  applyBtnText: { fontSize: 14, color: "#FFF" },
  applyBtnSub: { fontSize: 11, color: "rgba(255, 255, 255, 0.8)" },
});
