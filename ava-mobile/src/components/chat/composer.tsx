import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image as RNImage,
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
import { useNavigation } from "@react-navigation/native";
import { File } from "expo-file-system";
import {
  ArrowLeft,
  ArrowUp,
  AtSign,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Cpu,
  Database,
  Eye,
  FileCode,
  FileText,
  FileVideo,
  Folder,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCommit,
  Globe,
  Layers,
  ListTodo,
  Mic,
  Minimize2,
  Play,
  Plug,
  Plus,
  PlusCircle,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Slash,
  Sparkles,
  Square,
  Target,
  Terminal as TerminalSquare,
  Trash2,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { REASONING_EFFORTS, SANDBOX_MODES } from "@/config/models";
import { useAva } from "@/state/ava-provider";
import { useDirectory, useMcpServers, useModels } from "@/state/queries";
import type { ChatStatus } from "@/state/use-chat";
import { MediaSelectorModal, type SelectedMedia } from "@/components/media/MediaSelectorModal";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

function getAudioModule(): any {
  try {
    const { NativeModules } = require("react-native");
    const hasNative =
      Boolean(NativeModules?.ExponentAV) ||
      Boolean((globalThis as any)?.expo?.modules?.ExponentAV);
    if (!hasNative) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-av")?.Audio ?? null;
  } catch {
    return null;
  }
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onResume?: () => void;
  onClear: () => void;
  status: ChatStatus;
  hasQueued?: boolean;
  queuedCount?: number;
}

export interface AttachedItem {
  id: string;
  name: string;
  uri?: string;
  remotePath?: string;
  kind: "image" | "file" | "audio" | "video" | "code" | "document";
}

type Panel = "tools" | "model" | "sandbox" | null;

export interface SlashCommandItem {
  command: string;
  label: string;
  description: string;
  category: "model" | "session" | "tools" | "workflow";
  icon: LucideIcon;
  action?: "direct" | "panel" | "navigate";
  target?: string;
}

export interface MentionItem {
  id: string;
  name: string;
  insertText: string;
  description: string;
  category: "file" | "folder" | "mcp" | "context" | "symbol";
  icon: LucideIcon;
}

const BUILTIN_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    command: "model",
    label: "/model",
    description: "Switch AI model & reasoning depth",
    category: "model",
    icon: Cpu,
    action: "panel",
    target: "model",
  },
  {
    command: "compact",
    label: "/compact",
    description: "Summarize conversation to free up context window",
    category: "session",
    icon: Minimize2,
  },
  {
    command: "clear",
    label: "/clear",
    description: "Clear transcript & reset screen",
    category: "session",
    icon: Trash2,
    action: "direct",
    target: "clear",
  },
  {
    command: "new",
    label: "/new",
    description: "Start a fresh session",
    category: "session",
    icon: PlusCircle,
    action: "direct",
    target: "new",
  },
  {
    command: "review",
    label: "/review",
    description: "Review current changes and find potential bugs",
    category: "workflow",
    icon: Code2,
  },
  {
    command: "diff",
    label: "/diff",
    description: "Inspect git diff & modified workspace files",
    category: "workflow",
    icon: GitCommit,
  },
  {
    command: "plan",
    label: "/plan",
    description: "Switch to autonomous Plan & Architect mode",
    category: "workflow",
    icon: ListTodo,
  },
  {
    command: "goal",
    label: "/goal",
    description: "Set or inspect a persistent long-running task goal",
    category: "workflow",
    icon: Target,
  },
  {
    command: "mcp",
    label: "/mcp",
    description: "Inspect MCP servers & connected tools",
    category: "tools",
    icon: Plug,
    action: "navigate",
    target: "Mcp",
  },
  {
    command: "skills",
    label: "/skills",
    description: "Invoke and manage specialized agent skills",
    category: "tools",
    icon: Sparkles,
  },
  {
    command: "sandbox",
    label: "/sandbox",
    description: "Adjust execution & workspace write permissions",
    category: "tools",
    icon: ShieldCheck,
    action: "panel",
    target: "sandbox",
  },
  {
    command: "files",
    label: "/files",
    description: "Open workspace file tree and code editor",
    category: "tools",
    icon: FolderOpen,
    action: "navigate",
    target: "Files",
  },
  {
    command: "terminal",
    label: "/terminal",
    description: "Launch interactive server terminal",
    category: "tools",
    icon: TerminalSquare,
    action: "navigate",
    target: "Terminal",
  },
  {
    command: "status",
    label: "/status",
    description: "Show session token usage & system health",
    category: "session",
    icon: Radio,
  },
  {
    command: "stop",
    label: "/stop",
    description: "Stop currently running agent execution",
    category: "session",
    icon: Square,
    action: "direct",
    target: "stop",
  },
];

