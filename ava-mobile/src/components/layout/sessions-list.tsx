import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  Plus,
  Folder,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Pin,
  PinOff,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { DrawerSessionsSkeleton } from "@/components/kit";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useSessions, useDeleteSession, useRenameSession } from "@/state/queries";
import type { Session } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

const PIN_KEY = "ava.workspace.pins";

const projectName = (dir: string) =>
  dir.split("/").filter(Boolean).pop() ?? "Root";

function groupByProject(sessions: Session[]) {
  const map = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = session.directory || "/";
    map.set(key, [...(map.get(key) ?? []), session]);
  }
  return [...map.entries()];
}

export function SessionsList({
  onPick,
}: {
  onPick?: (sessionId: string | null) => void;
}) {
  const {
    activeSessionId,
    setActiveSessionId,
    runningSessions,
    workingSessionId,
    status,
  } = useAva();
  const { data: sessions = [], isLoading, error } = useSessions();
  const del = useDeleteSession();
  const rename = useRenameSession();
  const [pins, setPins] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);

  // Rename modal state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingSession, setRenamingSession] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    try {
      const raw = storage.get(PIN_KEY);
      if (raw) setPins(JSON.parse(raw));
    } catch {}
  }, []);

  const activeDirectory = useMemo(() => {
    const active = sessions.find((s) => s.id === activeSessionId);
    return (
      active?.directory ?? (sessions.length > 0 ? sessions[0].directory : "/")
    );
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (activeDirectory) {
      setExpandedDirs((prev) =>
        prev.includes(activeDirectory) ? prev : [...prev, activeDirectory]
      );
    }
  }, [activeDirectory]);

  const groups = useMemo(() => {
    const grouped = groupByProject(sessions);
    return grouped.sort(([a], [b]) => {
      const aIsActive = a === activeDirectory;
      const bIsActive = b === activeDirectory;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      const aPin = pins.indexOf(a);
      const bPin = pins.indexOf(b);
      if (aPin >= 0 || bPin >= 0)
        return aPin < 0 ? 1 : bPin < 0 ? -1 : aPin - bPin;
      return projectName(a).localeCompare(projectName(b));
    });
  }, [sessions, pins, activeDirectory]);

  const toggleExpand = (dir: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedDirs((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const togglePin = (dir: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setPins((prev) => {
      const next = prev.includes(dir)
        ? prev.filter((d) => d !== dir)
        : [dir, ...prev];
      try {
        storage.set(PIN_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handlePick = (id: string | null) => {
    setActiveSessionId(id);
    onPick?.(id);
  };

  const handleDelete = (session: Session) => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${session.title || "Untitled Session"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (activeSessionId === session.id) {
              handlePick(null);
            }
            del.mutate(session.id);
          },
        },
      ]
    );
  };

  const handleOpenRename = (session: Session) => {
    setRenamingSession({ id: session.id, title: session.title || "" });
    setNewTitle(session.title || "");
    setRenameOpen(true);
  };

  const handleSaveRename = () => {
    if (!renamingSession) return;
    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== renamingSession.title) {
      rename.mutate({ id: renamingSession.id, name: trimmed });
    }
    setRenameOpen(false);
    setRenamingSession(null);
    setNewTitle("");
  };

  return (
    <View style={styles.container}>
      <Button
        variant="outline"
        size="sm"
        style={styles.newButton}
        onPress={() => handlePick(null)}
      >
        <Plus size={16} color={COLORS.foreground} />
        <Text style={[styles.newButtonText, font("medium")]}>New Session</Text>
      </Button>

      {status !== "online" && (
        <Text style={[styles.infoText, font("regular")]}>Connecting to server...</Text>
      )}

      {isLoading && <DrawerSessionsSkeleton count={2} />}

      {error && <Text style={[styles.errorText, font("regular")]}>Could not load sessions.</Text>}

      {sessions.length === 0 && !isLoading && (
        <Text style={[styles.infoText, font("regular")]}>No sessions yet.</Text>
      )}

      <View style={styles.groupsContainer}>
        {groups.map(([dir, dirSessions]) => {
          const isExpanded = expandedDirs.includes(dir);
          const isPinned = pins.includes(dir);
          const isActiveWorkspace = dir === activeDirectory;

          return (
            <View
              key={dir}
              style={[
                styles.groupCard,
                isActiveWorkspace && styles.activeWorkspaceCard,
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(dir)}
                style={[
                  styles.groupHeader,
                  isActiveWorkspace && styles.activeWorkspaceHeader,
                ]}
              >
                {isExpanded ? (
                  <ChevronDown
                    size={14}
                    color={isActiveWorkspace ? COLORS.primary : COLORS.mutedForeground}
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    color={isActiveWorkspace ? COLORS.primary : COLORS.mutedForeground}
                  />
                )}
                <Folder
                  size={15}
                  color={isActiveWorkspace ? COLORS.primary : COLORS.mutedForeground}
                />
                <View style={styles.groupInfoCol}>
                  <View style={styles.groupTitleRow}>
                    <Text
                      style={[
                        styles.groupTitle,
                        font("semibold", projectName(dir)),
                        isActiveWorkspace && styles.activeGroupTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {projectName(dir)}
                    </Text>
                    {isActiveWorkspace && (
                      <View style={styles.activeWorkspaceBadge}>
                        <Text style={[styles.activeWorkspaceBadgeText, font("bold")]}>
                          Active
                        </Text>
                      </View>
                    )}
                    {isPinned && !isActiveWorkspace && (
                      <View style={styles.pinnedBadge}>
                        <Pin size={9.5} color={COLORS.primary} />
                        <Text style={[styles.pinnedBadgeText, font("semibold")]}>
                          Pinned
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.pathTag, mono("regular")]} numberOfLines={1}>
                    {dir}
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={[styles.groupCount, mono("medium")]}>{dirSessions.length}</Text>
                </View>

                <TouchableOpacity
                  style={styles.pinBtn}
                  onPress={() => togglePin(dir)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  {isPinned ? (
                    <PinOff size={13} color={COLORS.primary} />
                  ) : (
                    <Pin size={13} color={COLORS.mutedForeground} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sessionList}>
                  {dirSessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const isRunning =
                      session.active ||
                      session.status === "active" ||
                      session.status === "inProgress" ||
                      !!runningSessions?.[session.id] ||
                      workingSessionId === session.id;

                    return (
                      <View
                        key={session.id}
                        style={[
                          styles.sessionRow,
                          isActive && styles.sessionRowActive,
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handlePick(session.id)}
                          style={styles.sessionButton}
                        >
                          {isRunning ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.primary}
                              style={{ transform: [{ scale: 0.7 }] }}
                            />
                          ) : (
                            <View
                              style={[
                                styles.sessionDot,
                                isActive && styles.sessionDotActive,
                              ]}
                            />
                          )}
                          <Text
                            style={[
                              styles.sessionTitle,
                              font(isActive ? "medium" : "regular", session.title || "Untitled Session"),
                              isActive && styles.activeSessionTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {session.title || "Untitled Session"}
                          </Text>
                          {isRunning && (
                            <View style={styles.runningBadge}>
                              <Text style={[styles.runningBadgeText, font("bold")]}>
                                Running
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        <View style={styles.sessionActions}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleOpenRename(session)}
                            style={styles.actionButton}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          >
                            <Edit2 size={12} color={COLORS.mutedForeground} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleDelete(session)}
                            style={styles.actionButton}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          >
                            <Trash2 size={12.5} color={COLORS.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Rename Modal */}
      <Modal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.renameCard}>
                <Text style={[styles.renameTitle, font("bold")]}>Rename Session</Text>
                <TextInput
                  style={[styles.renameInput, font("regular")]}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="New title…"
                  placeholderTextColor={COLORS.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveRename}
                />
                <View style={styles.renameRow}>
                  <TouchableOpacity
                    style={styles.renameCancel}
                    onPress={() => setRenameOpen(false)}
                  >
                    <Text style={[styles.renameCancelText, font("medium")]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.renameSave}
                    onPress={handleSaveRename}
                  >
                    <Text style={[styles.renameSaveText, font("semibold")]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  newButton: {
    width: "100%",
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  newButtonText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.destructive,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  groupsContainer: {
    gap: 6,
  },
  groupCard: {
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  activeWorkspaceCard: {
    backgroundColor: COLORS.primary + "0D",
    borderColor: COLORS.primary + "38",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activeWorkspaceHeader: {
    backgroundColor: COLORS.primary + "14",
  },
  groupInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  groupTitle: {
    fontSize: 13,
    color: COLORS.foreground,
    flexShrink: 1,
  },
  activeGroupTitle: {
    color: COLORS.primary,
  },
  activeWorkspaceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: COLORS.primary + "24",
  },
  activeWorkspaceBadgeText: {
    fontSize: 9,
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  pinnedBadgeText: {
    fontSize: 9,
    color: COLORS.primary,
  },
  pathTag: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginTop: 1,
    opacity: 0.8,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  groupCount: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  pinBtn: {
    padding: 3,
    marginLeft: 2,
  },
  sessionList: {
    marginLeft: 14,
    marginRight: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: COLORS.primary + "33",
    paddingLeft: 8,
    gap: 2,
    paddingTop: 4,
    paddingBottom: 6,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    paddingHorizontal: 4,
    minHeight: 34,
  },
  sessionRowActive: {
    backgroundColor: COLORS.sidebarAccent,
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.mutedForeground,
    opacity: 0.4,
  },
  sessionDotActive: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  sessionTitle: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  activeSessionTitle: {
    color: COLORS.foreground,
  },
  sessionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  actionButton: {
    padding: 5,
    borderRadius: 5,
    opacity: 0.65,
  },
  runningBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: COLORS.primary + "1F",
    marginLeft: 4,
  },
  runningBadgeText: {
    fontSize: 9,
    color: COLORS.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  renameTitle: {
    fontSize: 15,
    color: COLORS.foreground,
    marginBottom: 12,
  },
  renameInput: {
    height: 40,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.foreground,
    marginBottom: 14,
  },
  renameRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  renameCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  renameCancelText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  renameSave: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  renameSaveText: {
    fontSize: 12.5,
    color: COLORS.primaryForeground,
  },
});
