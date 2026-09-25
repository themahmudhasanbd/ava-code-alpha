import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  LogOut,
  Plus,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { StatusDot, Surface, Button } from "@/components/kit";
import { APP } from "@/config/app";
import { NAV_SECTIONS, type AppScreenName } from "@/config/navigation";
import { useAva } from "@/state/ava-provider";
import { useDeleteSession, useSessions } from "@/state/queries";
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

export function AppDrawer(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { auth, status, signOut, activeSessionId, setActiveSessionId } =
    useAva();
  const { data: sessions = [], isLoading } = useSessions();
  const deleteSession = useDeleteSession();

  const [tab, setTab] = useState<"menu" | "sessions">("sessions");
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);

  const currentRouteName = state.routes[state.index]?.name;

  const handleNav = (screenName: AppScreenName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate(screenName);
  };

  const handlePickSession = (id: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveSessionId(id);
    navigation.navigate("Chat");
  };

  const toggleExpand = (dir: string) => {
    setExpandedDirs((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const projectGroups = useMemo(() => {
    return groupByProject(sessions);
  }, [sessions]);

  return (
    <View style={styles.container}>
      {/* Drawer Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.brandTitle}>{APP.name}</Text>
          <Text style={styles.brandSubtitle}>
            {APP.tagline} · v{APP.version}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.closeDrawer()}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={COLORS.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Tabs List (Menu | Sessions) */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsList}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "menu" && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setTab("menu");
            }}
          >
            <Text
              style={[
                styles.tabText,
                tab === "menu" && styles.tabTextActive,
              ]}
            >
              Menu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "sessions" && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setTab("sessions");
            }}
          >
            <Text
              style={[
                styles.tabText,
                tab === "sessions" && styles.tabTextActive,
              ]}
            >
              Sessions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Contents */}
      {tab === "menu" ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {NAV_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentRouteName === item.screen;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.menuItem,
                      isActive && styles.menuItemActive,
                    ]}
                    onPress={() => handleNav(item.screen)}
                  >
                    <Icon
                      size={18}
                      color={isActive ? COLORS.primary : COLORS.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        isActive && styles.menuItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.newSessionBtn}
            onPress={() => handlePickSession(null)}
          >
            <Plus size={16} color={COLORS.foreground} />
            <Text style={styles.newSessionText}>New session</Text>
          </TouchableOpacity>

          {status !== "online" && (
            <Text style={styles.hintText}>Waiting for server connection…</Text>
          )}
          {isLoading && <Text style={styles.hintText}>Loading sessions…</Text>}
          {!isLoading && sessions.length === 0 && (
            <Text style={styles.hintText}>No sessions yet.</Text>
          )}

          <View style={styles.groupsWrapper}>
            {projectGroups.map(([dir, sList]) => {
              const isOpen = expandedDirs.includes(dir) || expandedDirs.length === 0;
              return (
                <View key={dir} style={styles.groupContainer}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleExpand(dir)}
                  >
                    {isOpen ? (
                      <ChevronDown size={16} color={COLORS.mutedForeground} />
                    ) : (
                      <ChevronRight size={16} color={COLORS.mutedForeground} />
                    )}
                    <Folder size={16} color={COLORS.primary} />
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {projectName(dir)}
                    </Text>
                    <Text style={styles.groupCount}>{sList.length}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.groupSessionList}>
                      {sList.map((s) => {
                        const isSelected = activeSessionId === s.id;
                        return (
                          <View key={s.id} style={styles.sessionRow}>
                            <TouchableOpacity
                              style={[
                                styles.sessionBtn,
                                isSelected && styles.sessionBtnActive,
                              ]}
                              onPress={() => handlePickSession(s.id)}
                            >
                              <Text
                                style={[
                                  styles.sessionBtnText,
                                  isSelected && styles.sessionBtnTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {s.title || "Untitled"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                                if (activeSessionId === s.id) {
                                  setActiveSessionId(null);
                                }
                                deleteSession.mutate(s.id);
                              }}
                            >
                              <Trash2 size={14} color={COLORS.mutedForeground} />
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
        </ScrollView>
      )}

      {/* Drawer Footer */}
      <View style={styles.footer}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {(auth?.username || "A").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userMetaCol}>
          <Text style={styles.usernameText} numberOfLines={1}>
            {auth?.username || "Guest"}
          </Text>
          <View style={styles.serverRow}>
            <StatusDot status={status} size={6} />
            <Text style={styles.serverHostText} numberOfLines={1}>
              {auth?.serverUrl.replace(/^https?:\/\//, "") || "offline"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            signOut();
          }}
        >
          <LogOut size={16} color={COLORS.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.sidebar,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sidebarBorder,
  },
  headerTitleGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.sidebarForeground,
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  tabsList: {
    flexDirection: "row",
    height: 40,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  tabTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: COLORS.sidebarAccent,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.sidebarForeground,
  },
  menuItemTextActive: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
    marginBottom: 14,
  },
  newSessionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    paddingHorizontal: 8,
    marginVertical: 6,
  },
  groupsWrapper: {
    gap: 8,
  },
  groupContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 6,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    flex: 1,
  },
  groupCount: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  groupSessionList: {
    marginLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.sidebarBorder,
    paddingLeft: 10,
    gap: 2,
    marginVertical: 4,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sessionBtnActive: {
    backgroundColor: COLORS.sidebarAccent,
  },
  sessionBtnText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  sessionBtnTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.sidebarBorder,
  },
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryForeground,
  },
  userMetaCol: {
    flex: 1,
  },
  usernameText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  serverHostText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  logoutBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});
