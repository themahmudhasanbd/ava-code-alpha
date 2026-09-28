import React, { useMemo, useState } from "react";
import {
  Alert,
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
  Cpu,
  Eye,
  Globe,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageIntro, SkeletonRows, Surface, Badge, GlassCapsule } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { keys, useModels, useServerConfig, useWriteConfig } from "@/state/queries";
import { deleteCustomModel, saveCustomModel } from "@/core/custom-models";
import { REASONING_EFFORTS } from "@/config/models";
import type { ModelInfo } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

type CategoryTab = "all" | "omniroute" | "antigravity" | "frontier" | "custom";

const PRESET_TEMPLATES = [
  {
    label: "Google Antigravity",
    id: "antigravity/gemini-3.7-flash-high",
    name: "Gemini 3.7 Flash (High)",
    provider: "antigravity",
    endpoint: "https://daily-cloudcode-pa.googleapis.com",
    reasoning: true,
    vision: true,
  },
  {
    label: "Claude Antigravity",
    id: "antigravity/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (Thinking)",
    provider: "antigravity",
    endpoint: "https://daily-cloudcode-pa.googleapis.com",
    reasoning: true,
    vision: true,
  },
  {
    label: "Custom OpenAI / v1",
    id: "custom-gpt-4o",
    name: "Custom OpenAI Model",
    provider: "custom",
    endpoint: "https://api.openai.com/v1",
    reasoning: false,
    vision: true,
  },
  {
    label: "DeepSeek / Local",
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1 Local",
    provider: "custom",
    endpoint: "http://127.0.0.1:11434/v1",
    reasoning: true,
    vision: false,
  },
];

