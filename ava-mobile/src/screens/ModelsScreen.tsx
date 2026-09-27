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
import {
  Bot,
  Check,
  Globe,
  Image,
  Layers,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ListRow, PageIntro, SkeletonRows, Surface, Badge, GlassCapsule } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { keys, useModels, useServerConfig, useWriteConfig } from "@/state/queries";
import { deleteCustomModel, saveCustomModel } from "@/core/custom-models";
import { REASONING_EFFORTS } from "@/config/models";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

export function ModelsScreen() {
  const { modelId, setModelId, effort, setEffort } = useAva();
  const qc = useQueryClient();
  const { data: models = [], isLoading, error } = useModels();
  const config = useServerConfig();
  const writeConfig = useWriteConfig();
  const activeId = modelId || models.find((m) => m.isDefault)?.id;

  const [showAddForm, setShowAddForm] = useState(false);
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleSelect = (id: string) => {
    setModelId(id);
  };

  const handleApplyToServer = async () => {
    setApplying(true);
    try {
      const fields: Record<string, unknown> = {};
      if (activeId) fields.model = activeId;
      if (effort) fields.model_reasoning_effort = effort;

      const result = await writeConfig.mutateAsync(fields);
      if (result.success) {
        Alert.alert("Applied", "Model and reasoning saved to server.");
        qc.invalidateQueries({ queryKey: keys.serverConfig });
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
    if (!customId.trim()) {
      Alert.alert("Required", "Model ID is required.");
      return;
    }
    setIsSaving(true);
    try {
      await saveCustomModel({
        id: customId.trim(),
        name: customName.trim() || customId.trim(),
        endpoint: customEndpoint.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: keys.models });
      setModelId(customId.trim());
      setCustomId("");
      setCustomName("");
      setCustomEndpoint("");
      setShowAddForm(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save custom model.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomModel = async (id: string) => {
    Alert.alert("Delete Model", `Remove "${id}" from your models?`, [
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
    <AppShell title="AI Models">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageIntro
          title="Model Configuration"
          description="Choose the active model and reasoning effort for your sessions."
        />

        {/* ── 1. Model Selection ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bot size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Active Model</Text>
          </View>

          {isLoading && <SkeletonRows count={4} />}
          {error && <EmptyState icon={Bot} title="Could not load models" description={(error as Error).message} />}
          {!isLoading && models.length === 0 && <EmptyState icon={Bot} title="No models found" />}

          {models.length > 0 && (
            <Surface style={styles.card}>
              {models.map((m) => {
                const isSelected = activeId === m.id;
                const isCustom = m.provider === "custom";
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
                        {isCustom && <GlassCapsule label="Custom" variant="purple" size="xs" />}
                        {m.isDefault && <GlassCapsule label="Default" variant="primary" size="xs" active />}
                      </View>
                      <Text style={[styles.modelDesc, mono("regular")]} numberOfLines={1}>
                        {m.description || m.id}
                      </Text>
                      <View style={styles.modelCaps}>
                        {m.supportsImages && (
                          <GlassCapsule icon={Image} label="Vision" variant="cyan" size="xs" />
                        )}
                        {m.reasoning && (
                          <GlassCapsule icon={Zap} label="Reasoning" variant="warning" size="xs" />
                        )}
                      </View>
                    </View>
                    <View style={styles.modelTrailing}>
                      {isSelected && <Check size={16} color={COLORS.primary} />}
                      {isCustom && (
                        <TouchableOpacity onPress={() => handleDeleteCustomModel(m.id)} style={styles.deleteBtn}>
                          <Trash2 size={14} color={COLORS.destructive} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Surface>
          )}

          {/* Add Custom Model */}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm((v) => !v)} activeOpacity={0.7}>
            {showAddForm ? <X size={14} color={COLORS.mutedForeground} /> : <Plus size={14} color={COLORS.primary} />}
            <Text style={[styles.addBtnText, font("medium")]}>{showAddForm ? "Cancel" : "Add Custom Model"}</Text>
          </TouchableOpacity>

          {showAddForm && (
            <Surface style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Model ID *</Text>
                <TextInput style={[styles.textInput, mono("regular")]} placeholder="gpt-4o, deepseek-chat..." placeholderTextColor={COLORS.mutedForeground} value={customId} onChangeText={setCustomId} autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Display Name</Text>
                <TextInput style={[styles.textInput, font("regular")]} placeholder="My Custom Model" placeholderTextColor={COLORS.mutedForeground} value={customName} onChangeText={setCustomName} autoCorrect={false} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>API Endpoint</Text>
                <TextInput style={[styles.textInput, mono("regular")]} placeholder="https://api.openai.com/v1" placeholderTextColor={COLORS.mutedForeground} value={customEndpoint} onChangeText={setCustomEndpoint} autoCapitalize="none" autoCorrect={false} />
              </View>
              <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.6 }]} onPress={handleAddCustomModel} disabled={isSaving} activeOpacity={0.75}>
                <Text style={[styles.saveBtnText, font("semibold")]}>{isSaving ? "Saving..." : "Save & Select"}</Text>
              </TouchableOpacity>
            </Surface>
          )}
        </View>

        {/* ── 2. Reasoning Effort ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={15} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, font("semibold")]}>Reasoning Depth</Text>
          </View>
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

        {/* ── 3. Apply to Server ── */}
        <TouchableOpacity
          style={[styles.applyBtn, applying && { opacity: 0.6 }]}
          onPress={handleApplyToServer}
          disabled={applying}
          activeOpacity={0.75}
        >
          <Text style={[styles.applyBtnText, font("semibold")]}>
            {applying ? "Applying..." : "Apply to Server"}
          </Text>
          <Text style={[styles.applyBtnSub, font("regular")]}>
            Saves model and reasoning depth to server config
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
  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: "hidden" },

  // Model list
  modelRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  modelRowActive: { backgroundColor: "rgba(66,64,225,0.06)" },
  modelInfo: { flex: 1, gap: 3 },
  modelNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  modelName: { fontSize: 13.5, color: COLORS.foreground },
  modelDesc: { fontSize: 11.5, color: COLORS.mutedForeground },
  modelCaps: { flexDirection: "row", gap: 6, marginTop: 4 },
  modelTrailing: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteBtn: { padding: 4 },

  // Add form
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.border },
  addBtnText: { fontSize: 12.5, color: COLORS.primary },
  formCard: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.glassBorder },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 11.5, color: COLORS.mutedForeground },
  textInput: { backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: COLORS.foreground },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 12.5, color: COLORS.primaryForeground },

  // Reasoning chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Apply
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  applyBtnText: { fontSize: 14, color: COLORS.primaryForeground },
  applyBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
});
