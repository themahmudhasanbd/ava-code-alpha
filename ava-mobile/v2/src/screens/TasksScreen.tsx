import React, { useState } from "react";
import {
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
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
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
import { SCHEDULE_PRESETS, type ScheduledTask } from "@/core/api/schedule";
import {
  useDeleteTask,
  useRunTask,
  useSaveTask,
  useTasks,
} from "@/state/queries";
import { COLORS } from "@/theme/colors";

type Draft = Omit<ScheduledTask, "id"> & { id?: string };
const EMPTY_DRAFT: Draft = {
  name: "",
  schedule: SCHEDULE_PRESETS[1]?.value ?? "0 * * * *",
  command: "",
  enabled: true,
};

export function TasksScreen() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const saveTask = useSaveTask();
  const deleteTask = useDeleteTask();
  const runTask = useRunTask();

  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  const handleSave = async () => {
    if (!editingDraft || !editingDraft.name.trim() || !editingDraft.command.trim())
      return;
    try {
      await saveTask.mutateAsync(editingDraft);
      setEditingDraft(null);
    } catch (err) {
      console.warn("Save task error:", err);
    }
  };

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
          description="Run commands on your server on a schedule."
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
            description="Automate maintenance, sync or backups."
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
          <Surface key={t.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskName}>{t.name}</Text>
                <Text style={styles.taskCommand} numberOfLines={1}>
                  {t.command}
                </Text>
              </View>
              <Switch
                checked={t.enabled}
                onCheckedChange={(c) => saveTask.mutate({ ...t, enabled: c })}
              />
            </View>

            <View style={styles.taskFooter}>
              <Badge variant="outline">{t.schedule}</Badge>
              <View style={styles.actionIcons}>
                <GlassIconButton
                  icon={Play}
                  size={14}
                  onPress={() => runTask.mutate(t)}
                  disabled={runTask.isPending}
                />
                <GlassIconButton
                  icon={Pencil}
                  size={14}
                  onPress={() => setEditingDraft({ ...t })}
                />
                <GlassIconButton
                  icon={Trash2}
                  size={14}
                  onPress={() => deleteTask.mutate(t.id)}
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
                <View style={styles.form}>
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
                    <Input
                      placeholder="0 * * * *"
                      value={editingDraft.schedule}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, schedule: t })
                      }
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Label>Command</Label>
                    <Input
                      placeholder="e.g. bun run sync"
                      value={editingDraft.command}
                      onChangeText={(t) =>
                        setEditingDraft({ ...editingDraft, command: t })
                      }
                    />
                  </View>

                  <Button
                    variant="default"
                    loading={saveTask.isPending}
                    onPress={handleSave}
                    style={{ marginTop: 8 }}
                  >
                    Save task
                  </Button>
                </View>
              )}
            </Surface>
          </View>
        </Modal>
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
  taskCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  taskCommand: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
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
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
});
