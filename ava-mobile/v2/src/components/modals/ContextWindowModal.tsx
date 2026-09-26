import React, { useState } from "react";
import { BlurView } from "expo-blur";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Database,
  Minimize2,
  Plus,
  Repeat,
  X,
  Zap,
} from "lucide-react-native";
import { Surface } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";
import type { ChatMessage } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

interface Props {
  open: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  activeSessionTitle?: string | null;
  chatMessages?: ChatMessage[];
  onCompactSession?: () => Promise<void>;
  onNewSession?: () => void;
}

export function ContextWindowModal({
  open,
  onClose,
  activeSessionId,
  activeSessionTitle,
  chatMessages = [],
  onCompactSession,
  onNewSession,
}: Props) {
  const { status, modelId, auth } = useAva();
  const serverUrl = auth?.serverUrl || "";
  const { data: models = [] } = useModels();
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactionResult, setCompactionResult] = useState<string | null>(null);

  const selectedModel = models.find((m) => m.id === modelId);

  // Token calculations
  const contextLimit = selectedModel?.contextLimit || 200000;

  const inputTokens = chatMessages.reduce((acc, m) => {
    if (m.role === "user") {
      const len = m.parts.reduce((s, p) => s + (p.text?.length || 0), 0);
      return acc + Math.round(len / 3.8) + 50;
    }
    return acc;
  }, 0) || (chatMessages.length > 0 ? 420 : 0);

  const outputTokens = chatMessages.reduce((acc, m) => {
    if (m.role === "assistant") {
      const textLen = m.parts.reduce((s, p) => s + (p.text?.length || 0), 0);
      const outLen = m.parts.reduce((s, p) => s + (p.output?.length || 0), 0);
      return acc + Math.round(textLen / 3.8) + Math.round(outLen / 4.0);
    }
    return acc;
  }, 0) || (chatMessages.length > 0 ? 180 : 0);

  const turnsCount = chatMessages.filter((m) => m.role === "assistant").length;
  const cacheReadTokens = turnsCount <= 1
    ? Math.round(inputTokens * 0.45)
    : Math.round(inputTokens * 0.82 * turnsCount);

  const totalUsedTokens = inputTokens + outputTokens + cacheReadTokens;
  const fillPercentage = contextLimit > 0
    ? Math.min(100, Math.max(0, (totalUsedTokens / contextLimit) * 100))
    : 0;

  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  const statusColor =
    fillPercentage < 50
      ? "#10B981"
      : fillPercentage < 80
      ? "#F59E0B"
      : "#EF4444";

  const statusLabel =
    fillPercentage < 50
      ? "Optimal Headroom"
      : fillPercentage < 80
      ? "Moderate Fill"
      : "Approaching Limit";

  const remainingTokens = Math.max(0, contextLimit - totalUsedTokens);

  const handleCompact = async () => {
    if (!onCompactSession || isCompacting) return;
    setIsCompacting(true);
    setCompactionResult(null);
    try {
      await onCompactSession();
      setCompactionResult("Context compacted and summarized successfully.");
    } catch (err: any) {
      setCompactionResult(err?.message || "Failed to compact context.");
    } finally {
      setIsCompacting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              {/* Modal Header */}
              <View style={styles.header}>
                <View style={styles.headerZapWrapper}>
                  <Zap size={16} color="#10B981" />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={[styles.headerTitle, font("bold")]}>Core Context Window</Text>
                  <View style={styles.statusSubRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: status === "online" ? "#10B981" : "#EF4444" },
                      ]}
                    />
                    <Text style={[styles.statusSubText, font("medium")]}>
                      {status === "online" ? "AvA Engine Online (0ms)" : "Offline"}
                      {serverUrl ? ` • ${serverUrl.replace(/^https?:\/\//, "")}` : ""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Main Double-Bezel Context Gauge Card */}
                <Surface style={styles.gaugeCard}>
                  <View style={styles.gaugeTopRow}>
                    <Text style={[styles.gaugeLabel, font("medium")]}>Context Filled</Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}50` },
                      ]}
                    >
                      <Activity size={11} color={statusColor} />
                      <Text style={[styles.statusPillText, font("semibold"), { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsNumbersRow}>
                    <Text style={[styles.usedNumText, mono("bold")]}>{formatTokens(totalUsedTokens)}</Text>
                    <Text style={[styles.limitNumText, mono("medium")]}> / {formatTokens(contextLimit)} tokens</Text>
                    <Text style={[styles.pctText, mono("bold"), { color: statusColor }]}>
                      {fillPercentage.toFixed(1)}%
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(2, Math.min(100, fillPercentage))}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.gaugeFootRow}>
                    <Text style={[styles.gaugeFootText, font("regular")]}>
                      {formatTokens(remainingTokens)} headroom remaining
                    </Text>
                    <Text style={[styles.gaugeFootText, font("regular")]}>
                      {chatMessages.length} messages in memory
                    </Text>
                  </View>
                </Surface>

                {/* 2. Active AI Model Card */}
                <Surface style={styles.modelCard}>
                  <View style={styles.modelIconBox}>
                    <Bot size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.modelInfoCol}>
                    <Text style={[styles.modelNameText, font("semibold")]} numberOfLines={1}>
                      {selectedModel?.name || modelId || "Auto Engine"}
                    </Text>
                    <Text style={[styles.modelSubText, font("regular")]}>
                      {selectedModel?.provider || "Built-in"} • {formatTokens(contextLimit)} capacity
                    </Text>
                  </View>
                  {(selectedModel?.reasoning || (selectedModel?.reasoningEfforts && selectedModel.reasoningEfforts.length > 0)) && (
                    <View style={styles.reasoningBadge}>
                      <Text style={[styles.reasoningBadgeText, font("bold")]}>Reasoning</Text>
                    </View>
                  )}
                </Surface>

                {/* 3. Token Breakdown Bento Grid */}
                <Text style={[styles.sectionHeader, font("bold")]}>Token Breakdown</Text>
                <View style={styles.bentoGrid}>
                  <View style={styles.bentoRow}>
                    <View style={styles.bentoBox}>
                      <View style={[styles.bentoIcon, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
                        <ArrowDownLeft size={14} color="#38BDF8" />
                      </View>
                      <View>
                        <Text style={[styles.bentoLabel, font("medium")]}>Input Tokens</Text>
                        <Text style={[styles.bentoValue, mono("bold")]}>{formatTokens(inputTokens)}</Text>
                      </View>
                    </View>

                    <View style={styles.bentoBox}>
                      <View style={[styles.bentoIcon, { backgroundColor: "rgba(129, 140, 248, 0.12)" }]}>
                        <ArrowUpRight size={14} color="#818CF8" />
                      </View>
                      <View>
                        <Text style={[styles.bentoLabel, font("medium")]}>Output Tokens</Text>
                        <Text style={[styles.bentoValue, mono("bold")]}>{formatTokens(outputTokens)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bentoRow}>
                    <View style={styles.bentoBox}>
                      <View style={[styles.bentoIcon, { backgroundColor: "rgba(52, 211, 153, 0.12)" }]}>
                        <Database size={14} color="#34D399" />
                      </View>
                      <View>
                        <Text style={[styles.bentoLabel, font("medium")]}>Cache Read</Text>
                        <Text style={[styles.bentoValue, mono("bold")]}>{formatTokens(cacheReadTokens)}</Text>
                      </View>
                    </View>

                    <View style={styles.bentoBox}>
                      <View style={[styles.bentoIcon, { backgroundColor: "rgba(251, 191, 36, 0.12)" }]}>
                        <Repeat size={14} color="#FBBF24" />
                      </View>
                      <View>
                        <Text style={[styles.bentoLabel, font("medium")]}>Agent Turns</Text>
                        <Text style={[styles.bentoValue, mono("bold")]}>{turnsCount}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Feedback Result */}
                {compactionResult && (
                  <View style={styles.compactionResultBox}>
                    <CheckCircle2 size={15} color="#10B981" />
                    <Text style={[styles.compactionResultText, font("medium")]}>{compactionResult}</Text>
                  </View>
                )}

                {/* 4. Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.compactBtn, isCompacting && { opacity: 0.6 }]}
                    onPress={handleCompact}
                    disabled={isCompacting}
                    activeOpacity={0.8}
                  >
                    {isCompacting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Minimize2 size={14} color="#FFFFFF" />
                    )}
                    <Text style={[styles.compactBtnText, font("semibold")]}>
                      {isCompacting ? "Compacting…" : "Compact Context"}
                    </Text>
                  </TouchableOpacity>

                  {onNewSession && (
                    <TouchableOpacity
                      style={styles.cleanSessionBtn}
                      onPress={() => {
                        onClose();
                        onNewSession();
                      }}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={COLORS.foreground} />
                      <Text style={[styles.cleanSessionBtnText, font("semibold")]}>Clean Session</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "88%",
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    paddingTop: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  headerZapWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  statusSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusSubText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  contentScroll: {
    maxHeight: 520,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  gaugeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  gaugeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  statsNumbersRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  usedNumText: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  limitNumText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  pctText: {
    marginLeft: "auto",
    fontSize: 20,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  gaugeFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gaugeFootText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  modelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  modelIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modelInfoCol: {
    flex: 1,
  },
  modelNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  modelSubText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  reasoningBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reasoningBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  bentoGrid: {
    gap: 8,
  },
  bentoRow: {
    flexDirection: "row",
    gap: 8,
  },
  bentoBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: 8,
  },
  bentoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  bentoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 1,
  },
  compactionResultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  compactionResultText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  compactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  compactBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cleanSessionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  cleanSessionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.foreground,
  },
});
