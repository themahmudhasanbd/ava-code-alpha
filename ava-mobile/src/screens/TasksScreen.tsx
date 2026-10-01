import React, { useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  GlassIconButton,
  PageIntro,
  SkeletonRows,
  Surface,
  Button,
  Label,
  Input,
} from "@/components/kit";
import { Switch } from "@/components/ui/switch";
import { OptionPicker } from "@/components/ui/OptionPicker";
import {
  DEFAULT_SANDBOX,
  DEFAULT_WORKSPACE,
  SCHEDULE_PRESETS,
  formatNextRun,
  formatRunAt,
  type ScheduledTask,
  type TaskDraft,
} from "@/core/api/schedule";
import { SANDBOX_MODES } from "@/config/models";
import {
  useDeleteTask,
  useModels,
  useRunTask,
  useSaveTask,
  useTasks,
} from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { mono } from "@/theme/fonts";

type Draft = TaskDraft;
const EMPTY_DRAFT: Draft = {
  name: "",
  schedule: SCHEDULE_PRESETS[1]?.value ?? "0 * * * *",
  prompt: "",
  workspace: "",
  model: "",
  sandbox: DEFAULT_SANDBOX,
  enabled: true,
};

const toDraft = (t: ScheduledTask): Draft => ({
  id: t.id,
  name: t.name,
  schedule: t.schedule,
  prompt: t.prompt,
  workspace: t.workspace,
  model: t.model,
  sandbox: t.sandbox,
  enabled: t.enabled,
});

/**
 * Lovable-style status pill: small icon + label in a soft tinted pill.
 * Run lifecycle states are always icon + label + tint (never color alone).
 */
