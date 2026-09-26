import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  LogOut,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { StatusDot } from "@/components/kit";
import { WorkspaceModal } from "@/components/modals/WorkspaceModal";
import { APP } from "@/config/app";
import { NAV_SECTIONS, type AppScreenName } from "@/config/navigation";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useDeleteSession, useSessions } from "@/state/queries";
import type { Session } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

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

export function AppDrawer(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const { auth, status, signOut, activeSessionId, setActiveSessionId, workingCwd, setWorkingCwd } =
    useAva();
  const { data: sessions = [], isLoading } = useSessions();
  const deleteSession = useDeleteSession();

  const [tab, setTab] = useState<"menu" | "sessions">("sessions");
  const [pins, setPins] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);
  const [tabWidth, setTabWidth] = useState(0);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  // Load pinned directories from storage
  useEffect(() => {
    try {
      const raw = storage.get(PIN_KEY);
      if (raw) {
        setPins(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // Animations for tab indicator
  const tabAnim = useRef(new Animated.Value(tab === "menu" ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: tab === "menu" ? 0 : 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tab, tabAnim]);

  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;
  const currentParams = currentRoute?.params as
    | { sessionId?: string }
    | undefined;
  const currentSessionId =
    currentRouteName === "Session" ? currentParams?.sessionId : null;

  const handleNav = (screenName: AppScreenName) => {
    navigation.closeDrawer();
    if (screenName === "Chat") {
      const targetSessionId = activeSessionId ?? currentSessionId;
      if (targetSessionId) {
        navigation.navigate("Session", { sessionId: targetSessionId });
      } else {
        navigation.navigate("Chat");
      }
    } else {
      navigation.navigate(screenName);
    }
  };

  const handlePickSession = (id: string | null) => {
    navigation.closeDrawer();
    if (!id) {
      setActiveSessionId(null);
      navigation.navigate("Chat");
    } else {
      setActiveSessionId(id);
      navigation.navigate("Session", { sessionId: id });
    }
  };

  const handleNewSessionClick = () => {
    setWorkspaceModalOpen(true);
  };

  const handleWorkspaceSelect = (path: string) => {
    setWorkingCwd(path);
    setActiveSessionId(null);
    setWorkspaceModalOpen(false);
    navigation.closeDrawer();
    navigation.navigate("Chat");
  };

  const toggleExpand = (dir: string) => {
    setExpandedDirs((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const togglePin = (dir: string) => {
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

  const activeDirectory = useMemo(() => {
    const active = sessions.find(
      (s) => s.id === (currentSessionId ?? activeSessionId)
    );
    return active?.directory ?? workingCwd ?? (sessions.length > 0 ? sessions[0].directory : "/");
  }, [sessions, currentSessionId, activeSessionId, workingCwd]);

  // Auto-expand active directory
  useEffect(() => {
    if (activeDirectory) {
      setExpandedDirs((prev) =>
        prev.includes(activeDirectory) ? prev : [...prev, activeDirectory]
      );
    }
  }, [activeDirectory]);

  // Sort project groups: Active workspace first, then pinned, then alphabetical
  const projectGroups = useMemo(() => {
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

  const singleTabWidth = tabWidth > 0 ? (tabWidth - 6) / 2 : 0;
  const indicatorTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, singleTabWidth],
  });

  return (
    <>
      <View
        style={[
          styles.outerContainer,
          {
            paddingTop:
              Platform.OS === "android"
                ? Math.max(insets.top, 14)
                : insets.top + 8,
            paddingBottom:
              Platform.OS === "android"
                ? Math.max(insets.bottom, 14)
                : insets.bottom + 8,
          },
        ]}
      >
        <View style={styles.glassModal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={[styles.brandTitle, font("bold")]}>{APP.name}</Text>
              <Text style={[styles.brandSubtitle, font("regular")]}>
                {APP.tagline} · v{APP.version}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.closeDrawer()}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <X size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Animated Segmented Tabs (Menu | Sessions) */}
          <View style={styles.tabsContainer}>
            <View
              style={styles.tabsList}
              onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
            >
              {singleTabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    {
                      width: singleTabWidth,
                      transform: [{ translateX: indicatorTranslateX }],
                    },
                  ]}
                />
              )}
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => setTab("menu")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    font("medium"),
                    tab === "menu" && styles.tabTextActive,
                  ]}
                >
                  Menu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => setTab("sessions")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    font("medium"),
                    tab === "sessions" && styles.tabTextActive,
                  ]}
                >
                  Sessions
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Contents */}
          <View style={styles.tabContentWrapper}>
            {tab === "menu" ? (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {NAV_SECTIONS.map((section) => (
                  <View key={section.title} style={styles.sectionBlock}>
                    <Text style={[styles.sectionHeader, font("semibold")]}>{section.title}</Text>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        (item.screen === "Chat" &&
                          (currentRouteName === "Chat" ||
                            currentRouteName === "Session")) ||
                        currentRouteName === item.screen;
                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.menuItem,
                            isActive && styles.menuItemActive,
                          ]}
                          onPress={() => handleNav(item.screen)}
                          activeOpacity={0.7}
                        >
                          <Icon
                            size={18}
                            color={
                              isActive ? COLORS.primary : COLORS.mutedForeground
                            }
                          />
                          <Text
                            style={[
                              styles.menuItemText,
                              font("medium"),
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
                {/* ── New Session Button -> Opens Workspace Directory Selector ── */}
                <TouchableOpacity
                  style={[
                    styles.newSessionBtn,
                    (currentRouteName === "Chat" || !currentSessionId) &&
                      styles.newSessionBtnActive,
                  ]}
                  onPress={handleNewSessionClick}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={16}
                    color={
                      currentRouteName === "Chat" || !currentSessionId
                        ? COLORS.primary
                        : COLORS.foreground
                    }
                  />
                  <Text
                    style={[
                      styles.newSessionText,
                      font("medium"),
                      (currentRouteName === "Chat" || !currentSessionId) &&
                        styles.newSessionTextActive,
                    ]}
                  >
                    New session
                  </Text>
                </TouchableOpacity>

                {status !== "online" && (
                  <Text style={[styles.hintText, font("regular")]}>
                    Waiting for server connection…
                  </Text>
                )}
                {isLoading && (
                  <Text style={[styles.hintText, font("regular")]}>Loading sessions…</Text>
                )}
                {!isLoading && sessions.length === 0 && (
                  <Text style={[styles.hintText, font("regular")]}>No sessions yet.</Text>
                )}

                <View style={styles.groupsWrapper}>
                  {projectGroups.map(([dir, sList]) => {
                    const isOpen = expandedDirs.includes(dir);
                    const isPinned = pins.includes(dir);
                    const isActiveWorkspace = dir === activeDirectory;

                    return (
                      <View
                        key={dir}
                        style={[
                          styles.groupContainer,
                          isActiveWorkspace && styles.activeWorkspaceContainer,
                        ]}
                      >
                        {/* Project / Workspace Group Header */}
                        <TouchableOpacity
                          style={[
                            styles.groupHeader,
                            isActiveWorkspace && styles.activeWorkspaceHeader,
                          ]}
                          onPress={() => toggleExpand(dir)}
                          activeOpacity={0.7}
                        >
                          {isOpen ? (
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
                              isActiveWorkspace
                                ? COLORS.primary
                                : COLORS.mutedForeground
                            }
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

                              {/* Active Workspace Pill Tag */}
                              {isActiveWorkspace && (
                                <View style={styles.activeWorkspaceBadge}>
                                  <Text style={[styles.activeWorkspaceBadgeText, font("bold")]}>
                                    Workspace
                                  </Text>
                                </View>
                              )}

                              {/* Pinned Pill Tag */}
                              {isPinned && !isActiveWorkspace && (
                                <View style={styles.pinnedBadge}>
                                  <Pin size={10} color={COLORS.primary} />
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

                          <Text style={[styles.groupCount, mono("medium")]}>{sList.length}</Text>

                          {/* Quick Pin / Unpin Action */}
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

                        {/* Smooth Collapsible Session List */}
                        {isOpen && (
                          <View style={styles.groupSessionList}>
                            {sList.map((s) => {
                              const isSelected =
                                currentSessionId === s.id ||
                                (activeSessionId === s.id &&
                                  currentRouteName === "Session");
                              const isRunning =
                                s.active ||
                                s.status === "active" ||
                                s.status === "inProgress";
                              return (
                                <View key={s.id} style={styles.sessionRow}>
                                  <TouchableOpacity
                                    style={[
                                      styles.sessionBtn,
                                      isSelected && styles.sessionBtnActive,
                                    ]}
                                    onPress={() => handlePickSession(s.id)}
                                    activeOpacity={0.7}
                                  >
                                    {isRunning ? (
                                      <ActivityIndicator
                                        size="small"
                                        color={COLORS.primary}
                                        style={{ transform: [{ scale: 0.75 }] }}
                                      />
                                    ) : isSelected ? (
                                      <View style={styles.activeSessionDot} />
                                    ) : null}
                                    <Text
                                      style={[
                                        styles.sessionBtnText,
                                        font("regular", s.title || "Untitled Session"),
                                        isSelected &&
                                          styles.sessionBtnTextActive,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {s.title || "Untitled Session"}
                                    </Text>
                                    {isRunning && (
                                      <View style={styles.runningBadge}>
                                        <Text style={[styles.runningBadgeText, font("bold")]}>
                                          Running
                                        </Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => {
                                      if (
                                        activeSessionId === s.id ||
                                        currentSessionId === s.id
                                      ) {
                                        handlePickSession(null);
                                      }
                                      deleteSession.mutate(s.id);
                                    }}
                                    hitSlop={{
                                      top: 8,
                                      bottom: 8,
                                      left: 8,
                                      right: 8,
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Trash2
                                      size={13}
                                      color={COLORS.mutedForeground}
                                    />
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
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.avatarBox}>
              <Text style={[styles.avatarText, font("bold")]}>
                {(auth?.username || "A").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userMetaCol}>
              <Text style={[styles.usernameText, font("semibold")]} numberOfLines={1}>
                {auth?.username || "Guest"}
              </Text>
              <View style={styles.serverRow}>
                <StatusDot status={status} size={6} />
                <Text style={[styles.serverHostText, font("regular")]} numberOfLines={1}>
                  {auth?.serverUrl.replace(/^https?:\/\//, "") || "offline"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={signOut}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Workspace Directory Selector Modal */}
      <WorkspaceModal
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
        currentPath={workingCwd}
        onSelectPath={handleWorkspaceSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.card,
    paddingLeft: 0,
    paddingRight: 0,
  },
  glassModal: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.glassBorder,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sidebarBorder,
  },
  headerTitleGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  tabsList: {
    flexDirection: "row",
    position: "relative",
    height: 38,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 3,
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: COLORS.card,
    borderRadius: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    zIndex: 2,
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
  tabContentWrapper: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  sectionBlock: {
    marginBottom: 18,
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
    color: COLORS.foreground,
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
  newSessionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.sidebarAccent,
  },
  newSessionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  newSessionTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
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
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  activeWorkspaceContainer: {
    backgroundColor: "rgba(66, 64, 225, 0.04)",
    borderColor: "rgba(66, 64, 225, 0.2)",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
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
  groupCount: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  pinBtn: {
    padding: 4,
    marginLeft: 4,
  },
  groupSessionList: {
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
  sessionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sessionBtnActive: {
    backgroundColor: COLORS.sidebarAccent,
  },
  activeSessionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  sessionBtnText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  sessionBtnTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 6,
  },
  runningBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    marginLeft: 4,
  },
  runningBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.sidebarBorder,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
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
    backgroundColor: COLORS.secondary,
  },
});
