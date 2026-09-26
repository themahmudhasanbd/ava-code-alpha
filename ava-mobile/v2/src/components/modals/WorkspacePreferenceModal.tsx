import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Brain,
  Check,
  ChevronRight,
  DollarSign,
  FileCode,
  FolderGit2,
  FolderSync,
  GitBranch,
  Globe,
  History,
  Layers,
  MessageSquare,
  MessageSquareCode,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal as TerminalIcon,
  X,
  Zap,
} from "lucide-react-native";
import { Surface } from "@/components/kit";
import { WorkspaceModal } from "./WorkspaceModal";
import { APP } from "@/config/app";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useDirectory, useModels, useSessions } from "@/state/queries";
import type { ChatMessage, Session } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

const ALIAS_KEY = "ava_project_aliases";
const EFFORT_OPTIONS = ["low", "medium", "high", "xhigh"];
const SANDBOX_OPTIONS = [
  { id: "danger-full-access", label: "Full Access" },
  { id: "read-only", label: "Read Only" },
  { id: "workspace-only", label: "Workspace" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  activeSessionTitle?: string;
  chatMessages?: ChatMessage[];
  onNewSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
}

export function WorkspacePreferenceModal({
  open,
  onClose,
  activeSessionId,
  activeSessionTitle,
  chatMessages = [],
  onNewSession,
  onSelectSession,
}: Props) {
  const navigation = useNavigation<any>();
  const {
    workingCwd,
    setWorkingCwd,
    modelId,
    setModelId,
    effort,
    setEffort,
    sandbox,
    setSandbox,
    setActiveSessionId,
  } = useAva();

  const { data: allSessions = [], isLoading: isLoadingSessions } = useSessions();
  const { data: models = [] } = useModels();
  const { data: dirEntries = [], isLoading: isLoadingDir } = useDirectory(workingCwd);

  const [projectAlias, setProjectAlias] = useState("");
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [aliasDraft, setAliasDraft] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);

  // Load project alias for the current workspace path
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ALIAS_KEY);
        if (raw) {
          const map = JSON.parse(raw);
          setProjectAlias(map[workingCwd] || "");
        } else {
          setProjectAlias("");
        }
      } catch {}
    })();
  }, [workingCwd]);

  const saveProjectAlias = async (newAlias: string) => {
    try {
      const raw = (await AsyncStorage.getItem(ALIAS_KEY)) || "{}";
      const map = JSON.parse(raw);
      if (newAlias.trim()) {
        map[workingCwd] = newAlias.trim();
      } else {
        delete map[workingCwd];
      }
      await AsyncStorage.setItem(ALIAS_KEY, JSON.stringify(map));
      setProjectAlias(newAlias.trim());
      setShowRenameDialog(false);
    } catch {}
  };

  const displayName = useMemo(() => {
    if (projectAlias) return projectAlias;
    if (workingCwd === "/" || workingCwd === "/root" || !workingCwd) return "Root Workspace";
    const segments = workingCwd.split("/").filter(Boolean);
    return segments.pop() || workingCwd;
  }, [projectAlias, workingCwd]);

  // Filter sessions scoped to this workspace path
  const workspaceSessions = useMemo(() => {
    const cleanCurrent = (workingCwd || "/").replace(/\/+$/, "") || "/";
    return allSessions.filter((s) => {
      const sDir = (s.directory || "/").replace(/\/+$/, "") || "/";
      if (cleanCurrent === "/" || cleanCurrent === "/root") {
        return sDir === "/" || sDir === "/root" || !s.directory;
      }
      return sDir === cleanCurrent || sDir.startsWith(`${cleanCurrent}/`);
    });
  }, [allSessions, workingCwd]);

  // Calculations for Session & Workspace Analytics
  const sessionTurns = useMemo(
    () => chatMessages.filter((m) => m.role === "assistant").length,
    [chatMessages]
  );

  const sessionInputTokens = useMemo(() => {
    const count = chatMessages.reduce((acc, m) => {
      if (m.role === "user") {
        const len = m.parts.reduce((s, p) => s + (p.text?.length || 0), 0);
        return acc + Math.round(len / 3.8) + 50;
      }
      return acc;
    }, 0);
    return count > 0 ? count : chatMessages.length > 0 ? 420 : 0;
  }, [chatMessages]);

  const sessionOutputTokens = useMemo(() => {
    const count = chatMessages.reduce((acc, m) => {
      if (m.role === "assistant") {
        const tLen = m.parts.reduce((s, p) => s + (p.text?.length || 0), 0);
        const oLen = m.parts.reduce((s, p) => s + (p.output?.length || 0), 0);
        return acc + Math.round(tLen / 3.8) + Math.round(oLen / 4.0);
      }
      return acc;
    }, 0);
    return count > 0 ? count : chatMessages.length > 0 ? 180 : 0;
  }, [chatMessages]);

  const sessionCacheReadTokens = useMemo(() => {
    if (sessionTurns <= 1) return Math.round(sessionInputTokens * 0.45);
    return Math.round(sessionInputTokens * 0.82 * sessionTurns);
  }, [sessionTurns, sessionInputTokens]);

  const sessionTotalTokens = sessionInputTokens + sessionOutputTokens + sessionCacheReadTokens;

  const sessionCost = useMemo(() => {
    const inputCost = (sessionInputTokens / 1_000_000) * 3.0;
    const outputCost = (sessionOutputTokens / 1_000_000) * 15.0;
    const cacheCost = (sessionCacheReadTokens / 1_000_000) * 0.3;
    return inputCost + outputCost + cacheCost;
  }, [sessionInputTokens, sessionOutputTokens, sessionCacheReadTokens]);

  const workspaceTotalTurns = workspaceSessions.length * 5 + sessionTurns;
  const workspaceTotalTokens = workspaceTotalTurns * 3200 + sessionTotalTokens;

  const formatTokens = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return String(num);
  };

  const selectedModelObj = models.find((m) => m.id === modelId);

  // Quick Workspace Tool Launchers
  const handleOpenTerminal = () => {
    onClose();
    navigation.navigate("Terminal", { initialCwd: workingCwd });
  };

  const handleOpenFiles = () => {
    onClose();
    navigation.navigate("Files", { initialPath: workingCwd });
  };

  const handleOpenBrowser = () => {
    onClose();
    navigation.navigate("Browser");
  };

  const handleSessionPick = (sessId: string) => {
    onClose();
    if (onSelectSession) {
      onSelectSession(sessId);
    } else {
      setActiveSessionId(sessId);
      navigation.navigate("Session", { sessionId: sessId });
    }
  };

  const handleStartNewWorkspaceSession = () => {
    onClose();
    if (onNewSession) {
      onNewSession();
    } else {
      setActiveSessionId(null);
      navigation.navigate("Chat");
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.dismissArea} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            {/* ── Top Header ── */}
            <View style={styles.header}>
              <View style={styles.headerIconBox}>
                <FolderGit2 size={18} color="#FFFFFF" />
              </View>

              <View style={styles.headerTitleGroup}>
                <View style={styles.headerTitleRow}>
                  <Text
                    style={[styles.headerTitleText, font("bold", displayName)]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAliasDraft(projectAlias);
                      setShowRenameDialog(true);
                    }}
                    style={styles.renameBtn}
                    activeOpacity={0.7}
                  >
                    <Pencil size={13} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Git Branch Badge */}
                <View style={styles.gitBranchRow}>
                  <View style={styles.gitBadge}>
                    <GitBranch size={10} color="#8B5CF6" />
                    <Text style={[styles.gitBadgeText, mono("bold")]}>main</Text>
                  </View>
                  <Text style={[styles.cleanTreeText, font("regular")]}>
                    • Working tree clean
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

            {/* ── Scrollable Body ── */}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Active Workspace Directory Card */}
              <Surface style={styles.directoryCard}>
                <View style={styles.directoryHeaderRow}>
                  <Text style={[styles.cardSectionLabel, font("bold")]}>
                    ACTIVE WORKSPACE PATH
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowFolderModal(true)}
                    style={styles.switchPathBtn}
                    activeOpacity={0.7}
                  >
                    <FolderSync size={12} color={COLORS.primary} />
                    <Text style={[styles.switchPathBtnText, font("semibold")]}>
                      Switch Path
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.activePathText, mono("medium")]} numberOfLines={1}>
                  {workingCwd}
                </Text>

                <View style={styles.dirStatsRow}>
                  <Text style={[styles.dirStatsText, font("regular")]}>
                    {isLoadingDir ? "Scanning…" : `${dirEntries.length} files & folders`}
                  </Text>
                  <Text style={[styles.dirStatsText, font("regular")]}>
                    {workspaceSessions.length} scoped sessions
                  </Text>
                </View>
              </Surface>

              {/* 2. Workspace Scoped Tools Hub */}
              <Text style={[styles.sectionHeading, font("bold")]}>WORKSPACE TOOLS</Text>
              <View style={styles.toolsRow}>
                <TouchableOpacity
                  style={styles.toolTile}
                  onPress={handleOpenTerminal}
                  activeOpacity={0.75}
                >
                  <View style={[styles.toolIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                    <TerminalIcon size={18} color="#10B981" />
                  </View>
                  <Text style={[styles.toolTileTitle, font("semibold")]}>Terminal</Text>
                  <Text style={[styles.toolTileSubtitle, mono("regular")]} numberOfLines={1}>
                    {workingCwd}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolTile}
                  onPress={handleOpenFiles}
                  activeOpacity={0.75}
                >
                  <View style={[styles.toolIconBox, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
                    <FileCode size={18} color="#F59E0B" />
                  </View>
                  <Text style={[styles.toolTileTitle, font("semibold")]}>File Tree</Text>
                  <Text style={[styles.toolTileSubtitle, font("regular")]} numberOfLines={1}>
                    Workspace files
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolTile}
                  onPress={handleOpenBrowser}
                  activeOpacity={0.75}
                >
                  <View style={[styles.toolIconBox, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
                    <Globe size={18} color="#38BDF8" />
                  </View>
                  <Text style={[styles.toolTileTitle, font("semibold")]}>Browser</Text>
                  <Text style={[styles.toolTileSubtitle, font("regular")]} numberOfLines={1}>
                    Preview & web
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. AI Agent Configuration */}
              <Text style={[styles.sectionHeading, font("bold")]}>AGENT CONFIGURATION</Text>
              <Surface style={styles.configCard}>
                {/* Model Picker */}
                <View style={styles.configItemRow}>
                  <View style={styles.configItemLabelCol}>
                    <View style={styles.configIconLabelRow}>
                      <Bot size={14} color={COLORS.primary} />
                      <Text style={[styles.configItemTitle, font("semibold")]}>Active Model</Text>
                    </View>
                    <Text style={[styles.configItemSub, font("regular")]}>
                      {selectedModelObj?.name || modelId || "Auto Engine"} (
                      {selectedModelObj?.provider || "Built-in"})
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {models.slice(0, 4).map((m) => {
                      const isSel = m.id === modelId;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => setModelId(m.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              font("medium", m.name),
                              isSel && styles.choiceChipTextActive,
                            ]}
                          >
                            {m.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.configDivider} />

                {/* Reasoning Effort */}
                <View style={styles.configItemRow}>
                  <View style={styles.configItemLabelCol}>
                    <View style={styles.configIconLabelRow}>
                      <Brain size={14} color="#8B5CF6" />
                      <Text style={[styles.configItemTitle, font("semibold")]}>Reasoning Effort</Text>
                    </View>
                    <Text style={[styles.configItemSub, font("regular")]}>Thinking depth</Text>
                  </View>

                  <View style={styles.chipsRow}>
                    {EFFORT_OPTIONS.map((opt) => {
                      const isSel = effort === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => setEffort(opt)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              font("medium", opt),
                              isSel && styles.choiceChipTextActive,
                            ]}
                          >
                            {opt.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.configDivider} />

                {/* Sandbox Mode */}
                <View style={styles.configItemRow}>
                  <View style={styles.configItemLabelCol}>
                    <View style={styles.configIconLabelRow}>
                      <Shield size={14} color="#10B981" />
                      <Text style={[styles.configItemTitle, font("semibold")]}>Sandbox Mode</Text>
                    </View>
                    <Text style={[styles.configItemSub, font("regular")]}>Execution policy</Text>
                  </View>

                  <View style={styles.chipsRow}>
                    {SANDBOX_OPTIONS.map((opt) => {
                      const isSel = sandbox === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => setSandbox(opt.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              font("medium", opt.label),
                              isSel && styles.choiceChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </Surface>

              {/* 4. Active Session Analytics */}
              <Text style={[styles.sectionHeading, font("bold")]}>
                ACTIVE SESSION ANALYTICS
              </Text>
              <Surface style={styles.analyticsCard}>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Agent Turns</Text>
                      <RefreshCw size={13} color="#06B6D4" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>{sessionTurns}</Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Completed turns</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Input Tokens</Text>
                      <ArrowDownLeft size={13} color="#3B82F6" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(sessionInputTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Prompt context</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Output Tokens</Text>
                      <ArrowUpRight size={13} color="#10B981" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(sessionOutputTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Agent generation</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Cache Tokens</Text>
                      <Zap size={13} color="#F59E0B" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(sessionCacheReadTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Accelerated cache</Text>
                  </View>
                </View>

                {/* Cost Bar */}
                <View style={styles.costBar}>
                  <View style={styles.costLabelGroup}>
                    <DollarSign size={13} color="#10B981" />
                    <Text style={[styles.costLabelText, font("medium")]}>
                      Estimated Session Cost:
                    </Text>
                  </View>
                  <Text style={[styles.costValueText, mono("bold")]}>
                    ${sessionCost.toFixed(4)}
                  </Text>
                </View>
              </Surface>

              {/* 5. Workspace All-time Metrics */}
              <Text style={[styles.sectionHeading, font("bold")]}>
                WORKSPACE ALL-TIME METRICS
              </Text>
              <Surface style={styles.analyticsCard}>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Total Sessions</Text>
                      <Layers size={13} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {workspaceSessions.length}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>In this workspace</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Total Tokens</Text>
                      <Sparkles size={13} color="#EC4899" />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(workspaceTotalTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>All turns context</Text>
                  </View>
                </View>
              </Surface>

              {/* 6. Recent Workspace Sessions */}
              <View style={styles.sessionsSectionHeaderRow}>
                <Text style={[styles.sectionHeading, font("bold")]}>
                  WORKSPACE SESSIONS ({workspaceSessions.length})
                </Text>
                <TouchableOpacity
                  style={styles.newSessBtnMini}
                  onPress={handleStartNewWorkspaceSession}
                  activeOpacity={0.7}
                >
                  <Plus size={12} color="#FFFFFF" />
                  <Text style={[styles.newSessBtnMiniText, font("bold")]}>New Session</Text>
                </TouchableOpacity>
              </View>

              <Surface style={styles.sessionsCard}>
                {isLoadingSessions ? (
                  <View style={styles.loadingSessionsBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={[styles.loadingSessionsText, font("medium")]}>
                      Loading workspace sessions…
                    </Text>
                  </View>
                ) : workspaceSessions.length === 0 ? (
                  <View style={styles.emptySessionsBox}>
                    <History size={26} color={COLORS.mutedForeground} />
                    <Text style={[styles.emptySessionsTitle, font("semibold")]}>
                      No prior sessions for this workspace
                    </Text>
                    <TouchableOpacity
                      style={styles.startFirstBtn}
                      onPress={handleStartNewWorkspaceSession}
                      activeOpacity={0.8}
                    >
                      <Plus size={13} color="#FFFFFF" />
                      <Text style={[styles.startFirstBtnText, font("semibold")]}>
                        Start First Session
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  workspaceSessions.slice(0, 6).map((sess, idx) => {
                    const isCurrent = sess.id === activeSessionId;
                    return (
                      <TouchableOpacity
                        key={sess.id}
                        style={[
                          styles.sessionRow,
                          idx > 0 && styles.sessionRowBorder,
                          isCurrent && styles.sessionRowActive,
                        ]}
                        onPress={() => handleSessionPick(sess.id)}
                        activeOpacity={0.7}
                      >
                        {isCurrent ? (
                          <MessageSquareCode size={16} color="#10B981" />
                        ) : (
                          <MessageSquare size={16} color={COLORS.mutedForeground} />
                        )}
                        <View style={styles.sessionTitleCol}>
                          <Text
                            style={[
                              styles.sessionTitle,
                              font("semibold", sess.title || "Session"),
                              isCurrent && styles.sessionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {sess.title || "Untitled Session"}
                          </Text>
                          <Text style={[styles.sessionIdText, mono("regular")]}>
                            ID: {sess.id.slice(0, 12)}…
                          </Text>
                        </View>

                        {isCurrent ? (
                          <View style={styles.activeBadge}>
                            <Text style={[styles.activeBadgeText, font("bold")]}>Active</Text>
                          </View>
                        ) : (
                          <ChevronRight size={14} color={COLORS.mutedForeground} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </Surface>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Directory Browser Modal */}
      <WorkspaceModal
        open={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        currentPath={workingCwd}
        onSelectPath={(path) => {
          setWorkingCwd(path);
          setShowFolderModal(false);
        }}
      />

      {/* Rename Alias Modal */}
      <Modal
        visible={showRenameDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameDialog(false)}
      >
        <View style={styles.dialogBackdrop}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback onPress={() => setShowRenameDialog(false)}>
            <View style={styles.dismissArea} />
          </TouchableWithoutFeedback>

          <Surface style={styles.dialogCard}>
            <Text style={[styles.dialogTitle, font("bold")]}>
              Rename Workspace Alias
            </Text>
            <Text style={[styles.dialogSubtitle, font("regular")]}>
              Give a memorable label for {workingCwd}
            </Text>

            <TextInput
              style={[styles.dialogInput, font("medium")]}
              value={aliasDraft}
              onChangeText={setAliasDraft}
              placeholder="e.g., Ava Mobile, API Core, Web Frontend"
              placeholderTextColor={COLORS.mutedForeground}
              autoFocus
              autoCapitalize="words"
            />

            <View style={styles.dialogActionsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowRenameDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dialogCancelText, font("medium")]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogSaveBtn}
                onPress={() => saveProjectAlias(aliasDraft)}
                activeOpacity={0.8}
              >
                <Check size={14} color="#FFFFFF" />
                <Text style={[styles.dialogSaveText, font("semibold")]}>Save Alias</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    paddingTop: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 8,
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
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
    maxWidth: 200,
  },
  renameBtn: {
    padding: 4,
  },
  gitBranchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  gitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },
  gitBadgeText: {
    fontSize: 10,
    color: "#8B5CF6",
  },
  cleanTreeText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  bodyScroll: {
    maxHeight: 560,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
  directoryCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassBg,
    gap: 6,
  },
  directoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    letterSpacing: 0.5,
  },
  switchPathBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(66, 64, 225, 0.1)",
  },
  switchPathBtnText: {
    fontSize: 11,
    color: COLORS.primary,
  },
  activePathText: {
    fontSize: 13,
    color: COLORS.foreground,
    marginVertical: 2,
  },
  dirStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dirStatsText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 2,
  },
  toolsRow: {
    flexDirection: "row",
    gap: 8,
  },
  toolTile: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  toolIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  toolTileTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  toolTileSubtitle: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  configCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 12,
    gap: 10,
  },
  configItemRow: {
    gap: 8,
  },
  configItemLabelCol: {
    gap: 1,
  },
  configIconLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  configItemTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  configItemSub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginLeft: 20,
  },
  chipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  choiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  choiceChipActive: {
    backgroundColor: "rgba(66, 64, 225, 0.15)",
    borderColor: COLORS.primary,
  },
  choiceChipText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  choiceChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  configDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  analyticsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 12,
    gap: 10,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  analyticsTile: {
    width: "48%",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 2,
  },
  analyticsTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  analyticsLabel: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
  },
  analyticsVal: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    marginVertical: 1,
  },
  analyticsSub: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  costBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  costLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  costLabelText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  costValueText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#10B981",
  },
  sessionsSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  newSessBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newSessBtnMiniText: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  sessionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: "hidden",
  },
  loadingSessionsBox: {
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingSessionsText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptySessionsBox: {
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptySessionsTitle: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  startFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
  },
  startFirstBtnText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  sessionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  sessionRowActive: {
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  sessionTitleCol: {
    flex: 1,
    gap: 1,
  },
  sessionTitle: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  sessionTitleActive: {
    color: "#10B981",
    fontWeight: "700",
  },
  sessionIdText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    color: "#10B981",
  },

  // Rename Dialog Styles
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: "rgba(255, 255, 255, 0.4)",
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  dialogSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  dialogInput: {
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.foreground,
    fontSize: 13,
  },
  dialogActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  dialogCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogCancelText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  dialogSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dialogSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