export function ModelsScreen() {
  const { modelId, setModelId, effort, setEffort } = useAva();
  const qc = useQueryClient();
  const { data: models = [], isLoading, error } = useModels();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();

  const activeId = modelId || models.find((m) => m.isDefault)?.id || models[0]?.id;

  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customProvider, setCustomProvider] = useState<"omniroute" | "antigravity" | "custom">("antigravity");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [supportsVision, setSupportsVision] = useState(true);
  const [supportsReasoning, setSupportsReasoning] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  // Filtered list
  const filteredModels = useMemo(() => {
    let list = models;

    // Filter by Tab
    if (activeTab === "omniroute") {
      list = list.filter((m) => m.provider === "omniroute" && (m.id.includes("combo") || m.id.startsWith("auto/")));
    } else if (activeTab === "antigravity") {
      list = list.filter((m) => m.provider === "antigravity" || m.id.startsWith("antigravity/"));
    } else if (activeTab === "frontier") {
      list = list.filter((m) => m.provider === "omniroute" && !m.id.includes("combo") && !m.id.startsWith("auto/"));
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
          (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [models, activeTab, searchQuery]);

  const handleSelect = (id: string) => {
    setModelId(id);
  };

  const handleApplyPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    setCustomId(preset.id);
    setCustomName(preset.name);
    setCustomProvider(preset.provider as any);
    setCustomEndpoint(preset.endpoint);
    setSupportsReasoning(preset.reasoning);
    setSupportsVision(preset.vision);
  };

  const handleApplyToServer = async () => {
    setApplying(true);
    try {
      const fields: Record<string, unknown> = {};
      if (activeId) fields.model = activeId;
      if (effort) fields.model_reasoning_effort = effort;

      const result = await writeConfig.mutateAsync(fields);
      if (result.success) {
        Alert.alert("Success", `Model "${activeId}" and ${effort} reasoning saved to server.`);
        qc.invalidateQueries({ queryKey: keys.serverConfig });
        qc.invalidateQueries({ queryKey: keys.models });
      } else {
        Alert.alert("Error", result.error || "Failed to update server config.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update server config.");
    } finally {
      setApplying(false);
    }
  };

  const handleAddCustomModel = async () => {
    const trimmed = customId.trim();
    if (!trimmed) {
      Alert.alert("Required", "Model ID is required.");
      return;
    }
    setIsSaving(true);
    try {
      await saveCustomModel({
        id: trimmed,
        name: customName.trim() || trimmed,
        provider: customProvider,
        endpoint: customEndpoint.trim() || undefined,
        supportsImages: supportsVision,
        reasoning: supportsReasoning,
      });
      qc.invalidateQueries({ queryKey: keys.models });
      setModelId(trimmed);
      setCustomId("");
      setCustomName("");
      setCustomEndpoint("");
      setShowAddForm(false);
      Alert.alert("Saved", `Custom model "${trimmed}" added and activated.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save custom model.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomModel = async (id: string) => {
    Alert.alert("Delete Custom Model", `Remove "${id}" from your models catalog?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomModel(id);
          qc.invalidateQueries({ queryKey: keys.models });
          if (activeId === id) setModelId("");
        },
      },
    ]);
  };

  return (
    <AppShell title="AI Models & Engines">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageIntro
          title="Model Architecture"
          description="Select and customize LLM engines, Google Antigravity reasoning models, and thinking budgets."
        />

        {/* ── 1. Search & Category Filters ── */}
        <View style={styles.searchBar}>
          <Search size={14} color={COLORS.mutedForeground} />
          <TextInput
            style={[styles.searchInput, font("regular")]}
            placeholder="Search models by name or ID…"
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
            style={[styles.tabBtn, activeTab === "omniroute" && styles.tabBtnActive]}
            onPress={() => setActiveTab("omniroute")}
          >
            <Text style={[styles.tabBtnText, activeTab === "omniroute" && styles.tabBtnTextActive, font("medium")]}>
              Omni Combos
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
            style={[styles.tabBtn, activeTab === "frontier" && styles.tabBtnActive]}
            onPress={() => setActiveTab("frontier")}
          >
            <Text style={[styles.tabBtnText, activeTab === "frontier" && styles.tabBtnTextActive, font("medium")]}>
              Frontier
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

        {/* ── 2. Models Catalog ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bot size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>
              Available Models ({filteredModels.length})
            </Text>
          </View>

          {isLoading && <SkeletonRows count={4} />}
          {error && <EmptyState icon={Bot} title="Could not load models" description={(error as Error).message} />}
          {!isLoading && filteredModels.length === 0 && (
            <EmptyState
              icon={Bot}
              title="No models match filter"
              description="Try adjusting your search query or category filter."
            />
          )}

          {filteredModels.length > 0 && (
            <Surface style={styles.card}>
              {filteredModels.map((m) => {
                const isSelected = activeId === m.id;
                const isCustom = m.provider === "custom";
                const isAntigravity = m.provider === "antigravity" || m.id.startsWith("antigravity/");

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

          {/* Add Custom Model Button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddForm((v) => !v)}
            activeOpacity={0.7}
          >
            {showAddForm ? <X size={15} color={COLORS.mutedForeground} /> : <Plus size={15} color={COLORS.primary} />}
            <Text style={[styles.addBtnText, font("semibold")]}>
              {showAddForm ? "Close Form" : "Add Custom Model or Antigravity Engine"}
            </Text>
          </TouchableOpacity>

          {/* ── 3. Add Custom / Antigravity Model Form ── */}
          {showAddForm && (
            <Surface style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Sparkles size={16} color={COLORS.primary} />
                <Text style={[styles.formTitle, font("semibold")]}>Add Model / Engine</Text>
              </View>

              {/* Quick Preset Badges */}
              <Text style={[styles.inputLabel, font("medium")]}>Quick Templates:</Text>
              <View style={styles.presetsRow}>
                {PRESET_TEMPLATES.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    style={styles.presetChip}
                    onPress={() => handleApplyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetChipText, font("regular")]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Model ID (Exact ID on gateway/provider) *</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="e.g. antigravity/gemini-3.7-flash-high, gpt-4o"
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
                  placeholder="e.g. Gemini 3.7 Flash High"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customName}
                  onChangeText={setCustomName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Provider Type</Text>
                <View style={styles.providerTypeRow}>
                  {(["antigravity", "omniroute", "custom"] as const).map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[
                        styles.providerTypeBtn,
                        customProvider === prov && styles.providerTypeBtnActive,
                      ]}
                      onPress={() => setCustomProvider(prov)}
                    >
                      <Text
                        style={[
                          styles.providerTypeText,
                          customProvider === prov && styles.providerTypeTextActive,
                          font("medium"),
                        ]}
                      >
                        {prov === "antigravity" ? "Antigravity" : prov === "omniroute" ? "OmniRoute" : "Custom"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>API Base URL / Endpoint (Optional)</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="https://daily-cloudcode-pa.googleapis.com"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customEndpoint}
                  onChangeText={setCustomEndpoint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Toggles */}
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
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleAddCustomModel}
                disabled={isSaving}
                activeOpacity={0.75}
              >
                <Text style={[styles.saveBtnText, font("semibold")]}>
                  {isSaving ? "Saving…" : "Save & Activate Model"}
                </Text>
              </TouchableOpacity>
            </Surface>
          )}
        </View>

        {/* ── 4. Reasoning Depth ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Thinking / Reasoning Depth</Text>
          </View>
          <Text style={[styles.sectionSubtitle, font("regular")]}>
            Controls how deeply the agent reasons and plans before executing tool calls.
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

        {/* ── 5. Apply to Server ── */}
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
  sectionTitle: { fontSize: 13.5, color: COLORS.foreground },
  sectionSubtitle: { fontSize: 12, color: COLORS.mutedForeground, paddingHorizontal: 4 },

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

  // Form
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
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipText: {
    fontSize: 11,
    color: COLORS.foreground,
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
  providerTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  providerTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 64, 225, 0.1)",
  },
  providerTypeText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  providerTypeTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
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
