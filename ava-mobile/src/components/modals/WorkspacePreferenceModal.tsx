import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { Switch } from "@/components/ui/switch";
import { readTextFile, writeTextFile } from "@/core/api/files";

interface ProjectContextPrefs {
  enabled: boolean;
  rules: boolean;
  workflows: boolean;
  design: boolean;
  plans: boolean;
}

const DEFAULT_PROJECT_CONTEXT: ProjectContextPrefs = {
  enabled: true,
  rules: true,
  workflows: true,
  design: true,
  plans: true,
};

const PROJECT_CONTEXT_KEYS: (keyof ProjectContextPrefs)[] = [
  "enabled",
  "rules",
  "workflows",
  "design",
  "plans",
];

/** Extract [project_context] booleans from a config.toml's text. Missing keys default to true. */
function parseProjectContextToml(text: string): ProjectContextPrefs {
  const result = { ...DEFAULT_PROJECT_CONTEXT };
  const sectionMatch = text.match(/\[project_context\]([\s\S]*?)(?=\n\[[^\]]+\]|\s*$)/);
  if (!sectionMatch) return result;
  const section = sectionMatch[1];
  for (const key of PROJECT_CONTEXT_KEYS) {
    const m = section.match(new RegExp(`^${key}\\s*=\\s*(true|false)`, "m"));
    if (m) result[key] = m[1] === "true";
  }
  return result;
}

/** Rewrite the [project_context] section, preserving the rest of the file. */
function updateProjectContextToml(text: string, pc: ProjectContextPrefs): string {
  const section = [
    "[project_context]",
    `enabled = ${pc.enabled}`,
    `rules = ${pc.rules}`,
    `workflows = ${pc.workflows}`,
    `design = ${pc.design}`,
    `plans = ${pc.plans}`,
    "",
  ].join("\n");
  const sectionRegex = /\[project_context\][\s\S]*?(?=\n\[[^\]]+\]|\s*$)/;
  if (sectionRegex.test(text)) {
    return text.replace(sectionRegex, section.trimEnd());
  }
  const trimmed = text.trimEnd();
  return trimmed ? `${trimmed}\n\n${section}` : section;
}
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useDirectory, useModels, useSessions } from "@/state/queries";
import type { ChatMessage, Session } from "@/core/types";
import { COLORS, useTheme } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";
import { REASONING_EFFORTS, SANDBOX_MODES} from "@/config/models";

