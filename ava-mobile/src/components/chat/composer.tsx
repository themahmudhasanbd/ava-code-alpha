import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { File } from "expo-file-system";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileCode,
  FileText,
  FileVideo,
  FolderOpen,
  Mic,
  Plus,
  PlusCircle,
  Search,
  ShieldCheck,
  Square,
  Terminal as TerminalSquare,
  Trash2,
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
import { joinPath } from "@/core/api/files";
import {
  filterSlashCommands,
  type SlashCommandItem,
} from "./slash-commands";
import {
  buildFileMentions,
  parseMentionQuery,
  STATIC_CONTEXT_MENTIONS,
  type MentionItem,
} from "./mentions";
import { SlashCommandPopup } from "./SlashCommandPopup";
import { MentionPopup } from "./MentionPopup";

function getAudioModule(): any {
  try {
    const { NativeModules } = require("react-native");
    const hasNative =
      Boolean(NativeModules?.ExponentAV) ||
      Boolean((globalThis as any)?.expo?.modules?.ExponentAV);
    if (!hasNative) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-av")?.Audio ?? null;
  } catch {
    return null;
  }
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (text: string, attachments?: AttachedItem[]) => void;
  onStop: () => void;
  onClear: () => void;
  status?: ChatStatus | string;
  chatStatus?: ChatStatus | string;
  navigation?: any;
}

export interface AttachedItem {
  id: string;
  name: string;
  remotePath: string;
  kind: "image" | "video" | "audio" | "code" | "file";
  size?: number;
}

type Panel = "tools" | "model" | "sandbox" | null;

function FloatingOptionRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  active,
  destructive,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  destructive?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        active && styles.optionRowActive,
        destructive && styles.optionRowDestructive,
      ]}
      onPress={onClick}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.optionIconBox,
          active && styles.optionIconBoxActive,
          destructive && styles.optionIconBoxDestructive,
        ]}
      >
        <Icon
          size={16}
          color={
            destructive
              ? COLORS.destructive
              : active
              ? COLORS.primary
              : iconColor || COLORS.foreground
          }
        />
      </View>
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
        <ChevronRight size={15} color={COLORS.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function FloatingPopupModal({
  open,
  title,
  onClose,
  onBack,
  children,
  searchQuery,
  onSearchChange,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
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
                    style={styles.popupBackBtn}
                    onPress={onBack}
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
                  style={styles.popupCloseBtn}
                  onPress={onClose}
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
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={13} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <ScrollView
                style={styles.popupContentScroll}
                contentContainerStyle={styles.popupContent}
                showsVerticalScrollIndicator={false}
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
  function Composer(
    {
      value,
      onChange,
      onSubmit,
      onStop,
      onClear,
      status,
      chatStatus,
      navigation,
    },
    ref
  ) {
    const effectiveStatus = (status || chatStatus || "idle") as ChatStatus;
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
    const [mentionRawQuery, setMentionRawQuery] = useState("");

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
      if (
        lastSlashIndex !== -1 &&
        (lastSlashIndex === 0 ||
          textBeforeCursor[lastSlashIndex - 1] === "\n" ||
          textBeforeCursor[lastSlashIndex - 1] === " ")
      ) {
        const query = textBeforeCursor.slice(lastSlashIndex + 1);
        if (!query.includes(" ")) {
          setSlashQuery(query);
          setShowSlashPopup(true);
          setShowMentionPopup(false);
          return;
        }
      }
      setShowSlashPopup(false);

      // Check @ Mention trigger
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (
        lastAtIndex !== -1 &&
        (lastAtIndex === 0 ||
          textBeforeCursor[lastAtIndex - 1] === " " ||
          textBeforeCursor[lastAtIndex - 1] === "\n")
      ) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(" ")) {
          setMentionRawQuery(query);
          setShowMentionPopup(true);
          setShowSlashPopup(false);
          return;
        }
      }
      setShowMentionPopup(false);
    }, [value, selection]);

    // Parse current mention query for subdirectories
    const parsedMention = useMemo(() => {
      return parseMentionQuery(mentionRawQuery);
    }, [mentionRawQuery]);

    // Resolve target directory for file mentions
    const mentionTargetDir = useMemo(() => {
      const baseRoot = workingCwd || "/var/www/ava-code";
      if (!parsedMention.subDir) return baseRoot;
      return joinPath(baseRoot, parsedMention.subDir);
    }, [workingCwd, parsedMention.subDir]);

    // Fetch directory entries for the current target directory
    const { data: directoryEntries = [], isLoading: isDirLoading } = useDirectory(mentionTargetDir);

    // Voice recording timer animation
    useEffect(() => {
      let timer: any = null;
      let pulseLoop: any = null;

      if (isRecording) {
        setRecordDuration(0);
        timer = setInterval(() => setRecordDuration((s) => s + 1), 1000);
        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 600,
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

    const startRecording = async () => {
      try {
        const ExpoAudio = getAudioModule();
        if (ExpoAudio) {
          const { status: perm } = await ExpoAudio.requestPermissionsAsync();
          if (perm === "granted") {
            await ExpoAudio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
            const rec = new ExpoAudio.Recording();
            await rec.prepareToRecordAsync(
              ExpoAudio.RecordingOptionsPresets?.HIGH_QUALITY || {}
            );
            await rec.startAsync();
            recordingRef.current = rec;
          }
        }
        setIsRecording(true);
      } catch {
        setIsRecording(true);
      }
    };

    const stopRecording = async (shouldAttach: boolean) => {
      setIsRecording(false);
      const duration = recordDuration;
      const durationStr = `${Math.floor(duration / 60)
        .toString()
        .padStart(2, "0")}:${(duration % 60).toString().padStart(2, "0")}`;

      if (!shouldAttach) {
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch {}
          recordingRef.current = null;
        }
        return;
      }

      if (recordingRef.current) {
        try {
          setUploading(true);
          const rec = recordingRef.current;
          recordingRef.current = null;
          await rec.stopAndUnloadAsync();
          const uri = rec.getURI();

          if (uri && rpc) {
            const fileName = `voice_${Date.now()}.m4a`;
            const remotePath = `/root/shared-media/${fileName}`;
            const file = new File(uri);
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const dataBase64 = btoa(binary);

            await rpc.call("fs/writeFile", {
              path: remotePath,
              dataBase64,
            });

            setAttachments((prev) => [
              ...prev,
              {
                id: `${Date.now()}_voice`,
                name: `Voice Note (${durationStr})`,
                remotePath,
                kind: "audio",
              },
            ]);
          }
        } catch (e: any) {
          console.warn("Audio save error:", e);
        } finally {
          setUploading(false);
        }
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}_voice`,
            name: `Voice Note (${durationStr})`,
            remotePath: `/root/shared-media/voice_${Date.now()}.m4a`,
            kind: "audio",
          },
        ]);
      }
    };

    const handleSend = () => {
      if (busy) return;
      if (!value.trim() && attachments.length === 0) return;
      setShowSlashPopup(false);
      setShowMentionPopup(false);
      onSubmit(value, attachments);
      setAttachments([]);
    };

    const handleSelectMedia = (media: SelectedMedia) => {
      setAttachments((prev) => {
        const remotePath = media.remotePath || "";
        if (prev.some((a) => a.remotePath === remotePath)) return prev;
        return [
          ...prev,
          {
            id: media.id,
            name: media.name,
            remotePath,
            kind: (media.kind as any) || "file",
            size: media.size,
          },
        ];
      });
    };

    const removeAttachment = (id: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    const close = () => {
      setPanel(null);
      setSearchQuery("");
    };

    // ── Slash Command Handling ──
    const filteredSlashCommands = useMemo(() => {
      return filterSlashCommands(slashQuery);
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
      if (cmd.action === "direct") {
        if (cmd.target === "clear") {
          onClear();
          onChange("");
          return;
        }
        if (cmd.target === "new") {
          setActiveSessionId(null);
          if (navigation) navigation.navigate("Chat");
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

    // ── Mention Suggestions (Files, Folders, MCP, Context) ──
    const mentionItems = useMemo<MentionItem[]>(() => {
      const { subDir, searchPrefix, relativeBase } = parsedMention;

      // Build file & folder mentions from directory entries
      const fileMentions = buildFileMentions(directoryEntries, relativeBase, searchPrefix);

      // If user is searching at root (subDir === ""), include context symbols and MCP tools
      if (!subDir) {
        const q = searchPrefix;
        const matchedContext = STATIC_CONTEXT_MENTIONS.filter(
          (m) => !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
        );

        const mcpMentions: MentionItem[] = mcpServers
          .filter((s) => !q || s.name.toLowerCase().includes(q))
          .map((s) => ({
            id: `mcp_${s.name}`,
            name: s.name,
            insertText: `@${s.name} `,
            description: `MCP Server (${s.tools?.length || 0} tools)`,
            category: "mcp",
            icon: Cpu,
          }));

        return [...fileMentions, ...matchedContext, ...mcpMentions];
      }

      return fileMentions;
    }, [parsedMention, directoryEntries, mcpServers]);

    const handleSelectMention = (item: MentionItem) => {
      const cursor = selection.start;
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const lastAt = before.lastIndexOf("@");

      if (lastAt !== -1) {
        const newText = before.slice(0, lastAt) + item.insertText + after;
        onChange(newText);
      } else {
        onChange((value ? value + " " : "") + item.insertText);
      }

      // If selecting a directory, keep popup open so user can browse into subfiles!
      if (item.isDirectory) {
        setShowMentionPopup(true);
      } else {
        setShowMentionPopup(false);
      }
    };

    // Filter models
    const filteredModels = models.filter(
      (m) =>
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeModel = models.find((m) => m.id === modelId);
    const busy = effectiveStatus === "streaming" || effectiveStatus === "submitted";
    const isLive = effectiveStatus === "streaming";
    const sandboxOpt =
      SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[0];

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
      <View style={styles.container}>
        {/* Floating Top Bar: Model pill */}
        <View style={styles.topPillRow}>
          <TouchableOpacity
            style={styles.floatingPill}
            onPress={() => setPanel("model")}
            activeOpacity={0.8}
          >
            <Text style={[styles.floatingPillText, font("semibold")]} numberOfLines={1}>
              {activeModel?.name ?? modelId ?? "Model"} · {effort}
            </Text>
            <ChevronDown size={11} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Floating Slash Commands Autocomplete Popover */}
        {showSlashPopup && (
          <SlashCommandPopup
            items={filteredSlashCommands}
            onSelect={handleSelectSlashCommand}
            onClose={() => setShowSlashPopup(false)}
          />
        )}

        {/* Floating @ Mention Autocomplete Popover (Files, Folders, MCP) */}
        {showMentionPopup && (
          <MentionPopup
            items={mentionItems}
            currentSubDir={parsedMention.subDir}
            isLoading={isDirLoading}
            onSelect={handleSelectMention}
            onClose={() => setShowMentionPopup(false)}
          />
        )}

        {/* Glassy Input Surface Card */}
        <View style={styles.composerCard}>
          {/* Attached files preview chips */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentsRow}
            >
              {attachments.map((att) => (
                <View key={att.id} style={styles.attChip}>
                  {att.kind === "image" ? (
                    <View style={styles.imageChipBox}>
                      <FileText size={13} color={COLORS.primary} />
                      <Text style={[styles.fileChipText, font("medium")]} numberOfLines={1}>
                        {att.name}
                      </Text>
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
                    onPress={() => removeAttachment(att.id)}
                    style={styles.removeAttBtn}
                  >
                    <X size={11} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Uploading indicator */}
          {uploading && (
            <View style={styles.uploadingNotice}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[styles.uploadingText, font("regular")]}>Transferring asset to VPS…</Text>
            </View>
          )}

          {/* Live Voice Recording Bar */}
          {isRecording ? (
            <View style={styles.liveRecordingBar}>
              <View style={styles.liveRecordingLeft}>
                <Animated.View
                  style={[
                    styles.recordingPulseDot,
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
                  onPress={() => stopRecording(false)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={15} color={COLORS.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.finishRecBtn}
                  onPress={() => stopRecording(true)}
                  activeOpacity={0.7}
                >
                  <Check size={16} color={COLORS.primaryForeground} />
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
                  : "Ask anything or request changes…"
              }
              placeholderTextColor={COLORS.mutedForeground}
              value={value}
              onChangeText={onChange}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              multiline
              autoCapitalize="sentences"
            />
          )}

          {/* Bottom Action Controls Bar */}
          <View style={styles.bottomControlsBar}>
            {/* Left Tools Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bottomLeftScroll}
            >
              {/* Media / Files Button */}
              <TouchableOpacity
                style={styles.plusBtn}
                onPress={() => setMediaModalOpen(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={COLORS.foreground} />
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

              {/* Sandbox Mode Pill */}
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

            {/* Right Action Trigger Buttons */}
            <View style={styles.bottomRightActions}>
              {/* Mic / Voice Recording Button */}
              <TouchableOpacity
                style={[
                  styles.micBtn,
                  isRecording && styles.micBtnActive,
                ]}
                onPress={isRecording ? () => stopRecording(true) : startRecording}
                activeOpacity={0.7}
              >
                <Mic
                  size={16}
                  color={isRecording ? COLORS.primaryForeground : COLORS.foreground}
                />
              </TouchableOpacity>

              {/* If agent is busy, provide Stop/Pause button */}
              {busy ? (
                <View style={styles.busyActionGroup}>
                  <TouchableOpacity
                    style={styles.stopBtn}
                    onPress={onStop}
                    activeOpacity={0.7}
                  >
                    <Square size={13} color={COLORS.destructiveForeground} fill={COLORS.destructiveForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (value.trim().length > 0 || attachments.length > 0) &&
                      styles.sendBtnActive,
                  ]}
                  onPress={handleSend}
                  disabled={!value.trim() && attachments.length === 0}
                  activeOpacity={0.7}
                >
                  <ArrowUp
                    size={17}
                    color={
                      value.trim() || attachments.length > 0
                        ? COLORS.primaryForeground
                        : COLORS.mutedForeground
                    }
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 1. Universal Media Selector Modal */}
        <MediaSelectorModal
          open={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelect={handleSelectMedia}
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
            title="Switch Model"
            subtitle={`${activeModel?.name ?? modelId ?? "Model"} (${effort})`}
            onClick={() => setPanel("model")}
          />
          <FloatingOptionRow
            icon={ShieldCheck}
            iconColor={COLORS.foreground}
            title="Sandbox Mode"
            subtitle={sandboxOpt.label}
            onClick={() => setPanel("sandbox")}
          />

          <Text style={[styles.sectionHeader, font("bold")]}>WORKSPACE TOOLS</Text>
          <FloatingOptionRow
            icon={PlusCircle}
            iconColor={COLORS.foreground}
            title="New Session"
            subtitle="Start a fresh conversation thread"
            onClick={() => {
              close();
              setActiveSessionId(null);
              if (navigation) navigation.navigate("Chat");
            }}
          />
          <FloatingOptionRow
            icon={FolderOpen}
            iconColor={COLORS.foreground}
            title="Browse Files"
            subtitle="Open workspace file explorer"
            onClick={() => {
              close();
              if (navigation) navigation.navigate("Files");
            }}
          />
          <FloatingOptionRow
            icon={TerminalSquare}
            iconColor={COLORS.foreground}
            title="Terminal"
            subtitle="Launch interactive server console"
            onClick={() => {
              close();
              if (navigation) navigation.navigate("Terminal");
            }}
          />

          <Text style={[styles.sectionHeader, font("bold")]}>DANGER ZONE</Text>
          <FloatingOptionRow
            icon={Trash2}
            destructive
            title="Clear Chat"
            subtitle="Reset current transcript"
            onClick={() => {
              close();
              onClear();
            }}
          />
        </FloatingPopupModal>

        {/* 3. Model Picker Modal */}
        <FloatingPopupModal
          open={panel === "model"}
          title="Select Model & Thinking"
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
              title={m.name}
              subtitle={m.description}
              active={modelId === m.id}
              onClick={() => {
                setModelId(m.id);
                close();
              }}
            />
          ))}
        </FloatingPopupModal>

        {/* 4. Sandbox Modal */}
        <FloatingPopupModal
          open={panel === "sandbox"}
          title="Sandbox security mode"
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
    backgroundColor: "transparent",
  },
  topPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  floatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floatingPillText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    maxWidth: 160,
  },

  composerCard: {
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  attChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    maxWidth: 160,
  },
  imageChipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fileChipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  audioChipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fileChipText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  removeAttBtn: {
    padding: 2,
  },
  uploadingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  liveRecordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    minHeight: 46,
  },
  liveRecordingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.destructive,
  },
  liveRecordingTimer: {
    fontSize: 13,
    color: COLORS.destructive,
  },
  liveRecordingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  finishRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.foreground,
    minHeight: 38,
    maxHeight: 120,
    paddingTop: 4,
    paddingBottom: 6,
    textAlignVertical: "top",
  },
  bottomControlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  bottomLeftScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  plusBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toolPillText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  bottomRightActions: {
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
    backgroundColor: COLORS.destructive,
  },
  busyActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.destructive,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  sendBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },

  // Modal Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingHorizontal: 16,
    maxHeight: Dimensions.get("window").height * 0.75,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandleBar: {
    width: 38,
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
    borderBottomColor: COLORS.border,
  },
  popupBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  popupCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  popupTitle: {
    fontSize: 15,
    color: COLORS.foreground,
    flex: 1,
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  popupContentScroll: {
    maxHeight: 380,
  },
  popupContent: {
    paddingTop: 8,
    gap: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  optionRowDestructive: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  optionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconBoxActive: {
    backgroundColor: COLORS.accent,
  },
  optionIconBoxDestructive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
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
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  optionBadgeText: {
    fontSize: 10,
    color: COLORS.foreground,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  effortRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  effortBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingTop: 6,
  },
});
