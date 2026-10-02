import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Folder,
  LogOut,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { StatusDot, DrawerSessionsSkeleton } from "@/components/kit";
import { WorkspaceModal } from "@/components/modals/WorkspaceModal";
import { APP } from "@/config/app";
import { NAV_SECTIONS, type AppScreenName } from "@/config/navigation";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useDeleteSession, useRenameSession, useSessions, useUserProfile } from "@/state/queries";
import type { Session } from "@/core/types";
import { SCHEDULED_THREAD_SOURCE } from "@/core/api/schedule";
import type { ColorTokens } from "@/theme/colors";
import { useStyles, useTheme } from "@/theme/theme-context";
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

export function AppDrawer(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  const {
    auth,
    status,
    signOut,
    activeSessionId,
    setActiveSessionId,
    runningSessions,
    workingSessionId,
    workingCwd,
    setWorkingCwd,
  } = useAva();
  const { data: sessions = [], isLoading } = useSessions();
  const { data: userProfileData } = useUserProfile();
  const deleteSession = useDeleteSession();
  const renameSession = useRenameSession();

  const [tab, setTab] = useState<"menu" | "sessions">("sessions");
  const [pins, setPins] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);
  // Debounce the "Waiting for server connection..." banner: connection status
  // flaps between online/connecting during reconnects, so only show the banner
  // after status has been non-online for >3s continuously.
  const [showConnBanner, setShowConnBanner] = useState(false);
  useEffect(() => {
    if (status === "online") {
      setShowConnBanner(false);
      return;
    }
    const t = setTimeout(() => setShowConnBanner(true), 3000);
    return () => clearTimeout(t);
  }, [status]);
  const [tabWidth, setTabWidth] = useState(0);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  // Rename Session Modal State
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingSession, setRenamingSession] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

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
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [tab, tabAnim]);

  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;
  const currentParams = currentRoute?.params as { sessionId?: string } | undefined;
  const currentSessionId = currentRouteName === "Session" ? currentParams?.sessionId : null;

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
      const next = prev.includes(dir) ? prev.filter((d) => d !== dir) : [dir, ...prev];
      try {
        storage.set(PIN_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const activeDirectory = useMemo(() => {
    const active = sessions.find((s) => s.id === (currentSessionId ?? activeSessionId));
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

  const handleDeleteSession = (s: Session) => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${s.title || "Untitled Session"}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (activeSessionId === s.id || currentSessionId === s.id) {
              handlePickSession(null);
            }
            deleteSession.mutate(s.id);
          },
        },
      ]
    );
  };

  const handleOpenRename = (s: Session) => {
    setRenamingSession({ id: s.id, title: s.title || "" });
    setNewTitle(s.title || "");
    setRenameModalOpen(true);
  };

  const handleSaveRename = () => {
    if (!renamingSession) return;
    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== renamingSession.title) {
      renameSession.mutate({ id: renamingSession.id, name: trimmed });
    }
    setRenameModalOpen(false);
    setRenamingSession(null);
    setNewTitle("");
  };

  const singleTabWidth = tabWidth > 0 ? (tabWidth - 6) / 2 : 0;
  const indicatorTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, singleTabWidth > 0 ? singleTabWidth : 130],
  });

  const profile = userProfileData?.profile;
  const userDisplayName =
    profile?.name?.trim() || profile?.username?.trim() || auth?.username || "Developer";
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();
  const userAvatar = profile?.avatar;

  return (
    <>
      <View
        style={[
          styles.outerContainer,
          {
            paddingTop:
              Platform.OS === "android" ? Math.max(insets.top, 14) : insets.top + 8,
            paddingBottom:
              Platform.OS === "android" ? Math.max(insets.bottom, 14) : insets.bottom + 8,
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
              <X size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Animated Segmented Tabs (Menu | Sessions) */}
          <View style={styles.tabsContainer}>
            <View
              style={styles.tabsList}
              onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: singleTabWidth > 0 ? singleTabWidth : "48%",
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              />
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
                          (currentRouteName === "Chat" || currentRouteName === "Session")) ||
                        currentRouteName === item.screen;
                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[styles.menuItem, isActive && styles.menuItemActive]}
                          onPress={() => handleNav(item.screen)}
                          activeOpacity={0.7}
                        >
                          <Icon
                            size={18}
                            color={isActive ? colors.primary : colors.mutedForeground}
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
                        ? colors.primary
                        : colors.foreground
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

                {showConnBanner && (
                  <Text style={[styles.hintText, font("regular")]}>
                    Waiting for server connection…
                  </Text>
                )}
                {isLoading && <DrawerSessionsSkeleton count={2} />}
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
                              color={isActiveWorkspace ? colors.primary : colors.mutedForeground}
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              color={isActiveWorkspace ? colors.primary : colors.mutedForeground}
                            />
                          )}

                          <Folder
                            size={15}
                            color={isActiveWorkspace ? colors.primary : colors.mutedForeground}
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
                                    Active
                                  </Text>
                                </View>
                              )}

                              {/* Pinned Pill Tag */}
                              {isPinned && !isActiveWorkspace && (
                                <View style={styles.pinnedBadge}>
                                  <Pin size={9.5} color={colors.primary} />
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

                          <View style={styles.groupHeaderRight}>
                            <View style={styles.countBadge}>
                              <Text style={[styles.groupCount, mono("medium")]}>{sList.length}</Text>
                            </View>

                            {/* Quick Pin / Unpin Action */}
                            <TouchableOpacity
                              style={styles.pinBtn}
                              onPress={() => togglePin(dir)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              activeOpacity={0.7}
                              accessibilityLabel={isPinned ? "Unpin workspace" : "Pin workspace"}
                            >
                              {isPinned ? (
                                <PinOff size={13} color={colors.primary} />
                              ) : (
                                <Pin size={13} color={colors.mutedForeground} />
                              )}
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {/* Smooth Collapsible Session List */}
                        {isOpen && (
                          <View style={styles.groupSessionList}>
                            {sList.map((s) => {
                              const isSelected =
                                currentSessionId === s.id ||
                                (activeSessionId === s.id && currentRouteName === "Session");
                              const isRunning =
                                s.active ||
                                s.status === "active" ||
                                s.status === "inProgress" ||
                                !!runningSessions?.[s.id] ||
                                workingSessionId === s.id;
                              return (
                                <View
                                  key={s.id}
                                  style={[
                                    styles.sessionRow,
                                    isSelected && styles.sessionRowSelected,
                                  ]}
                                >
                                  <TouchableOpacity
                                    style={styles.sessionBtn}
                                    onPress={() => handlePickSession(s.id)}
                                    activeOpacity={0.7}
                                  >
                                    {isRunning ? (
                                      <ActivityIndicator
                                        size="small"
                                        color={colors.primary}
                                        style={{ transform: [{ scale: 0.7 }] }}
                                      />
                                    ) : (
                                      <View
                                        style={[
                                          styles.sessionDot,
                                          isSelected && styles.sessionDotSelected,
                                        ]}
                                      />
                                    )}
                                    <Text
                                      style={[
                                        styles.sessionBtnText,
                                        font(isSelected ? "medium" : "regular", s.title || "Untitled Session"),
                                        isSelected && styles.sessionBtnTextActive,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {s.title || "Untitled Session"}
                                    </Text>
                                    {s.source === SCHEDULED_THREAD_SOURCE && (
                                      <View style={styles.scheduledPill}>
                                        <Clock size={10} color={colors.primary} />
                                      </View>
                                    )}
                                    {isRunning && (
                                      <View style={styles.runningBadge}>
                                        <Text style={[styles.runningBadgeText, font("bold")]}>
                                          Running
                                        </Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>

                                  <View style={styles.sessionActions}>
                                    {/* Rename Session Action */}
                                    <TouchableOpacity
                                      style={styles.actionBtn}
                                      onPress={() => handleOpenRename(s)}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                      activeOpacity={0.7}
                                      accessibilityLabel="Rename session"
                                    >
                                      <Edit2 size={12} color={colors.mutedForeground} />
                                    </TouchableOpacity>

                                    {/* Delete Session with Confirmation */}
                                    <TouchableOpacity
                                      style={styles.actionBtn}
                                      onPress={() => handleDeleteSession(s)}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                      activeOpacity={0.7}
                                      accessibilityLabel="Delete session"
                                    >
                                      <Trash2 size={12.5} color={colors.mutedForeground} />
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
              </ScrollView>
            )}
          </View>

          {/* Profile & User Meta Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.profileClickArea}
              onPress={() => handleNav("Profile")}
              activeOpacity={0.7}
            >
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarBox}>
                  <Text style={[styles.avatarText, font("bold")]}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.userMetaCol}>
                <Text style={[styles.usernameText, font("semibold")]} numberOfLines={1}>
                  {userDisplayName}
                </Text>
                <View style={styles.serverRow}>
                  <StatusDot status={status} size={6} />
                  <Text style={[styles.serverHostText, font("regular")]} numberOfLines={1}>
                    {auth?.serverUrl.replace(/^https?:\/\//, "") || "offline"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={signOut}
              activeOpacity={0.7}
              accessibilityLabel="Sign out"
            >
              <LogOut size={16} color={colors.foreground} />
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

      {/* Session Rename Modal Dialog */}
      <Modal
        visible={renameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRenameModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.renameModalCard}>
                <Text style={[styles.renameModalTitle, font("bold")]}>Rename Session</Text>
                <Text style={[styles.renameModalSubtitle, font("regular")]}>
                  Enter a new title for this conversation thread:
                </Text>

                <TextInput
                  style={[styles.renameInput, font("regular")]}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Session Title…"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveRename}
                />

                <View style={styles.renameActionsRow}>
                  <TouchableOpacity
                    style={styles.renameCancelBtn}
                    onPress={() => setRenameModalOpen(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.renameCancelText, font("medium")]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.renameSaveBtn}
                    onPress={handleSaveRename}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.renameSaveText, font("semibold")]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const createStyles = (c: ColorTokens) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: c.sidebar,
    paddingLeft: 0,
    paddingRight: 0,
  },
  glassModal: {
    flex: 1,
    backgroundColor: c.sidebar,
    borderRadius: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: c.glassBorder,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.sidebarBorder,
  },
  headerTitleGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.foreground,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 12,
    color: c.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  tabsList: {
    flexDirection: "row",
    position: "relative",
    height: 38,
    backgroundColor: c.secondary,
    borderRadius: 999,
    padding: 3,
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: c.card,
    borderRadius: 999,
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
    borderRadius: 999,
    zIndex: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: c.mutedForeground,
  },
  tabTextActive: {
    color: c.foreground,
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
    fontSize: 10.5,
    fontWeight: "600",
    textTransform: "uppercase",
    color: c.mutedForeground,
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  menuItemActive: {
    backgroundColor: c.sidebarAccent,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: c.foreground,
  },
  menuItemTextActive: {
    fontWeight: "600",
    color: c.primary,
  },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.glassBorder,
    backgroundColor: c.glassBg,
    marginBottom: 14,
  },
  newSessionBtnActive: {
    borderColor: c.primary,
    backgroundColor: c.sidebarAccent,
  },
  newSessionText: {
    fontSize: 14,
    fontWeight: "500",
    color: c.foreground,
  },
  newSessionTextActive: {
    color: c.primary,
    fontWeight: "600",
  },
  hintText: {
    fontSize: 13,
    color: c.mutedForeground,
    paddingHorizontal: 8,
    marginVertical: 6,
  },
  groupsWrapper: {
    gap: 6,
  },
  groupContainer: {
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: "hidden",
  },
  activeWorkspaceContainer: {
    backgroundColor: c.primary + "0D",
    borderColor: c.primary + "38",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activeWorkspaceHeader: {
    backgroundColor: c.primary + "14",
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
    fontWeight: "600",
    color: c.foreground,
    flexShrink: 1,
  },
  activeGroupTitle: {
    color: c.primary,
    fontWeight: "700",
  },
  activeWorkspaceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: c.primary + "24",
  },
  activeWorkspaceBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: c.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: c.secondary,
  },
  pinnedBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: c.primary,
  },
  pathTag: {
    fontSize: 10.5,
    color: c.mutedForeground,
    marginTop: 2,
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: c.secondary,
  },
  groupCount: {
    fontSize: 10.5,
    fontWeight: "600",
    color: c.mutedForeground,
  },
  pinBtn: {
    padding: 3,
    borderRadius: 999,
  },
  groupSessionList: {
    marginLeft: 14,
    marginRight: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: c.primary + "33",
    paddingLeft: 8,
    gap: 3,
    paddingTop: 6,
    paddingBottom: 8,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    paddingHorizontal: 4,
    minHeight: 36,
  },
  sessionRowSelected: {
    backgroundColor: c.sidebarAccent,
  },
  sessionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingRight: 4,
    minWidth: 0,
  },
  scheduledPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: c.primary + "1A",
    marginLeft: 6,
  },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.mutedForeground,
    opacity: 0.4,
  },
  sessionDotSelected: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: c.primary,
    opacity: 1,
  },
  sessionBtnText: {
    fontSize: 13,
    color: c.mutedForeground,
    flex: 1,
  },
  sessionBtnTextActive: {
    color: c.foreground,
    fontWeight: "600",
  },
  sessionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 999,
    opacity: 0.65,
  },
  runningBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: c.primary + "1F",
    marginLeft: 4,
  },
  runningBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: c.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.sidebarBorder,
    backgroundColor: c.sidebar,
  },
  profileClickArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: c.primaryForeground,
  },
  userMetaCol: {
    flex: 1,
  },
  usernameText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.foreground,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  serverHostText: {
    fontSize: 11,
    color: c.mutedForeground,
    flex: 1,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  renameModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  renameModalTitle: {
    fontSize: 16,
    color: c.foreground,
    marginBottom: 4,
  },
  renameModalSubtitle: {
    fontSize: 12.5,
    color: c.mutedForeground,
    marginBottom: 14,
  },
  renameInput: {
    height: 42,
    backgroundColor: c.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: c.foreground,
    marginBottom: 16,
  },
  renameActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  renameCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: c.secondary,
  },
  renameCancelText: {
    fontSize: 13,
    color: c.mutedForeground,
  },
  renameSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.primary,
  },
  renameSaveText: {
    fontSize: 13,
    color: c.primaryForeground,
  },
});