const ALIAS_KEY = "ava_project_aliases";
const EFFORT_OPTIONS = [...REASONING_EFFORTS];


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
    rpc,
  } = useAva();

  // Project context (.ava-code) preferences — persisted to the project's
  // .ava-code/config.toml so the server picks them up on the next turn.
  const [projectContext, setProjectContextState] = useState<ProjectContextPrefs>(
    DEFAULT_PROJECT_CONTEXT
  );
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [pcSaving, setPcSaving] = useState(false);

  const projectContextTomlPath = useMemo(
    () => (workingCwd ? `${workingCwd.replace(/\/+$/, "")}/.ava-code/config.toml` : null),
    [workingCwd]
  );

  const loadProjectContext = useCallback(async () => {
    if (!rpc || !projectContextTomlPath) return;
    try {
      const text = await readTextFile(rpc, projectContextTomlPath);
      setProjectContextState(parseProjectContextToml(text));
    } catch {
      setProjectContextState(DEFAULT_PROJECT_CONTEXT);
    }
  }, [rpc, projectContextTomlPath]);

  useEffect(() => {
    if (open) loadProjectContext();
  }, [open, loadProjectContext]);

  const setProjectContext = useCallback(
    async (next: ProjectContextPrefs) => {
      setProjectContextState(next);
      if (!rpc || !projectContextTomlPath || pcSaving) return;
      setPcSaving(true);
      try {
        let text = "";
        try {
          text = await readTextFile(rpc, projectContextTomlPath);
        } catch {
          text = "";
        }
        await writeTextFile(rpc, projectContextTomlPath, updateProjectContextToml(text, next));
      } catch (e) {
        Alert.alert("Couldn't save", "The project context preference couldn't be written.");
      } finally {
        setPcSaving(false);
      }
    },
    [rpc, projectContextTomlPath, pcSaving]
  );
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

  const { isDark } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(340)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 280,
          mass: 0.8,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 340,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [open, fadeAnim, slideAnim]);

  if (!mounted) return null;

  return (
    <>
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <BlurView intensity={75} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.dismissArea} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            {/* ── Top Header ── */}
            <View style={styles.header}>
              <View style={styles.headerIconBox}>
                <FolderGit2 size={18} color={COLORS.primaryForeground} />
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
                    <GitBranch size={10} color={COLORS.primary} />
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
                  <View style={[styles.toolIconBox, { backgroundColor: COLORS.accent }]}>
                    <TerminalIcon size={18} color={COLORS.primary} />
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
                  <View style={[styles.toolIconBox, { backgroundColor: COLORS.accent }]}>
                    <FileCode size={18} color={COLORS.primary} />
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
                  <View style={[styles.toolIconBox, { backgroundColor: COLORS.accent }]}>
                    <Globe size={18} color={COLORS.primary} />
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
                    {models.map((m) => {
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
                      <Brain size={14} color={COLORS.primary} />
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
                      <Shield size={14} color={COLORS.primary} />
                      <Text style={[styles.configItemTitle, font("semibold")]}>Sandbox Mode</Text>
                    </View>
                    <Text style={[styles.configItemSub, font("regular")]}>Execution policy</Text>
                  </View>

                  <View style={styles.chipsRow}>
                    {SANDBOX_MODES.map((opt) => {
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

              {/* 3b. Project Context (.ava-code) */}
              <Text style={[styles.sectionHeading, font("bold")]}>PROJECT CONTEXT</Text>
              <Surface style={styles.configCard}>
                <View style={styles.configItemRow}>
                  <View style={styles.configItemLabelCol}>
                    <View style={styles.configIconLabelRow}>
                      <Brain size={14} color={COLORS.primary} />
                      <Text style={[styles.configItemTitle, font("semibold")]}>
                        Context Index
                      </Text>
                    </View>
                    <Text style={[styles.configItemSub, font("regular")]}>
                      Inject .ava-code index with each prompt
                    </Text>
                  </View>
                  <Switch
                    checked={projectContext.enabled}
                    onCheckedChange={(v) => setProjectContext({ ...projectContext, enabled: v })}
                  />
                </View>
                {(
                  [
                    { key: "rules", label: "Rules", sub: ".ava-code/rules/index.md" },
                    { key: "workflows", label: "Workflows", sub: ".ava-code/workflows/index.md" },
                    { key: "design", label: "Design", sub: ".ava-code/design/index.md" },
                    { key: "plans", label: "Plans", sub: ".ava-code/plans/index.md" },
                  ] as const
                ).map((item) => (
                  <View key={item.key} style={styles.configItemRow}>
                    <View style={styles.configItemLabelCol}>
                      <Text style={[styles.configItemTitle, font("semibold")]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.configItemSub, font("regular")]}>{item.sub}</Text>
                    </View>
                    <Switch
                      checked={projectContext[item.key]}
                      disabled={!projectContext.enabled}
                      onCheckedChange={(v) =>
                        setProjectContext({ ...projectContext, [item.key]: v })
                      }
                    />
                  </View>
                ))}
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
                      <RefreshCw size={13} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>{sessionTurns}</Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Completed turns</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Input Tokens</Text>
                      <ArrowDownLeft size={13} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(sessionInputTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Prompt context</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Output Tokens</Text>
                      <ArrowUpRight size={13} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {formatTokens(sessionOutputTokens)}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>Agent generation</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Cache Tokens</Text>
                      <Zap size={13} color={COLORS.primary} />
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
                    <DollarSign size={13} color={COLORS.primary} />
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
                      <Layers size={13} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.analyticsVal, mono("bold")]}>
                      {workspaceSessions.length}
                    </Text>
                    <Text style={[styles.analyticsSub, font("regular")]}>In this workspace</Text>
                  </View>

                  <View style={styles.analyticsTile}>
                    <View style={styles.analyticsTileHeader}>
                      <Text style={[styles.analyticsLabel, font("medium")]}>Total Tokens</Text>
                      <Sparkles size={13} color={COLORS.primary} />
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
                  <Plus size={12} color={COLORS.primaryForeground} />
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
                      <Plus size={13} color={COLORS.primaryForeground} />
                      <Text style={[styles.startFirstBtnText, font("semibold")]}>
                        Start First Session
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  (showAllSessions ? workspaceSessions : workspaceSessions.slice(0, 6)).map((sess, idx) => {
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
                          <MessageSquareCode size={16} color={COLORS.primary} />
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
                {workspaceSessions.length > 6 && (
                  <TouchableOpacity
                    style={styles.viewAllRow}
                    onPress={() => setShowAllSessions((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllText, font("medium")]}>
                      {showAllSessions
                        ? "Show less"
                        : `View all ${workspaceSessions.length} sessions`}
                    </Text>
                    <ChevronRight
                      size={14}
                      color={COLORS.primary}
                      style={showAllSessions ? { transform: [{ rotate: "90deg" }] } : undefined}
                    />
                  </TouchableOpacity>
                )}
              </Surface>
            </ScrollView>
          </Animated.View>
        </Animated.View>
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
          <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
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
                <Check size={14} color={COLORS.primaryForeground} />
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
    borderTopColor: COLORS.border,
    paddingTop: 10,
    overflow: "hidden",
    shadowColor: COLORS.glassShadow,
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
    backgroundColor: COLORS.accent,
  },
  gitBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
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
    backgroundColor: COLORS.accent,
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
    backgroundColor: COLORS.accent,
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
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.primary,
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
    color: COLORS.primaryForeground,
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
    color: COLORS.primaryForeground,
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
    borderTopColor: COLORS.secondary,
  },
  sessionRowActive: {
    backgroundColor: COLORS.accent,
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
    color: COLORS.primary,
    fontWeight: "700",
  },
  sessionIdText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  activeBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
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
    borderTopColor: COLORS.border,
    padding: 18,
    gap: 12,
    shadowColor: COLORS.glassShadow,
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
    color: COLORS.primaryForeground,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
  },
});
