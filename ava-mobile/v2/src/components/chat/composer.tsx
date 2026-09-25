import React, { forwardRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Eraser,
  FolderOpen,
  Plug,
  Plus,
  Settings2,
  ShieldCheck,
  Square,
  SquarePen,
  Terminal as TerminalSquare,
  type LucideIcon,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Sheet, SheetHeader } from "@/components/ui/sheet";
import { Surface } from "@/components/kit";
import { REASONING_EFFORTS, SANDBOX_MODES } from "@/config/models";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";
import type { ChatStatus } from "@/state/use-chat";
import { COLORS } from "@/theme/colors";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  status: ChatStatus;
}

type Panel = "actions" | "model" | "sandbox" | null;

function OptionRow({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, active && styles.optionRowActive]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onClick();
      }}
      activeOpacity={0.7}
    >
      {Icon && (
        <View style={styles.optionIconBox}>
          <Icon size={16} color={active ? COLORS.primary : COLORS.mutedForeground} />
        </View>
      )}
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, active && styles.optionTitleActive]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.optionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {active && <Check size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

export const Composer = forwardRef<TextInput, Props>(
  ({ value, onChange, onSubmit, onStop, onClear, status }, ref) => {
    const busy = status === "submitted" || status === "streaming";
    const navigation = useNavigation<any>();
    const {
      modelId,
      setModelId,
      effort,
      setEffort,
      sandbox,
      setSandbox,
      setActiveSessionId,
    } = useAva();
    const { data: models = [] } = useModels();
    const [panel, setPanel] = useState<Panel>(null);

    const model =
      models.find((m) => m.id === modelId) ?? models.find((m) => m.isDefault);
    const sandboxOpt =
      SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[2];

    const close = () => setPanel(null);

    const handleSend = () => {
      if (busy && !value.trim()) return onStop();
      if (value.trim()) onSubmit(value);
    };

    return (
      <View style={styles.container}>
        {/* Floating Model & Reasoning Badge */}
        <TouchableOpacity
          style={styles.floatingPill}
          onPress={() => setPanel("model")}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingPillText} numberOfLines={1}>
            {model?.name ?? "Model"} · {effort}
          </Text>
          <ChevronDown size={12} color={COLORS.mutedForeground} />
        </TouchableOpacity>

        {/* Input Surface */}
        <Surface style={styles.composerCard}>
          <TextInput
            ref={ref}
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Message AvA (e.g. check status, run tasks, edit code)…"
            placeholderTextColor={COLORS.mutedForeground}
            multiline
            maxLength={4000}
          />

          <View style={styles.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsRow}
            >
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setPanel("actions")}
              >
                <Plus size={16} color={COLORS.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("actions")}
              >
                <Settings2 size={13} color={COLORS.foreground} />
                <Text style={styles.toolPillText}>Tools</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("sandbox")}
              >
                <ShieldCheck size={13} color={COLORS.foreground} />
                <Text style={styles.toolPillText}>{sandboxOpt.label}</Text>
                <ChevronDown size={11} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.submitBtnWrapper}>
              {busy && !value.trim() ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={onStop}
                >
                  <Square size={14} color="#FFF" fill="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !value.trim() && !busy && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!value.trim() && !busy}
                >
                  <ArrowUp size={16} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Surface>

        {/* Action / Tools Bottom Sheet */}
        <Sheet open={panel === "actions"} onOpenChange={(o) => !o && close()}>
          <SheetHeader title="Prompt actions & tools" onClose={close} />
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <OptionRow
              icon={SquarePen}
              title="New session"
              subtitle="Start a fresh conversation"
              onClick={() => {
                setActiveSessionId(null);
                close();
              }}
            />
            <OptionRow
              icon={FolderOpen}
              title="Workspace files"
              subtitle="Browse project files"
              onClick={() => {
                close();
                navigation.navigate("Files");
              }}
            />
            <OptionRow
              icon={TerminalSquare}
              title="Terminal"
              subtitle="Run shell commands"
              onClick={() => {
                close();
                navigation.navigate("Terminal");
              }}
            />
            <OptionRow
              icon={Plug}
              title="MCP tools"
              subtitle="Servers, tools and status"
              onClick={() => {
                close();
                navigation.navigate("Mcp");
              }}
            />
            <OptionRow
              icon={Eraser}
              title="Clear chat view"
              subtitle="Hide messages on this screen"
              onClick={() => {
                onClear();
                close();
              }}
            />
          </ScrollView>
        </Sheet>

        {/* Model & Reasoning Bottom Sheet */}
        <Sheet open={panel === "model"} onOpenChange={(o) => !o && close()}>
          <SheetHeader title="Model & reasoning" onClose={close} />
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>THINKING DEPTH</Text>
            <View style={styles.effortRow}>
              {REASONING_EFFORTS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.effortBtn,
                    effort === e && styles.effortBtnActive,
                  ]}
                  onPress={() => setEffort(e)}
                >
                  <Text
                    style={[
                      styles.effortBtnText,
                      effort === e && styles.effortBtnTextActive,
                    ]}
                  >
                    {e}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionHeader}>
              MODELS ({models.length})
            </Text>
            {models.map((m) => (
              <OptionRow
                key={m.id}
                icon={Bot}
                title={m.name + (m.isDefault ? " (server default)" : "")}
                subtitle={m.description ?? m.id}
                active={model?.id === m.id}
                onClick={() => {
                  setModelId(m.id);
                  close();
                }}
              />
            ))}
          </ScrollView>
        </Sheet>

        {/* Sandbox Permission Bottom Sheet */}
        <Sheet open={panel === "sandbox"} onOpenChange={(o) => !o && close()}>
          <SheetHeader title="Sandbox permission" onClose={close} />
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {SANDBOX_MODES.map((s) => (
              <OptionRow
                key={s.id}
                icon={ShieldCheck}
                title={s.label}
                subtitle={s.description}
                active={sandbox === s.id}
                onClick={() => {
                  setSandbox(s.id);
                  close();
                }}
              />
            ))}
          </ScrollView>
        </Sheet>
      </View>
    );
  }
);

Composer.displayName = "Composer";

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  floatingPill: {
    position: "absolute",
    top: -10,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  floatingPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    maxWidth: 160,
  },
  composerCard: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  input: {
    minHeight: 46,
    maxHeight: 120,
    fontSize: 14,
    color: COLORS.foreground,
    paddingTop: 0,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 4,
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  toolPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  submitBtnWrapper: {
    marginLeft: "auto",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  optionRowActive: {
    backgroundColor: COLORS.secondary,
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  optionTitleActive: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  effortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  effortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  effortBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  effortBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.foreground,
    textTransform: "capitalize",
  },
  effortBtnTextActive: {
    color: COLORS.primaryForeground,
    fontWeight: "600",
  },
});