const STATIC_CONTEXT_MENTIONS: MentionItem[] = [
  {
    id: "git",
    name: "git",
    insertText: "@git",
    description: "Current git branch, commit status & uncommitted changes",
    category: "context",
    icon: GitBranch,
  },
  {
    id: "diff",
    name: "diff",
    insertText: "@diff",
    description: "Full git diff across workspace",
    category: "context",
    icon: GitCommit,
  },
  {
    id: "workspace",
    name: "workspace",
    insertText: "@workspace",
    description: "Current workspace root & active project tree",
    category: "context",
    icon: FolderGit2,
  },
  {
    id: "diagnostics",
    name: "diagnostics",
    insertText: "@diagnostics",
    description: "Server CPU, resident memory & runtime diagnostics",
    category: "context",
    icon: Cpu,
  },
  {
    id: "memory",
    name: "memory",
    insertText: "@memory",
    description: "Persistent project memory & architectural context",
    category: "mcp",
    icon: Brain,
  },
  {
    id: "cloudflare",
    name: "cloudflare",
    insertText: "@cloudflare",
    description: "Cloudflare DNS, zones, cache & security MCP tools",
    category: "mcp",
    icon: Globe,
  },
  {
    id: "cpanel",
    name: "cpanel",
    insertText: "@cpanel",
    description: "cPanel hosting, domains & MySQL MCP tools",
    category: "mcp",
    icon: Server,
  },
  {
    id: "mysql",
    name: "mysql",
    insertText: "@mysql",
    description: "VPS MySQL database schema, tables & query execution",
    category: "mcp",
    icon: Database,
  },
  {
    id: "github",
    name: "github",
    insertText: "@github",
    description: "GitHub repositories, issues, branches & PR tools",
    category: "mcp",
    icon: Code2,
  },
  {
    id: "puppeteer",
    name: "puppeteer",
    insertText: "@puppeteer",
    description: "Headless browser automation & live screenshots",
    category: "mcp",
    icon: Eye,
  },
];

function FloatingOptionRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  badge,
  active,
  destructive,
  onClick,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  active?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  const finalIconColor = destructive
    ? COLORS.destructive
    : iconColor || (active ? COLORS.primary : COLORS.foreground);

  const finalIconBg = destructive
    ? "rgba(231, 0, 11, 0.08)"
    : iconBg || (active ? "rgba(66, 64, 225, 0.12)" : COLORS.secondary);

  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        active && styles.optionRowActive,
        destructive && styles.optionRowDestructive,
      ]}
      onPress={onClick}
      activeOpacity={0.65}
    >
      {Icon && (
        <View style={[styles.optionIconBox, { backgroundColor: finalIconBg }]}>
          <Icon size={16} color={finalIconColor} />
        </View>
      )}
      <View style={styles.optionContent}>
        <View style={styles.optionTitleRow}>
          <Text
            style={[
              styles.optionTitle,
              active && styles.optionTitleActive,
              destructive && styles.optionTitleDestructive,
              font("semibold"),
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge && (
            <View style={styles.optionBadge}>
              <Text style={[styles.optionBadgeText, font("medium")]}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={[styles.optionSubtitle, font("regular")]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {active ? (
        <Check size={16} color={COLORS.primary} />
      ) : (
        <ChevronRight size={14} color={COLORS.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function FloatingPopupModal({
  open,
  title,
  onBack,
  onClose,
  searchQuery,
  onSearchChange,
  children,
}: {
  open: boolean;
  title: string;
  onBack?: () => void;
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.bottomSheetCard}>
              <View style={styles.sheetHandleBar} />

              <View style={styles.popupHeader}>
                {onBack ? (
                  <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={onBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={16} color={COLORS.foreground} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 28 }} />
                )}
                <Text style={[styles.popupTitle, font("bold")]} numberOfLines={1}>
                  {title}
                </Text>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <X size={15} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              {onSearchChange !== undefined && (
                <View style={styles.searchBar}>
                  <Search size={14} color={COLORS.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, font("regular")]}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    placeholder="Search…"
                    placeholderTextColor={COLORS.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery ? (
                    <TouchableOpacity
                      onPress={() => onSearchChange("")}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={13} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <ScrollView
                style={styles.popupScroll}
                contentContainerStyle={styles.popupScrollInner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export const Composer = forwardRef<TextInput, Props>(
  (
    {
      value,
      onChange,
      onSubmit,
      onStop,
      onResume,
      onClear,
      status,
      hasQueued = false,
      queuedCount = 0,
    },
    ref
  ) => {
    const isLive = status === "submitted" || status === "streaming";
    const isStopping = status === "stopping";
    const busy = isLive || isStopping;
    const navigation = useNavigation<any>();
    const {
      rpc,
      modelId,
      setModelId,
      effort,
      setEffort,
      sandbox,
      setSandbox,
      setActiveSessionId,
      workingCwd,
    } = useAva();
    const { data: models = [] } = useModels();
    const { data: mcpServers = [] } = useMcpServers();
    const { data: workspaceFiles = [] } = useDirectory(workingCwd || "/");

    const [panel, setPanel] = useState<Panel>(null);
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [attachments, setAttachments] = useState<AttachedItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Autocomplete State for / and @
    const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
    const [showSlashPopup, setShowSlashPopup] = useState(false);
    const [showMentionPopup, setShowMentionPopup] = useState(false);
    const [slashQuery, setSlashQuery] = useState("");
    const [mentionQuery, setMentionQuery] = useState("");

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const recordingRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Detect / and @ triggers on text change
    useEffect(() => {
      const cursor = selection.start;
      const textBeforeCursor = value.slice(0, cursor);

      // Check Slash Command trigger (start of line or starts with /)
      const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
      if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || textBeforeCursor[lastSlashIndex - 1] === "\n" || textBeforeCursor[lastSlashIndex - 1] === " ")) {
        const query = textBeforeCursor.slice(lastSlashIndex + 1);
        if (!query.includes(" ")) {
          setSlashQuery(query.toLowerCase());
          setShowSlashPopup(true);
          setShowMentionPopup(false);
          return;
        }
      }
      setShowSlashPopup(false);

      // Check @ Mention trigger
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === " " || textBeforeCursor[lastAtIndex - 1] === "\n")) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(" ")) {
          setMentionQuery(query.toLowerCase());
          setShowMentionPopup(true);
          setShowSlashPopup(false);
          return;
        }
      }
      setShowMentionPopup(false);
    }, [value, selection]);

    useEffect(() => {
      let timer: any = null;
      let pulseLoop: any = null;
      if (isRecording) {
        setRecordDuration(0);
        timer = setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000);

        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
        pulseLoop.start();
      } else {
        pulseAnim.setValue(1);
      }
      return () => {
        if (timer) clearInterval(timer);
        if (pulseLoop) pulseLoop.stop();
      };
    }, [isRecording, pulseAnim]);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60)
        .toString()
        .padStart(2, "0");
      const s = (secs % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    const startRecording = async () => {
      try {
        const ExpoAudio = getAudioModule();
        if (ExpoAudio) {
          const { status: perm } = await ExpoAudio.requestPermissionsAsync();
          if (perm !== "granted") {
            Alert.alert(
              "Microphone Permission",
              "Microphone access is required to record voice messages for AvA."
            );
            return;
          }

          await ExpoAudio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const recording = new ExpoAudio.Recording();
          await recording.prepareToRecordAsync(
            ExpoAudio.RecordingOptionsPresets?.HIGH_QUALITY || {}
          );
          await recording.startAsync();
          recordingRef.current = recording;
        }
        setIsRecording(true);
      } catch (err: any) {
        setIsRecording(true);
      }
    };

    const stopRecording = async () => {
      setIsRecording(false);
      const curDuration = recordDuration;

      if (!recordingRef.current) {
        const fileName = `voice_note_${Date.now()}.m4a`;
        const item: AttachedItem = {
          id: `${Date.now()}_voice`,
          name: `Voice Note (${formatTime(curDuration)})`,
          remotePath: `/root/shared-media/${fileName}`,
          kind: "audio",
        };
        setAttachments((prev) => [...prev, item]);
        return;
      }

      try {
        setUploading(true);
        const recording = recordingRef.current;
        recordingRef.current = null;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri) {
          const fileName = `voice_${Date.now()}.m4a`;
          const localFile = new File(uri);
          const base64 = await localFile.base64();
          const cleanName = `Voice Note (${formatTime(curDuration)})`;
          const remotePath = `/root/shared-media/${fileName}`;
          if (rpc && rpc.status === "online") {
            try {
              await rpc.call("fs/writeFile", {
                path: remotePath,
                dataBase64: base64,
              });
            } catch (rpcErr) {
              console.warn("Could not save voice to server:", rpcErr);
            }
          }
          const item: AttachedItem = {
            id: `${Date.now()}_voice`,
            name: cleanName,
            uri,
            remotePath,
            kind: "audio",
          };
          setAttachments((prev) => [...prev, item]);
        }
      } catch (err: any) {
        const fileName = `voice_note_${Date.now()}.m4a`;
        const item: AttachedItem = {
          id: `${Date.now()}_voice`,
          name: `Voice Note (${formatTime(curDuration)})`,
          remotePath: `/root/shared-media/${fileName}`,
          kind: "audio",
        };
        setAttachments((prev) => [...prev, item]);
      } finally {
        setUploading(false);
      }
    };

    const cancelRecording = async () => {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }
      setIsRecording(false);
      setRecordDuration(0);
    };

    const toggleVoiceInput = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    const model =
      models.find((m) => m.id === modelId) ?? models.find((m) => m.isDefault);
    const sandboxOpt =
      SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[2];

    const close = () => {
      setPanel(null);
      setSearchQuery("");
    };

    const handleMediaSelect = (media: SelectedMedia) => {
      const item: AttachedItem = {
        id: media.id,
        name: media.name,
        uri: media.uri,
        remotePath: media.remotePath,
        kind: media.kind,
      };
      setAttachments((prev) => [...prev, item]);
    };

    const removeAttachment = (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    const handleSend = () => {
      if (isStopping) return;
      if (busy && !value.trim() && attachments.length === 0) return onStop();
      let promptText = value.trim();
      if (attachments.length > 0) {
        const fileLines = attachments
          .map((a) => `- ${a.name} (${a.remotePath || a.uri || "attached"})`)
          .join("\n");
        promptText = promptText
          ? `[Attached Files:\n${fileLines}]\n\n${promptText}`
          : `[Attached Files:\n${fileLines}]\nPlease inspect the attached files.`;
      }
      if (promptText) {
        onSubmit(promptText);
        setAttachments([]);
      }
    };

    // ── Slash Command Handling ──
    const filteredSlashCommands = useMemo(() => {
      if (!slashQuery) return BUILTIN_SLASH_COMMANDS;
      return BUILTIN_SLASH_COMMANDS.filter(
        (c) =>
          c.command.includes(slashQuery) ||
          c.label.includes(slashQuery) ||
          c.description.toLowerCase().includes(slashQuery)
      );
    }, [slashQuery]);

    const handleSelectSlashCommand = (cmd: SlashCommandItem) => {
      setShowSlashPopup(false);

      if (cmd.action === "panel" && cmd.target === "model") {
        setPanel("model");
        onChange("");
        return;
      }
      if (cmd.action === "panel" && cmd.target === "sandbox") {
        setPanel("sandbox");
        onChange("");
        return;
      }
      if (cmd.action === "navigate") {
        if (cmd.target === "Files") navigation.navigate("Files");
        else if (cmd.target === "Terminal") navigation.navigate("Terminal");
        else if (cmd.target === "Mcp") navigation.navigate("Mcp");
        onChange("");
        return;
      }
      if (cmd.action === "direct") {
        if (cmd.target === "clear") {
          onClear();
          onChange("");
          return;
        }
        if (cmd.target === "new") {
          setActiveSessionId(null);
          navigation.navigate("Chat");
          onChange("");
          return;
        }
        if (cmd.target === "stop") {
          onStop();
          onChange("");
          return;
        }
      }

      // Default: replace slash query with chosen command
      const cursor = selection.start;
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const lastSlash = before.lastIndexOf("/");
      if (lastSlash !== -1) {
        const newText = before.slice(0, lastSlash) + cmd.label + " " + after;
        onChange(newText);
      } else {
        onChange(cmd.label + " ");
      }
    };

    // ── Mention Handling ──
    const allMentions = useMemo<MentionItem[]>(() => {
      const fileMentions: MentionItem[] = workspaceFiles.slice(0, 30).map((f) => ({
        id: `file_${f.path}`,
        name: f.name,
        insertText: `@${f.name}`,
        description: f.path,
        category: f.isDirectory ? "folder" : "file",
        icon: f.isDirectory ? Folder : FileCode,
      }));

      const mcpMentions: MentionItem[] = mcpServers.map((s) => ({
        id: `mcp_${s.name}`,
        name: s.name,
        insertText: `@${s.name}`,
        description: `MCP Server (${s.tools?.length || 0} tools)`,
        category: "mcp",
        icon: Plug,
      }));

      return [...STATIC_CONTEXT_MENTIONS, ...fileMentions, ...mcpMentions];
    }, [workspaceFiles, mcpServers]);

    const filteredMentions = useMemo(() => {
      if (!mentionQuery) return allMentions;
      return allMentions.filter(
        (m) =>
          m.name.toLowerCase().includes(mentionQuery) ||
          m.insertText.toLowerCase().includes(mentionQuery) ||
          m.description.toLowerCase().includes(mentionQuery)
      );
    }, [allMentions, mentionQuery]);

    const handleSelectMention = (item: MentionItem) => {
      setShowMentionPopup(false);
      const cursor = selection.start;
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const lastAt = before.lastIndexOf("@");
      if (lastAt !== -1) {
        const newText = before.slice(0, lastAt) + item.insertText + " " + after;
        onChange(newText);
      } else {
        onChange((value ? value + " " : "") + item.insertText + " ");
      }
    };

    // Filter models
    const filteredModels = models.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description &&
          m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const hasText = Boolean(value.trim() || attachments.length > 0);

    return (
      <View style={styles.container}>
        {/* Floating Top Bar: Model pill & Quick Triggers */}
        <View style={styles.topPillRow}>
          <TouchableOpacity
            style={styles.floatingPill}
            onPress={() => setPanel("model")}
            activeOpacity={0.8}
          >
            <Text style={[styles.floatingPillText, font("semibold")]} numberOfLines={1}>
              {model?.name ?? "Model"} · {effort}
            </Text>
            <ChevronDown size={11} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Floating Slash Commands Autocomplete Popover ── */}
        {showSlashPopup && filteredSlashCommands.length > 0 && (
          <View style={styles.autocompletePopover}>
            <View style={styles.autocompleteHeader}>
              <Slash size={13} color={COLORS.primary} />
              <Text style={[styles.autocompleteTitle, font("semibold")]}>Slash Commands</Text>
              <TouchableOpacity
                onPress={() => setShowSlashPopup(false)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ marginLeft: "auto" }}
              >
                <X size={12} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.autocompleteScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredSlashCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <TouchableOpacity
                    key={cmd.command}
                    style={styles.autocompleteItem}
                    onPress={() => handleSelectSlashCommand(cmd)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.autocompleteIconBox}>
                      <Icon size={14} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.autocompleteItemTitle, mono("bold")]}>{cmd.label}</Text>
                        <View style={styles.catBadge}>
                          <Text style={[styles.catBadgeText, font("medium")]}>{cmd.category}</Text>
                        </View>
                      </View>
                      <Text style={[styles.autocompleteItemSub, font("regular")]} numberOfLines={1}>
                        {cmd.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Floating @ Mention Autocomplete Popover ── */}
        {showMentionPopup && filteredMentions.length > 0 && (
          <View style={styles.autocompletePopover}>
            <View style={styles.autocompleteHeader}>
              <AtSign size={13} color={COLORS.primary} />
              <Text style={[styles.autocompleteTitle, font("semibold")]}>Mention Context & Files</Text>
              <TouchableOpacity
                onPress={() => setShowMentionPopup(false)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ marginLeft: "auto" }}
              >
                <X size={12} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.autocompleteScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredMentions.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.autocompleteItem}
                    onPress={() => handleSelectMention(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.autocompleteIconBox}>
                      <Icon size={14} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.autocompleteItemTitle, mono("bold")]}>{item.insertText}</Text>
                        <View style={styles.catBadge}>
                          <Text style={[styles.catBadgeText, font("medium")]}>{item.category}</Text>
                        </View>
                      </View>
                      <Text style={[styles.autocompleteItemSub, font("regular")]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Glassy Input Surface Card */}
        <View style={styles.composerCard}>
          {/* Attached files preview chips */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentRow}
            >
              {attachments.map((att) => (
                <View key={att.id} style={styles.attachedItemWrapper}>
                  {att.kind === "image" && att.uri ? (
                    <View style={styles.imageThumbnailBox}>
                      <RNImage
                        source={{ uri: att.uri }}
                        style={styles.imageThumbnail}
                        resizeMode="cover"
                      />
                    </View>
                  ) : att.kind === "audio" ? (
                    <View style={styles.audioChipBox}>
                      <Mic size={13} color={COLORS.primary} />
                      <Text style={[styles.fileChipText, font("medium")]} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : att.kind === "video" ? (
                    <View style={styles.fileChipBox}>
                      <FileVideo size={13} color="#a855f7" />
                      <Text style={[styles.fileChipText, font("medium")]} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : att.kind === "code" ? (
                    <View style={styles.fileChipBox}>
                      <FileCode size={13} color="#3b82f6" />
                      <Text style={[styles.fileChipText, font("medium")]} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.fileChipBox}>
                      <FileText size={13} color={COLORS.primary} />
                      <Text style={[styles.fileChipText, font("medium")]} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeAttBtn}
                    onPress={() => removeAttachment(att.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={11} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {uploading && (
            <View style={styles.uploadingNotice}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[styles.uploadingText, font("regular")]}>Transferring asset to VPS…</Text>
            </View>
          )}

          {/* Active Voice Recording Live Banner */}
          {isRecording ? (
            <View style={styles.liveRecordingBar}>
              <View style={styles.liveRecordingLeft}>
                <Animated.View
                  style={[
                    styles.recordingDotBig,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Text style={[styles.liveRecordingTimer, font("semibold")]}>
                  {formatTime(recordDuration)} · Recording voice note…
                </Text>
              </View>
              <View style={styles.liveRecordingActions}>
                <TouchableOpacity
                  style={styles.cancelRecBtn}
                  onPress={cancelRecording}
                >
                  <X size={15} color={COLORS.destructive} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stopRecBtn}
                  onPress={stopRecording}
                >
                  <Check size={15} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Multi-line Text Input */
            <TextInput
              ref={ref}
              style={[styles.input, font("regular")]}
              placeholder={
                isLive
                  ? "Type follow-up to queue or steer…"
                  : "Type a message, /command, or @mention…"
              }
              placeholderTextColor={COLORS.mutedForeground}
              value={value}
              onChangeText={onChange}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              multiline
              autoCapitalize="sentences"
            />
          )}

          {/* Bottom Bar: Action buttons */}
          <View style={styles.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsRow}
            >
              {/* + Button: Media Selector Modal */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setMediaModalOpen(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={COLORS.foreground} />
              </TouchableOpacity>

              {/* Quick / Slash Commands Button */}
              <TouchableOpacity
                style={[styles.quickTriggerChip, showSlashPopup && styles.quickTriggerChipActive]}
                onPress={() => {
                  if (showSlashPopup) {
                    setShowSlashPopup(false);
                  } else {
                    onChange(value ? value + " /" : "/");
                    setShowSlashPopup(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Slash size={13} color={showSlashPopup ? COLORS.primary : COLORS.foreground} />
                <Text style={[styles.quickTriggerText, font("semibold")]}>Commands</Text>
              </TouchableOpacity>

              {/* Quick @ Mention Button */}
              <TouchableOpacity
                style={[styles.quickTriggerChip, showMentionPopup && styles.quickTriggerChipActive]}
                onPress={() => {
                  if (showMentionPopup) {
                    setShowMentionPopup(false);
                  } else {
                    onChange(value ? value + " @" : "@");
                    setShowMentionPopup(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <AtSign size={13} color={showMentionPopup ? COLORS.primary : COLORS.foreground} />
                <Text style={[styles.quickTriggerText, font("semibold")]}>Mention</Text>
              </TouchableOpacity>

              {/* Tools Pill Button */}
              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("tools")}
                activeOpacity={0.7}
              >
                <Cpu size={13} color={COLORS.foreground} />
                <Text style={[styles.toolPillText, font("medium")]}>Tools</Text>
                <ChevronDown size={11} color={COLORS.mutedForeground} />
              </TouchableOpacity>

              {/* Sandbox Pill Button */}
              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("sandbox")}
                activeOpacity={0.7}
              >
                <ShieldCheck size={13} color={COLORS.foreground} />
                <Text style={[styles.toolPillText, font("medium")]}>{sandboxOpt.label}</Text>
                <ChevronDown size={11} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.submitBtnWrapper}>
              {/* Voice Note Mic Button */}
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
                onPress={toggleVoiceInput}
                activeOpacity={0.7}
              >
                <Mic
                  size={16}
                  color={
                    isRecording ? COLORS.destructive : COLORS.mutedForeground
                  }
                />
              </TouchableOpacity>

              {/* If agent is busy, provide Stop/Pause button */}
              {busy ? (
                <View style={styles.busyActionGroup}>
                  <TouchableOpacity
                    style={[styles.stopButton, isStopping && { opacity: 0.6 }]}
                    onPress={onStop}
                    disabled={isStopping}
                    activeOpacity={0.7}
                  >
                    {isStopping ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Square size={13} color="#FFF" fill="#FFF" />
                    )}
                  </TouchableOpacity>

                  {/* If user is typing while agent is busy, allow queueing/steering */}
                  {hasText && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleSend}
                      activeOpacity={0.7}
                    >
                      <ArrowUp size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Idle state */
                <View style={styles.busyActionGroup}>
                  {hasQueued && !hasText && onResume ? (
                    <TouchableOpacity
                      style={styles.resumeButton}
                      onPress={onResume}
                      activeOpacity={0.7}
                    >
                      <Play size={13} color="#FFF" fill="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        !hasText && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSend}
                      disabled={!hasText}
                      activeOpacity={0.7}
                    >
                      <ArrowUp size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 1. Media Selector Modal (+ Button) */}
        <MediaSelectorModal
          open={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelect={handleMediaSelect}
          serverDirectory="/root/shared-media"
        />

        {/* 2. Tools Menu */}
        <FloatingPopupModal
          open={panel === "tools"}
          title="Prompt actions & tools"
          onClose={close}
        >
          <Text style={[styles.sectionHeader, font("bold")]}>MODEL & REASONING</Text>
          <FloatingOptionRow
            icon={Cpu}
            iconColor={COLORS.primary}
            iconBg="rgba(66, 64, 225, 0.08)"
            title="Model & reasoning depth"
            subtitle="Switch LLM models & thinking depth"
            badge={`${model?.name || "Model"} · ${effort}`}
            onClick={() => setPanel("model")}
          />
          <FloatingOptionRow
            icon={ShieldCheck}
            iconColor={COLORS.primary}
            iconBg="rgba(66, 64, 225, 0.08)"
            title="Sandbox permission mode"
            subtitle="Write & execution boundaries"
            badge={sandboxOpt.label}
            onClick={() => setPanel("sandbox")}
          />

          <Text style={[styles.sectionHeader, font("bold")]}>WORKSPACE TOOLS</Text>
          <FloatingOptionRow
            icon={PlusCircle}
            iconColor={COLORS.foreground}
            iconBg={COLORS.secondary}
            title="New session"
            subtitle="Start fresh conversation"
            onClick={() => {
              setActiveSessionId(null);
              navigation.navigate("Chat");
              close();
            }}
          />
          <FloatingOptionRow
            icon={FolderOpen}
            iconColor={COLORS.foreground}
            iconBg={COLORS.secondary}
            title="Workspace files explorer"
            subtitle="Browse files & open editor"
            onClick={() => {
              close();
              navigation.navigate("Files");
            }}
          />
          <FloatingOptionRow
            icon={TerminalSquare}
            iconColor={COLORS.foreground}
            iconBg={COLORS.secondary}
            title="Interactive terminal"
            subtitle="Full interactive bash shell"
            onClick={() => {
              close();
              navigation.navigate("Terminal");
            }}
          />
          <FloatingOptionRow
            icon={Plug}
            iconColor={COLORS.foreground}
            iconBg={COLORS.secondary}
            title="MCP tools & integrations"
            subtitle="Inspect MCP servers & tools"
            onClick={() => {
              close();
              navigation.navigate("Mcp");
            }}
          />
          <FloatingOptionRow
            icon={Trash2}
            destructive
            title="Clear chat view"
            subtitle="Clear transcript from screen"
            onClick={() => {
              onClear();
              close();
            }}
          />
        </FloatingPopupModal>

        {/* 3. Model & Reasoning Bottom Modal */}
        <FloatingPopupModal
          open={panel === "model"}
          title="Model & reasoning"
          onClose={close}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <Text style={[styles.sectionHeader, font("bold")]}>THINKING DEPTH</Text>
          <View style={styles.effortRow}>
            {REASONING_EFFORTS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.effortBtn,
                  effort === e && styles.effortBtnActive,
                ]}
                onPress={() => setEffort(e)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.effortBtnText,
                    effort === e && styles.effortBtnTextActive,
                    font("medium"),
                  ]}
                >
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionHeader, font("bold")]}>
            MODELS ({filteredModels.length})
          </Text>
          {filteredModels.map((m) => (
            <FloatingOptionRow
              key={m.id}
              icon={Bot}
              title={m.name + (m.isDefault ? " (default)" : "")}
              subtitle={m.description ?? m.id}
              active={model?.id === m.id}
              onClick={() => {
                setModelId(m.id);
                close();
              }}
            />
          ))}
        </FloatingPopupModal>

        {/* 4. Sandbox Permission Bottom Modal */}
        <FloatingPopupModal
          open={panel === "sandbox"}
          title="Sandbox permission"
          onClose={close}
        >
          {SANDBOX_MODES.map((s) => (
            <FloatingOptionRow
              key={s.id}
              icon={ShieldCheck}
              title={s.label}
              subtitle={s.description}
              active={sandbox === s.id}
              onClick={() => {
                setSandbox(s.id);
                close();
              }}
            />
          ))}
          <Text style={[styles.sandboxHintText, font("regular")]}>
            Applies to newly started sessions.
          </Text>
        </FloatingPopupModal>
      </View>
    );
  }
);

Composer.displayName = "Composer";

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  topPillRow: {
    position: "absolute",
    top: -12,
    left: 14,
    right: 14,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  floatingPill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  floatingPillText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    maxWidth: 160,
  },

  // Autocomplete Popover
  autocompletePopover: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: 260,
    overflow: "hidden",
    zIndex: 999,
  },
  autocompleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  autocompleteTitle: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  autocompleteScroll: {
    maxHeight: 215,
  },
  autocompleteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  autocompleteIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  autocompleteItemTitle: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  autocompleteItemSub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  catBadgeText: {
    fontSize: 9.5,
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
  },

  composerCard: {
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.98)",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  attachedItemWrapper: {
    position: "relative",
  },
  imageThumbnailBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
  },
  fileChipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.2)",
    maxWidth: 160,
  },
  audioChipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.2)",
    maxWidth: 160,
  },
  fileChipText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  removeAttBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  input: {
    minHeight: 44,
    maxHeight: 140,
    fontSize: 14.5,
    color: COLORS.foreground,
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlignVertical: "top",
  },
  liveRecordingBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(231, 0, 11, 0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveRecordingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  recordingDotBig: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.destructive,
  },
  liveRecordingTimer: {
    fontSize: 13,
    color: COLORS.destructive,
  },
  liveRecordingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelRecBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(231, 0, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopRecBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  quickTriggerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickTriggerChipActive: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderColor: COLORS.primary,
  },
  quickTriggerText: {
    fontSize: 11.5,
    color: COLORS.foreground,
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  toolPillText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  submitBtnWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  micBtnActive: {
    backgroundColor: "rgba(231, 0, 11, 0.12)",
  },
  busyActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.glassBorder,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 10,
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    marginBottom: 8,
  },
  popupTitle: {
    fontSize: 15,
    color: COLORS.foreground,
    flex: 1,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  headerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  popupScroll: {
    maxHeight: 340,
  },
  popupScrollInner: {
    paddingBottom: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionRowActive: {
    backgroundColor: "rgba(66, 64, 225, 0.08)",
  },
  optionRowDestructive: {
    backgroundColor: "rgba(231, 0, 11, 0.04)",
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionTitle: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  optionTitleActive: {
    color: COLORS.primary,
  },
  optionTitleDestructive: {
    color: COLORS.destructive,
  },
  optionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  optionBadgeText: {
    fontSize: 10,
    color: COLORS.foreground,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 1.5,
  },
  sectionHeader: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  effortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  effortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  effortBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  effortBtnText: {
    fontSize: 12,
    color: COLORS.foreground,
    textTransform: "capitalize",
  },
  effortBtnTextActive: {
    color: COLORS.primaryForeground,
  },
  sandboxHintText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    paddingHorizontal: 8,
    marginTop: 6,
  },
});