function StatusPill({
  icon: Icon,
  label,
  tint,
  color,
  monoText = false,
}: {
  icon: typeof Clock;
  label: string;
  tint: string;
  color: string;
  monoText?: boolean;
}) {
  return (
    <View style={[styles.statusPill, { backgroundColor: tint }]}>
      <Icon size={11} color={color} strokeWidth={2.5} />
      <Text
        style={[styles.statusPillText, { color }, monoText && mono("regular")]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export function TasksScreen({ navigation }: { navigation: any }) {
  const { data: tasks = [], isLoading, error } = useTasks();
  const { data: models = [] } = useModels();
  const saveTask = useSaveTask();
  const deleteTask = useDeleteTask();
  const runTask = useRunTask();

  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [statusTask, setStatusTask] = useState<ScheduledTask | null>(null);
  const scheduleInputRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!editingDraft || !editingDraft.name.trim()) return;
    if (!editingDraft.prompt.trim()) {
      Alert.alert(
        "Instructions required",
        "Tell the agent what to do on each run."
      );
      return;
    }
    try {
      await saveTask.mutateAsync(editingDraft);
      setEditingDraft(null);
    } catch (err: any) {
      Alert.alert("Save Failed", err?.message || "Could not save the task.");
    }
  };

  const handleDelete = (t: ScheduledTask) => {
    Alert.alert("Delete task?", `"${t.name}" will stop running.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask.mutateAsync(t.id);
          } catch (err: any) {
            Alert.alert("Delete Failed", err?.message || "Could not delete the task.");
          }
        },
      },
    ]);
  };

  const handleRun = async (t: ScheduledTask) => {
    try {
      const { threadId } = await runTask.mutateAsync(t.id);
      navigation.navigate("Session", { sessionId: threadId });
    } catch (err: any) {
      Alert.alert("Run Failed", err?.message || "Could not start the task.");
    }
  };

  const sandboxLabel = (id: string) =>
    SANDBOX_MODES.find((s) => s.id === id)?.label ?? id;

  const runStatusPill = (t: ScheduledTask) => {
    if (!t.enabled) {
      return (
        <StatusPill
          icon={Pause}
          label="Paused"
          tint={COLORS.secondary}
          color={COLORS.mutedForeground}
        />
      );
    }
    if (t.lastStatus === "succeeded") {
      return (
        <StatusPill
          icon={CheckCircle2}
          label="Last run ok"
          tint={COLORS.success + "1F"}
          color={COLORS.success}
        />
      );
    }
    if (t.lastStatus === "failed") {
      return (
        <StatusPill
          icon={XCircle}
          label="Last run failed"
          tint={COLORS.destructive + "1F"}
          color={COLORS.destructive}
        />
      );
    }
    return (
      <StatusPill
        icon={Clock}
        label="Never run"
        tint={COLORS.secondary}
        color={COLORS.mutedForeground}
      />
    );
  };

  const statusRows: Array<[string, string]> = statusTask
    ? [
        ["Status", statusTask.enabled ? "enabled" : "paused"],
        [
          "Last run",
          `${formatRunAt(statusTask.lastRunAt)}${
            statusTask.lastStatus ? ` (${statusTask.lastStatus})` : ""
          }`,
        ],
        ["Next run", statusTask.enabled ? formatRunAt(statusTask.nextRunAt) : "—"],
        ["Schedule", statusTask.schedule],
      ]
    : [];

  return (
    <AppShell
      title="Scheduled tasks"
      actions={
        <GlassIconButton
          icon={Plus}
          size={18}
          onPress={() => setEditingDraft({ ...EMPTY_DRAFT })}
        />
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Scheduled tasks"
          description="Run AI agent tasks on your server on a schedule."
        />

        {isLoading && <SkeletonRows count={3} />}

        {error && (
          <EmptyState
            icon={CalendarClock}
            title="Could not load tasks"
            description={(error as Error).message}
          />
        )}

        {!isLoading && tasks.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="No scheduled tasks yet"
            description="Automate check-ins, reports, syncs and maintenance — the agent does the work."
            action={
              <Button
                variant="default"
                size="sm"
                onPress={() => setEditingDraft({ ...EMPTY_DRAFT })}
              >
                Add task
              </Button>
            }
          />
        )}

        {tasks.map((t) => (
          <Surface
            key={t.id}
            style={[styles.taskCard, !t.enabled && styles.taskCardDisabled]}
          >
            <View style={styles.taskHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.taskName}>{t.name}</Text>
                </View>
                <Text style={styles.taskCommand} numberOfLines={2}>
                  {t.prompt}
                </Text>
                <Text style={styles.taskMeta} numberOfLines={1}>
                  {t.workspace || "Default workspace"} · {t.model || "Default model"} ·{" "}
                  {sandboxLabel(t.sandbox)}
                </Text>
              </View>
              <Switch
                checked={t.enabled}
                onCheckedChange={(c) => saveTask.mutate({ ...toDraft(t), enabled: c })}
              />
            </View>

            <View style={styles.taskFooter}>
              <View style={styles.pillRow}>
                <StatusPill
                  icon={Clock}
                  label={t.schedule}
                  tint={COLORS.secondary}
                  color={COLORS.mutedForeground}
                  monoText
                />
                {runStatusPill(t)}
                {t.enabled && formatNextRun(t.nextRunAt) && (
                  <StatusPill
                    icon={CalendarClock}
                    label={`Next ${formatNextRun(t.nextRunAt)}`}
                    tint={COLORS.primary + "14"}
                    color={COLORS.primary}
                  />
                )}
              </View>
              <View style={styles.actionIcons}>
                <GlassIconButton
                  icon={FileText}
                  size={14}
                  onPress={() => setStatusTask(t)}
                />
                <GlassIconButton
                  icon={Play}
                  size={14}
                  onPress={() => handleRun(t)}
                  disabled={runTask.isPending}
                />
                <GlassIconButton
                  icon={Pencil}
                  size={14}
                  onPress={() => setEditingDraft(toDraft(t))}
                />
                <GlassIconButton
                  icon={Trash2}
                  size={14}
                  onPress={() => handleDelete(t)}
                />
              </View>
            </View>
          </Surface>
        ))}

        {/* Task Form Modal */}
        <Modal
          visible={editingDraft !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setEditingDraft(null)}
        >
          <View style={styles.modalBackdrop}>
            <Surface style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingDraft?.id ? "Edit task" : "New task"}
                </Text>
                <TouchableOpacity onPress={() => setEditingDraft(null)}>
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              {editingDraft && (
                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.form}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.fieldGroup}>
                    <Label>Task name</Label>
                    <Input
                      placeholder="e.g. Daily backup"
                      value={editingDraft.name}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, name: t })
                      }
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Schedule</Label>
                    <View style={styles.presetRow}>
                      {SCHEDULE_PRESETS.map((p) => {
                        const isSel = editingDraft.schedule === p.value;
                        return (
                          <TouchableOpacity
                            key={p.value}
                            style={[
                              styles.presetChip,
                              isSel && styles.presetChipActive,
                            ]}
                            onPress={() =>
                              setEditingDraft({
                                ...editingDraft,
                                schedule: p.value,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isSel && styles.presetChipTextActive,
                              ]}
                            >
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {(() => {
                        const isCustom = !SCHEDULE_PRESETS.some(
                          (p) => p.value === editingDraft.schedule
                        );
                        return (
                          <TouchableOpacity
                            style={[
                              styles.presetChip,
                              isCustom && styles.presetChipActive,
                            ]}
                            onPress={() => scheduleInputRef.current?.focus()}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isCustom && styles.presetChipTextActive,
                              ]}
                            >
                              Custom
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                    <Input
                      ref={scheduleInputRef}
                      placeholder="0 * * * *"
                      value={editingDraft.schedule}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, schedule: t })
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Instructions for the agent</Label>
                    <TextInput
                      style={styles.multilineInput}
                      placeholder="e.g. Check disk usage and summarize the largest folders"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={editingDraft.prompt}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, prompt: t })
                      }
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Workspace path</Label>
                    <Input
                      placeholder={DEFAULT_WORKSPACE}
                      value={editingDraft.workspace}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, workspace: t })
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Model</Label>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setModelPickerOpen(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pickerButtonText}>
                        {editingDraft.model
                          ? models.find((m) => m.id === editingDraft.model)
                              ?.name || editingDraft.model
                          : "Default"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Execution</Label>
                    <View style={styles.presetRow}>
                      {SANDBOX_MODES.map((s) => {
                        const isSel = editingDraft.sandbox === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.presetChip,
                              isSel && styles.presetChipActive,
                            ]}
                            onPress={() =>
                              setEditingDraft({
                                ...editingDraft,
                                sandbox: s.id,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isSel && styles.presetChipTextActive,
                              ]}
                            >
                              {s.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.hintText}>
                      {
                        SANDBOX_MODES.find(
                          (s) => s.id === editingDraft.sandbox
                        )?.description
                      }
                    </Text>
                  </View>

                  <Button
                    variant="default"
                    loading={saveTask.isPending}
                    onPress={handleSave}
                    style={{ marginTop: 8 }}
                  >
                    Save task
                  </Button>
                </ScrollView>
              )}
            </Surface>
          </View>
        </Modal>

        {/* Model picker */}
        <OptionPicker
          open={modelPickerOpen}
          title="Model"
          searchable
          searchPlaceholder="Search models…"
          options={[
            {
              id: "",
              label: "Default",
              description: "Server default model",
            },
            ...models.map((m) => ({
              id: m.id,
              label: m.name || m.id,
              description: m.description || m.id,
            })),
          ]}
          selectedId={editingDraft?.model || ""}
          onSelect={(id) => {
            setEditingDraft((d) => (d ? { ...d, model: id } : d));
            setModelPickerOpen(false);
          }}
          onClose={() => setModelPickerOpen(false)}
        />

        {/* Run status modal */}
        <Modal
          visible={statusTask !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setStatusTask(null)}
        >
          <View style={styles.modalBackdrop}>
            <Surface style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {statusTask?.name} — run status
                </Text>
                <TouchableOpacity onPress={() => setStatusTask(null)}>
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={styles.statusRows}>
                {statusRows.map(([label, value], i) => (
                  <View
                    key={label}
                    style={[
                      styles.statusRow,
                      i === statusRows.length - 1 && styles.statusRowLast,
                    ]}
                  >
                    <Text style={styles.statusLabel}>{label}</Text>
                    <Text style={styles.statusValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </Surface>
          </View>
        </Modal>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary + "14",
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  presetChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerButtonText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  multilineInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.foreground,
    minHeight: 110,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  taskCardDisabled: {
    opacity: 0.62,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  taskCommand: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 3,
  },
  taskMeta: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 6,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 8,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  formScroll: {
    flexGrow: 0,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  statusRows: {
    paddingBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  statusRowLast: {
    borderBottomWidth: 0,
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  statusValue: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },
});

