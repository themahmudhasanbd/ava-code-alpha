import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  Plus,
  Folder,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/kit";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useSessions, useDeleteSession } from "@/state/queries";
import type { Session } from "@/core/types";
import { COLORS } from "@/theme/colors";



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
  const { activeSessionId, setActiveSessionId, runningSessions, workingSessionId, status } =
    useAva();
  const { data: sessions = [], isLoading, error } = useSessions();
  const del = useDeleteSession();
  const [pins, setPins] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = storage.get(PIN_KEY);
      if (raw) setPins(JSON.parse(raw));
    } catch {}
  }, []);

  const activeDirectory = useMemo(() => {
    const active = sessions.find((s) => s.id === activeSessionId);
    return active?.directory ?? (sessions.length > 0 ? sessions[0].directory : "/");
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
      if (aPin >= 0 || bPin >= 0) return aPin < 0 ? 1 : bPin < 0 ? -1 : aPin - bPin;
      return projectName(a).localeCompare(projectName(b));
    });
  }, [sessions, pins, activeDirectory]);

  const toggleExpand = (dir: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDirs((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const togglePin = (dir: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  return (
    <View style={styles.container}>
      <Button
        variant="outline"
        size="sm"
        style={styles.newButton}
        onPress={() => handlePick(null)}
      >
        <Plus size={16} color={COLORS.foreground} />
        <Text style={styles.newButtonText}>New Session</Text>
      </Button>

      {status !== "online" && (
        <Text style={styles.infoText}>Connecting to server...</Text>
      )}

      {isLoading && <SkeletonRows count={3} />}

      {error && (
        <Text style={styles.errorText}>Could not load sessions.</Text>
      )}

      {sessions.length === 0 && !isLoading && (
        <Text style={styles.infoText}>No sessions yet.</Text>
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
                    color={
                      isActiveWorkspace
                        ? COLORS.primary
                        : COLORS.mutedForeground
                    }
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    color={
                      isActiveWorkspace
                        ? COLORS.primary
                        : COLORS.mutedForeground
                    }
                  />
                )}
                <Folder
                  size={15}
                  color={
                    isActiveWorkspace ? COLORS.primary : COLORS.mutedForeground
                  }
                />
                <View style={styles.groupInfoCol}>
                  <View style={styles.groupTitleRow}>
                    <Text
                      style={[
                        styles.groupTitle,
                        isActiveWorkspace && styles.activeGroupTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {projectName(dir)}
                    </Text>
                    {isActiveWorkspace && (
                      <View style={styles.activeWorkspaceBadge}>
                        <Text style={styles.activeWorkspaceBadgeText}>
                          Workspace
                        </Text>
                      </View>
                    )}
                    {isPinned && !isActiveWorkspace && (
                      <View style={styles.pinnedBadge}>
                        <Pin size={10} color={COLORS.primary} />
                        <Text style={styles.pinnedBadgeText}>Pinned</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.pathTag} numberOfLines={1}>
                    {dir}
                  </Text>
                </View>

                <Text style={styles.badgeCount}>{dirSessions.length}</Text>

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
                      <View key={session.id} style={styles.sessionRow}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handlePick(session.id)}
                          style={[
                            styles.sessionButton,
                            isActive && styles.activeSessionButton,
                          ]}
                        >
                          {isActive && <View style={styles.activeDot} />}
                          <Text
                            style={[
                              styles.sessionTitle,
                              isActive && styles.activeSessionTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {session.title || "Untitled Session"}
                          </Text>
                          {isRunning ? (
                            <View style={styles.runningBadge}>
                              <ActivityIndicator
                                size="small"
                                color={COLORS.primary}
                                style={{ transform: [{ scale: 0.7 }] }}
                              />
                              <Text style={styles.runningText}>Running</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            if (activeSessionId === session.id) {
                              handlePick(null);
                            }
                            del.mutate(session.id);
                          }}
                          style={styles.deleteButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={13} color={COLORS.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
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
    fontWeight: "500",
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
    gap: 8,
  },
  groupCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeWorkspaceCard: {
    backgroundColor: "rgba(66, 64, 225, 0.04)",
    borderColor: "rgba(66, 64, 225, 0.2)",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  activeWorkspaceHeader: {
    backgroundColor: "rgba(66, 64, 225, 0.06)",
  },
  groupInfoCol: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  activeGroupTitle: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  activeWorkspaceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
  },
  activeWorkspaceBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  pinnedBadgeText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  pathTag: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  badgeCount: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  pinBtn: {
    padding: 4,
    marginLeft: 4,
  },
  sessionList: {
    marginLeft: 18,
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(66, 64, 225, 0.2)",
    paddingLeft: 10,
    gap: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeSessionButton: {
    backgroundColor: COLORS.sidebarAccent,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  sessionTitle: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  activeSessionTitle: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  runningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(66, 64, 225, 0.1)",
  },
  runningText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  deleteButton: {
    padding: 6,
  },
});
