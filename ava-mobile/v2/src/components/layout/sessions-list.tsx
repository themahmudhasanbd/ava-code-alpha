import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  Plus,
  Folder,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { useSessions, useDeleteSession } from "@/state/queries";
import type { Session } from "@/core/types";
import { COLORS } from "@/theme/colors";

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

export function SessionsList({ onPick }: { onPick?: () => void }) {
  const { activeSessionId, setActiveSessionId, workingSessionId, status } =
    useAva();
  const { data: sessions = [], isLoading, error } = useSessions();
  const del = useDeleteSession();
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);

  const groups = useMemo(() => groupByProject(sessions), [sessions]);

  const toggleExpand = (dir: string) => {
    setExpandedDirs((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const handlePick = (id: string | null) => {
    setActiveSessionId(id);
    onPick?.();
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
          return (
            <View key={dir} style={styles.groupCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleExpand(dir)}
                style={styles.groupHeader}
              >
                {isExpanded ? (
                  <ChevronDown size={14} color={COLORS.mutedForeground} />
                ) : (
                  <ChevronRight size={14} color={COLORS.mutedForeground} />
                )}
                <Folder size={15} color={COLORS.primary} />
                <Text style={styles.groupTitle} numberOfLines={1}>
                  {projectName(dir)}
                </Text>
                <Text style={styles.badgeCount}>{dirSessions.length}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sessionList}>
                  {dirSessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const isWorking = workingSessionId === session.id;

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
                          <Text
                            style={[
                              styles.sessionTitle,
                              isActive && styles.activeSessionTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {session.title || "Untitled Session"}
                          </Text>
                          {isWorking ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.primary}
                            />
                          ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            if (activeSessionId === session.id) {
                              setActiveSessionId(null);
                            }
                            del.mutate(session.id);
                          }}
                          style={styles.deleteButton}
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
    borderRadius: 8,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  groupTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  badgeCount: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  sessionList: {
    paddingLeft: 24,
    gap: 4,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeSessionButton: {
    backgroundColor: COLORS.secondary,
  },
  sessionTitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  activeSessionTitle: {
    color: COLORS.foreground,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 6,
  },
});
