import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowUp,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Eraser,
  FileCode,
  FolderOpen,
  Globe,
  Loader2,
  Plug,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  SquarePen,
  Terminal as TerminalSquare,
  User,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AppShell } from "@/components/layout/AppShell";
import {
  AvaMascot,
  Button,
  GlassIconButton,
  Surface,
} from "@/components/kit";
import { APP } from "@/config/app";
import { REASONING_EFFORTS, SANDBOX_MODES } from "@/config/models";
import { useAva } from "@/state/ava-provider";
import { useModels, useSessions } from "@/state/queries";
import { useChat } from "@/state/use-chat";
import type { ChatMessage, MessagePart } from "@/core/types";
import { COLORS } from "@/theme/colors";

const SUGGESTIONS = [
  "Create a new feature",
  "Fix an error",
  "Explain this project",
];

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const {
    activeSessionId,
    setActiveSessionId,
    modelId,
    setModelId,
    effort,
    setEffort,
    sandbox,
    setSandbox,
  } = useAva();
  const { data: sessions } = useSessions();
  const { data: models = [] } = useModels();
  const { messages, status, error, send, stop, clear } = useChat();

  const [draft, setDraft] = useState("");
  const [activePanel, setActivePanel] = useState<
    "actions" | "model" | "sandbox" | null
  >(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const flatListRef = useRef<FlatList>(null);
  const activeSession = sessions?.find((s) => s.id === activeSessionId);
  const activeModel = models.find((m) => m.id === modelId) ?? models.find((m) => m.isDefault);
  const sandboxOpt = SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[2];
  const isStreaming = status === "streaming" || status === "submitted";

  const handleSend = (text: string) => {
    if (!text.trim() || isStreaming) return;
    setDraft("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    send(text);
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    stop();
  };

  const toggleThought = (key: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTool = (key: string) => {
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderPart = (part: MessagePart, index: number, messageId: string) => {
    const partKey = `${messageId}-${index}`;

    if (part.kind === "text") {
      return (
        <Text key={partKey} style={styles.messageText}>
          {part.text}
        </Text>
      );
    }

    if (part.kind === "reasoning") {
      const isExpanded = expandedThoughts[partKey] ?? true;
      return (
        <Surface key={partKey} style={styles.thoughtBox}>
          <TouchableOpacity
            style={styles.thoughtHeader}
            onPress={() => toggleThought(partKey)}
            activeOpacity={0.7}
          >
            <Brain size={14} color={COLORS.primary} />
            <Text style={styles.thoughtTitle}>Thinking process</Text>
            {isExpanded ? (
              <ChevronDown size={14} color={COLORS.mutedForeground} />
            ) : (
              <ChevronRight size={14} color={COLORS.mutedForeground} />
            )}
          </TouchableOpacity>
          {isExpanded && (
            <Text style={styles.thoughtContent}>{part.text}</Text>
          )}
        </Surface>
      );
    }

    if (part.kind === "tool") {
      const isExpanded = expandedTools[partKey] ?? false;
      const isRunning = part.status === "running";
      const isError = part.status === "error" || (part.exitCode != null && part.exitCode !== 0);

      return (
        <Surface key={partKey} style={styles.toolCard}>
          <TouchableOpacity
            style={styles.toolHeader}
            onPress={() => toggleTool(partKey)}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconBox}>
              <Wrench size={14} color={COLORS.primary} />
            </View>
            <View style={styles.toolTitleCol}>
              <Text style={styles.toolName} numberOfLines={1}>
                {part.toolName || "Tool execution"}
              </Text>
              {part.toolDescription ? (
                <Text style={styles.toolSub} numberOfLines={1}>
                  {part.toolDescription}
                </Text>
              ) : null}
            </View>

            {isRunning ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : isError ? (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.destructive }]}>
                <X size={10} color="#FFF" />
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
                <Check size={10} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.toolBody}>
              {part.input ? (
                <View style={styles.toolCodeBox}>
                  <Text style={styles.toolSectionLabel}>INPUT</Text>
                  <Text style={styles.toolCodeText}>
                    {typeof part.input === "string"
                      ? part.input
                      : JSON.stringify(part.input, null, 2)}
                  </Text>
                </View>
              ) : null}

              {part.output ? (
                <View style={[styles.toolCodeBox, { marginTop: 6 }]}>
                  <Text style={styles.toolSectionLabel}>OUTPUT</Text>
                  <Text style={styles.toolCodeText} numberOfLines={8}>
                    {part.output}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </Surface>
      );
    }

    return null;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        <View
          style={[
            styles.avatar,
            isUser ? styles.avatarUser : styles.avatarAssistant,
          ]}
        >
          {isUser ? (
            <User size={13} color={COLORS.primaryForeground} />
          ) : (
            <AvaMascot size="sm" />
          )}
        </View>

        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {item.parts.map((part, idx) => renderPart(part, idx, item.id))}
        </View>
      </View>
    );
  };

  return (
    <AppShell
      title={activeSession?.title ?? "Agent chat"}
      actions={
        <GlassIconButton
          icon={SquarePen}
          size={18}
          onPress={() => {
            setActiveSessionId(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
        />
      }
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <AvaMascot size="lg" />
            <Text style={styles.emptyHeading}>What do you want to build?</Text>
            <Text style={styles.emptyDesc}>
              Describe a feature, paste an error, or ask AvA to explore your code.
            </Text>

            <View style={styles.suggestionsRow}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionPill}
                  onPress={() => handleSend(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Composer Section */}
        <View style={styles.composerWrapper}>
          {/* Floating Model Badge on top-right */}
          <TouchableOpacity
            style={styles.modelPill}
            onPress={() => setActivePanel("model")}
            activeOpacity={0.8}
          >
            <Text style={styles.modelPillText} numberOfLines={1}>
              {activeModel?.name ?? "Model"} · {effort}
            </Text>
            <ChevronDown size={12} color={COLORS.mutedForeground} />
          </TouchableOpacity>

          <Surface style={styles.composerCard}>
            <TextInput
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message AvA (e.g. check status, run tasks, edit code)…"
              placeholderTextColor={COLORS.mutedForeground}
              multiline
              maxLength={4000}
            />

            <View style={styles.composerFooter}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolsRow}
              >
                <TouchableOpacity
                  style={styles.toolIconBtn}
                  onPress={() => setActivePanel("actions")}
                >
                  <Plus size={16} color={COLORS.foreground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => setActivePanel("actions")}
                >
                  <Settings2 size={13} color={COLORS.foreground} />
                  <Text style={styles.actionPillText}>Tools</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => setActivePanel("sandbox")}
                >
                  <ShieldCheck size={13} color={COLORS.foreground} />
                  <Text style={styles.actionPillText}>{sandboxOpt.label}</Text>
                  <ChevronDown size={11} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.sendBtnWrapper}>
                {isStreaming ? (
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={handleStop}
                  >
                    <Square size={14} color="#FFF" fill="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !draft.trim() && styles.sendButtonDisabled,
                    ]}
                    onPress={() => handleSend(draft)}
                    disabled={!draft.trim()}
                  >
                    <ArrowUp size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Surface>

          <Text style={styles.disclaimerText}>
            {APP.name} can make mistakes. Review generated code before using it.
          </Text>
        </View>

        {/* Modal Bottom Sheets for Actions, Models, Sandbox */}
        <Modal
          visible={activePanel !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActivePanel(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActivePanel(null)}
          >
            <Surface style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activePanel === "actions"
                    ? "Prompt actions & tools"
                    : activePanel === "model"
                    ? "Model & reasoning"
                    : "Sandbox permission"}
                </Text>
                <TouchableOpacity onPress={() => setActivePanel(null)}>
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {activePanel === "actions" && (
                  <View style={styles.optionsList}>
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setActiveSessionId(null);
                        setActivePanel(null);
                      }}
                    >
                      <SquarePen size={18} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>New session</Text>
                        <Text style={styles.optionSub}>Start a fresh conversation</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setActivePanel(null);
                        navigation.navigate("Files");
                      }}
                    >
                      <FolderOpen size={18} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Workspace files</Text>
                        <Text style={styles.optionSub}>Browse project files</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setActivePanel(null);
                        navigation.navigate("Terminal");
                      }}
                    >
                      <TerminalSquare size={18} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Terminal</Text>
                        <Text style={styles.optionSub}>Run shell commands</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        setActivePanel(null);
                        navigation.navigate("Mcp");
                      }}
                    >
                      <Plug size={18} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>MCP tools</Text>
                        <Text style={styles.optionSub}>Servers, tools and status</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        clear();
                        setActivePanel(null);
                      }}
                    >
                      <Eraser size={18} color={COLORS.destructive} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Clear chat view</Text>
                        <Text style={styles.optionSub}>Hide messages on this screen</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {activePanel === "model" && (
                  <View style={styles.optionsList}>
                    <Text style={styles.panelSectionHeader}>THINKING DEPTH</Text>
                    <View style={styles.effortPillRow}>
                      {REASONING_EFFORTS.map((e) => (
                        <TouchableOpacity
                          key={e}
                          style={[
                            styles.effortBtn,
                            effort === e && styles.effortBtnActive,
                          ]}
                          onPress={() => setEffort(e)}
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

                    <Text style={styles.panelSectionHeader}>
                      MODELS ({models.length})
                    </Text>
                    {models.map((m) => {
                      const isSel = (modelId || activeModel?.id) === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.optionRow,
                            isSel && styles.optionRowActive,
                          ]}
                          onPress={() => {
                            setModelId(m.id);
                            setActivePanel(null);
                          }}
                        >
                          <Bot size={18} color={isSel ? COLORS.primary : COLORS.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>
                              {m.name} {m.isDefault ? "(server default)" : ""}
                            </Text>
                            <Text style={styles.optionSub} numberOfLines={1}>
                              {m.description ?? m.id}
                            </Text>
                          </View>
                          {isSel && <Check size={16} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {activePanel === "sandbox" && (
                  <View style={styles.optionsList}>
                    {SANDBOX_MODES.map((s) => {
                      const isSel = sandbox === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.optionRow,
                            isSel && styles.optionRowActive,
                          ]}
                          onPress={() => {
                            setSandbox(s.id);
                            setActivePanel(null);
                          }}
                        >
                          <ShieldCheck
                            size={18}
                            color={isSel ? COLORS.primary : COLORS.mutedForeground}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{s.label}</Text>
                            <Text style={styles.optionSub}>{s.description}</Text>
                          </View>
                          {isSel && <Check size={16} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </Surface>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyHeading: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 20,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  suggestionPill: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: "row",
    gap: 10,
    maxWidth: "92%",
  },
  messageRowUser: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  messageRowAssistant: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: {
    backgroundColor: COLORS.primary,
  },
  avatarAssistant: {
    backgroundColor: "transparent",
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    gap: 8,
    maxWidth: "88%",
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.foreground,
  },
  thoughtBox: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: COLORS.secondary,
  },
  thoughtHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thoughtTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },
  thoughtContent: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 6,
    lineHeight: 18,
    fontStyle: "italic",
  },
  toolCard: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTitleCol: {
    flex: 1,
  },
  toolName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  toolSub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  statusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBody: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toolCodeBox: {
    backgroundColor: COLORS.codeBg,
    padding: 8,
    borderRadius: 8,
  },
  toolSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    marginBottom: 4,
  },
  toolCodeText: {
    fontSize: 11,
    color: COLORS.codeForeground,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 16,
  },
  errorContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  errorBannerText: {
    color: COLORS.destructive,
    fontSize: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 8,
    borderRadius: 8,
    textAlign: "center",
  },
  composerWrapper: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
    paddingTop: 8,
    position: "relative",
  },
  modelPill: {
    position: "absolute",
    top: -4,
    right: 28,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modelPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    maxWidth: 160,
  },
  composerCard: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  composerInput: {
    minHeight: 46,
    maxHeight: 120,
    fontSize: 14,
    color: COLORS.foreground,
    paddingTop: 0,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 4,
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  sendBtnWrapper: {
    marginLeft: "auto",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "75%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  optionsList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  optionRowActive: {
    backgroundColor: COLORS.secondary,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  optionSub: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  panelSectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  effortPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  effortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
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
});
