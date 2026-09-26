import React, { forwardRef, useEffect, useRef, useState } from "react";
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
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileAudio,
  FileCode,
  FileText,
  FileVideo,
  FolderOpen,
  Image as ImageIcon,
  Mic,
  Plug,
  Plus,
  PlusCircle,
  Search,
  Server,
  ShieldCheck,
  Square,
  Terminal as TerminalSquare,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { REASONING_EFFORTS, SANDBOX_MODES } from "@/config/models";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";
import type { ChatStatus } from "@/state/use-chat";
import { MediaSelectorModal, type SelectedMedia } from "@/components/media/MediaSelectorModal";
import { COLORS } from "@/theme/colors";

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
  onClear: () => void;
  status: ChatStatus;
}

export interface AttachedItem {
  id: string;
  name: string;
  uri?: string;
  remotePath?: string;
  kind: "image" | "file" | "audio" | "video" | "code" | "document";
}

type Panel = "tools" | "model" | "sandbox" | null;

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
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge && (
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={styles.optionSubtitle} numberOfLines={1}>
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
              {/* Sheet Top Handle Bar */}
              <View style={styles.sheetHandleBar} />

              {/* Header */}
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
                <Text style={styles.popupTitle} numberOfLines={1}>
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

              {/* Optional Search Bar */}
              {onSearchChange !== undefined && (
                <View style={styles.searchBar}>
                  <Search size={14} color={COLORS.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
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
  ({ value, onChange, onSubmit, onStop, onClear, status }, ref) => {
    const busy = status === "submitted" || status === "streaming" || status === "stopping";
    const isStopping = status === "stopping";
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
    } = useAva();
    const { data: models = [] } = useModels();

    const [panel, setPanel] = useState<Panel>(null);
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [attachments, setAttachments] = useState<AttachedItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Real Voice Recording with expo-av (with graceful fallback)
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const recordingRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

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

    // Filter models
    const filteredModels = models.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <View style={styles.container}>
        {/* Floating Model & Reasoning Depth Badge */}
        <TouchableOpacity
          style={styles.floatingPill}
          onPress={() => setPanel("model")}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingPillText} numberOfLines={1}>
            {model?.name ?? "Model"} · {effort}
          </Text>
          <ChevronDown size={11} color={COLORS.mutedForeground} />
        </TouchableOpacity>

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
                      <Text style={styles.fileChipText} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : att.kind === "video" ? (
                    <View style={styles.fileChipBox}>
                      <FileVideo size={13} color="#a855f7" />
                      <Text style={styles.fileChipText} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : att.kind === "code" ? (
                    <View style={styles.fileChipBox}>
                      <FileCode size={13} color="#3b82f6" />
                      <Text style={styles.fileChipText} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.fileChipBox}>
                      <FileText size={13} color={COLORS.primary} />
                      <Text style={styles.fileChipText} numberOfLines={1}>
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
              <Text style={styles.uploadingText}>Transferring asset to VPS…</Text>
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
                <Text style={styles.liveRecordingTimer}>
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
              style={styles.input}
              placeholder="Ask anything or request changes…"
              placeholderTextColor={COLORS.mutedForeground}
              value={value}
              onChangeText={onChange}
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

              {/* Tools Pill Button */}
              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("tools")}
                activeOpacity={0.7}
              >
                <Cpu size={13} color={COLORS.foreground} />
                <Text style={styles.toolPillText}>Tools</Text>
                <ChevronDown size={11} color={COLORS.mutedForeground} />
              </TouchableOpacity>

              {/* Sandbox Pill Button */}
              <TouchableOpacity
                style={styles.toolPill}
                onPress={() => setPanel("sandbox")}
                activeOpacity={0.7}
              >
                <ShieldCheck size={13} color={COLORS.foreground} />
                <Text style={styles.toolPillText}>{sandboxOpt.label}</Text>
                <ChevronDown size={11} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.submitBtnWrapper}>
              {/* Voice Note Mic Button */}
              <TouchableOpacity
                style={[
                  styles.micBtn,
                  isRecording && styles.micBtnActive,
                ]}
                onPress={toggleVoiceInput}
                activeOpacity={0.7}
              >
                <Mic
                  size={16}
                  color={isRecording ? COLORS.destructive : COLORS.mutedForeground}
                />
              </TouchableOpacity>

              {busy && !value.trim() && attachments.length === 0 ? (
                <TouchableOpacity
                  style={[styles.stopButton, isStopping && { opacity: 0.6 }]}
                  onPress={onStop}
                  disabled={isStopping}
                  activeOpacity={0.7}
                >
                  {isStopping ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Square size={14} color="#FFF" fill="#FFF" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !value.trim() && attachments.length === 0 && !busy && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!value.trim() && attachments.length === 0 && !busy}
                  activeOpacity={0.7}
                >
                  <ArrowUp size={16} color="#FFF" />
                </TouchableOpacity>
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

        {/* 2. Tools Menu (Pruned & Cleaned with Unified Design Tokens) */}
        <FloatingPopupModal
          open={panel === "tools"}
          title="Prompt actions & tools"
          onClose={close}
        >
          <Text style={styles.sectionHeader}>MODEL & REASONING</Text>
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

          <Text style={styles.sectionHeader}>WORKSPACE TOOLS</Text>
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
          <Text style={styles.sectionHeader}>THINKING DEPTH</Text>
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
                  ]}
                >
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>
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
          <Text style={styles.sandboxHintText}>Applies to newly started sessions.</Text>
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
  floatingPill: {
    position: "absolute",
    top: -10,
    right: 20,
    zIndex: 10,
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
    fontWeight: "600",
    color: COLORS.mutedForeground,
    maxWidth: 160,
  },
  composerCard: {
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 12,
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
    fontWeight: "500",
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
    fontWeight: "600",
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
    fontWeight: "500",
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
    fontWeight: "700",
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
    fontWeight: "600",
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
    fontWeight: "600",
    color: COLORS.foreground,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 1.5,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: "700",
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
    fontWeight: "500",
    color: COLORS.foreground,
    textTransform: "capitalize",
  },
  effortBtnTextActive: {
    color: COLORS.primaryForeground,
    fontWeight: "600",
  },
  sandboxHintText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    paddingHorizontal: 8,
    marginTop: 6,
  },
});
