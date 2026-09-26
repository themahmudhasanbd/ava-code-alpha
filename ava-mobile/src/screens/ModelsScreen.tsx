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
import { Bot, Check, Globe, Plus, Trash2, X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ListRow, PageIntro, SkeletonRows, Surface, Badge } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { keys, useModels } from "@/state/queries";
import { deleteCustomModel, saveCustomModel } from "@/core/custom-models";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

export function ModelsScreen() {
  const { modelId, setModelId } = useAva();
  const qc = useQueryClient();
  const { data: models = [], isLoading, error } = useModels();
  const activeId = modelId || models.find((m) => m.isDefault)?.id;

  const [showAddForm, setShowAddForm] = useState(false);
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (id: string) => {
    setModelId(id);
  };

  const handleAddCustomModel = async () => {
    const trimmedId = customId.trim();
    if (!trimmedId) {
      Alert.alert("Required", "Please enter a model identifier (e.g. gpt-4o, deepseek-chat, or my-custom-model)");
      return;
    }

    setIsSaving(true);
    try {
      await saveCustomModel({
        id: trimmedId,
        name: customName.trim() || trimmedId,
        endpoint: customEndpoint.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: keys.models });
      setModelId(trimmedId);
      setCustomId("");
      setCustomName("");
      setCustomEndpoint("");
      setShowAddForm(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save custom model");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomModel = (id: string) => {
    Alert.alert("Remove Model", `Remove "${id}" from custom models?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteCustomModel(id);
          await qc.invalidateQueries({ queryKey: keys.models });
          if (activeId === id) {
            const fallback = models.find((m) => m.id !== id)?.id || "";
            setModelId(fallback);
          }
        },
      },
    ]);
  };

  return (
    <AppShell title="Models">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Models"
          description="Choose which model AvA uses for new messages or configure custom endpoints."
        />

        {/* ── Add Custom Model Trigger / Form ── */}
        <Surface style={styles.customModelSection}>
          <View style={styles.customHeaderRow}>
            <View style={styles.customHeaderLeft}>
              <Globe size={18} color={COLORS.primary} />
              <View>
                <Text style={[styles.customTitle, font("semibold")]}>Custom Model & Endpoint</Text>
                <Text style={[styles.customSubtitle, font("regular")]}>
                  Any OpenAI-compatible or local model ID
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddForm((v) => !v)}
              style={styles.toggleAddBtn}
              activeOpacity={0.7}
            >
              {showAddForm ? (
                <X size={16} color={COLORS.mutedForeground} />
              ) : (
                <View style={styles.toggleAddContent}>
                  <Plus size={14} color={COLORS.primary} />
                  <Text style={[styles.toggleAddText, font("medium")]}>Add</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {showAddForm && (
            <View style={styles.formWrap}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Model ID / Identifier *</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="e.g. gpt-4o, deepseek-chat, mistral-large"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customId}
                  onChangeText={setCustomId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Display Name (Optional)</Text>
                <TextInput
                  style={[styles.textInput, font("regular")]}
                  placeholder="e.g. My Custom Coding Model"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customName}
                  onChangeText={setCustomName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, font("medium")]}>Custom API Endpoint (Optional)</Text>
                <TextInput
                  style={[styles.textInput, mono("regular")]}
                  placeholder="e.g. https://api.openai.com/v1"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={customEndpoint}
                  onChangeText={setCustomEndpoint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, font("medium")]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddCustomModel}
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  disabled={isSaving}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.saveBtnText, font("semibold")]}>
                    {isSaving ? "Saving..." : "Save & Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Surface>

        {isLoading && <SkeletonRows count={6} />}

        {error && (
          <EmptyState
            icon={Bot}
            title="Could not load models"
            description={(error as Error).message}
          />
        )}

        {!isLoading && models.length === 0 && (
          <EmptyState icon={Bot} title="No models found" />
        )}

        {models.length > 0 && (
          <Surface style={styles.card}>
            {models.map((m) => {
              const isSelected = activeId === m.id;
              const isCustom = m.provider === "custom";

              return (
                <ListRow
                  key={m.id}
                  icon={Bot}
                  title={m.name}
                  subtitle={m.description ?? m.id}
                  onClick={() => handleSelect(m.id)}
                  trailing={
                    <View style={styles.trailingRow}>
                      {isCustom ? (
                        <Badge variant="outline">Custom</Badge>
                      ) : m.isDefault ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : null}
                      {isSelected ? (
                        <Check size={16} color={COLORS.primary} />
                      ) : null}
                      {isCustom ? (
                        <TouchableOpacity
                          onPress={() => handleDeleteCustomModel(m.id)}
                          style={styles.deleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={15} color={COLORS.destructive} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  }
                />
              );
            })}
          </Surface>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  customModelSection: {
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  customHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  customTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  customSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  toggleAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  toggleAddContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleAddText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  formWrap: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  textInput: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: COLORS.foreground,
  },
  formActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12.5,
    color: COLORS.primaryForeground,
  },
  card: {
    padding: 6,
    borderRadius: 18,
    gap: 2,
  },
  trailingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
