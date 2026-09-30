import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { openAppDrawer } from "@/navigation/drawer";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  CornerDownLeft,
  Folder,
  Menu,
  Plus,
  RotateCcw,
  Terminal as TerminalSquare,
  X,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton, StatusDot, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { cancelCommand, runCommand } from "@/core/api/terminal";
import {
  getTerminalTabs,
  makeTerminalTab,
  saveTerminalTabs,
  TerminalEntry,
  TerminalTab,
} from "@/state/terminal-store";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Constants ─────────────────────────────────────────────────────────────

const CONTROL_KEYS = [
  { label: "ESC", key: "\x1b" },
  { label: "⌴ 2sp", key: "\t" },
  { label: "▲", key: "HIST_UP" },
  { label: "▼", key: "HIST_DOWN" },
  { label: "C", key: "CTRL_C", color: COLORS.destructive },
  { label: "CLR", key: "CTRL_D" },
  { label: "L", key: "CLEAR" },
];

const SYMBOL_ROWS = [
  ["|", "~", "/", "\\", "-", "_", "*", "&", "&&", "$"],
  ["#", "@", "!", "?", ";", ":", "<", ">", ">>", "="],
  ["+", "(", ")", "[", "]", "{", "}", '"', "'", "`"],
];

// A7: counter+timestamp entry ids so rapid-fire entries can't share an id.
let entrySeq = 0;
function nextEntryId(): number {
  entrySeq += 1;
  return Date.now() * 1000 + (entrySeq % 1000);
}

// ── Main Component ────────────────────────────────────────────────────────

export function TerminalScreen({ route }: { route?: { params?: { initialCwd?: string } } } = {}) {
  const navigation = useNavigation<any>();
  const { status, rpc } = useAva();

  const initialCwd = route?.params?.initialCwd || APP.defaultCwd;

  // Restore saved tabs with a single getTerminalTabs() call, and seed the tab
  // counter above the highest bash-N suffix so tab names are never reused.
  const [initialTerminal] = useState(() => {
    const restored = getTerminalTabs(initialCwd);
    let maxNum = 0;
    for (const t of restored.tabs) {
      const m = /^bash-(\d+)$/.exec(t.name);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    }
    return { tabs: restored.tabs, activeTabId: restored.activeTabId, maxNum };
  });
  const [tabs, setTabs] = useState<TerminalTab[]>(initialTerminal.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialTerminal.activeTabId);
  const [inputText, setInputText] = useState("");
  const [showCtrl, setShowCtrl] = useState(true);
  const [showSym, setShowSym] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedOutputIds, setExpandedOutputIds] = useState<Record<number, boolean>>({});
  // Per-tab pending state: a busy tab blocks only itself, other tabs can run.
  const [pendingTabs, setPendingTabs] = useState<Record<string, boolean>>({});

  const inputRef = useRef<TextInput>(null);
  const flatRef = useRef<FlatList>(null);
  const tabNum = useRef(initialTerminal.maxNum);
  const isNearBottomRef = useRef(true);
  // tabId -> processId of the command currently running on that tab (for Ctrl-C).
  const runningProcessRef = useRef<Record<string, string>>({});
  const processSeqRef = useRef(0);

  const isTabBusy = !!pendingTabs[activeTabId];

  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0]!;

  // Persist tabs whenever tabs or active tab change
  useEffect(() => {
    saveTerminalTabs(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const patchTab = useCallback((id: string, fn: (t: TerminalTab) => TerminalTab) => {
    setTabs((prev) => {
      const next = prev.map((t) => (t.id === id ? fn(t) : t));
      return next;
    });
  }, []);

  // ── Execute Command ─────────────────────────────────────────────────

  const exec = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      setInputText("");

      if (!rpc || status !== "online") {
        patchTab(activeTabId, (t) => ({
          ...t,
          history: [
            ...t.history,
            {
              id: nextEntryId(),
              command: trimmed,
              output: "Terminal disconnected: AvA Core is offline or reconnecting.",
              exitCode: 1,
              timestamp: Date.now(),
            },
          ].slice(-200),
        }));
        return;
      }

      // Per-tab pending: a busy tab blocks only itself, so tab B can run
      // while tab A is still executing.
      if (runningProcessRef.current[activeTabId]) return;

      patchTab(activeTabId, (t) => ({
        ...t,
        commandHistory: [trimmed, ...t.commandHistory.filter((c) => c !== trimmed)].slice(0, 200),
        historyIndex: -1,
      }));

      // Force scroll to bottom on new command execution
      isNearBottomRef.current = true;
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);

      // Robust CD handling: execute cd and pwd together on the server to get real path
      const isCd = trimmed === "cd" || trimmed.startsWith("cd ");
      const serverCommand = isCd ? `${trimmed} && pwd` : trimmed;

      // Track this tab's process id so Ctrl-C can terminate the real command.
      processSeqRef.current += 1;
      const processId = `term-${activeTabId}-${Date.now()}-${processSeqRef.current}`;
      runningProcessRef.current[activeTabId] = processId;
      setPendingTabs((p) => ({ ...p, [activeTabId]: true }));

      try {
        const res = await runCommand(rpc, serverCommand, tab.cwd, { processId });
        const stdout = (res.stdout || "").trim();
        const stderr = (res.stderr || "").trim();

        let displayOutput = [stdout, stderr].filter(Boolean).join("\n");
        let newCwd = tab.cwd;

        if (isCd && res.exitCode === 0) {
          // The last line of stdout is the real resolved pwd
          const lines = stdout.split("\n");
          const resolvedPwd = lines[lines.length - 1]?.trim();
          if (resolvedPwd && resolvedPwd.startsWith("/")) {
            newCwd = resolvedPwd;
            // Clean display: don't show the internal pwd echo if user only typed cd
            displayOutput = lines.slice(0, -1).join("\n").trim();
          }
        }

        patchTab(activeTabId, (t) => ({
          ...t,
          cwd: newCwd,
          history: [
            ...t.history,
            {
              id: nextEntryId(),
              command: trimmed,
              output: displayOutput,
              exitCode: res.exitCode,
              timestamp: Date.now(),
            },
          ].slice(-200),
        }));

        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      } catch (err) {
        patchTab(activeTabId, (t) => ({
          ...t,
          history: [
            ...t.history,
            {
              id: nextEntryId(),
              command: trimmed,
              output: (err as Error).message,
              exitCode: 1,
              timestamp: Date.now(),
            },
          ].slice(-200),
        }));
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      } finally {
        delete runningProcessRef.current[activeTabId];
        setPendingTabs((p) => ({ ...p, [activeTabId]: false }));
      }
    },
    [activeTabId, tab?.cwd, rpc, status, patchTab]
  );

  // ── Tab Management ──────────────────────────────────────────────────

  const addTab = useCallback(() => {
    tabNum.current += 1;
    const nt = makeTerminalTab(`bash-${tabNum.current}`, initialCwd);
    setTabs((prev) => [...prev, nt]);
    setActiveTabId(nt.id);
    setInputText("");
  }, [initialCwd]);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) return;
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs.filter((t) => t.id !== id);
      setTabs(next);
      if (activeTabId === id) setActiveTabId(next[Math.max(0, idx - 1)]!.id);
    },
    [tabs, activeTabId]
  );

  // ── Control Key Handler ─────────────────────────────────────────────

  const handleCtrl = useCallback(
    (key: string) => {
      if (key === "\t") {
        setInputText((v) => v + "  ");
        return;
      }
      if (key === "\x1b") {
        setInputText("");
        inputRef.current?.blur();
        return;
      }
      if (key === "CTRL_D") {
        setInputText("");
        return;
      }
      if (key === "HIST_UP") {
        const idx = tab.historyIndex + 1;
        if (idx < tab.commandHistory.length) {
          patchTab(activeTabId, (t) => ({ ...t, historyIndex: idx }));
          setInputText(tab.commandHistory[idx] || "");
        }
        return;
      }
      if (key === "HIST_DOWN") {
        const idx = tab.historyIndex - 1;
        patchTab(activeTabId, (t) => ({ ...t, historyIndex: Math.max(-1, idx) }));
        setInputText(idx >= 0 ? tab.commandHistory[idx] || "" : "");
        return;
      }
      if (key === "CLEAR") {
        patchTab(activeTabId, (t) => ({ ...t, history: [] }));
        return;
      }
      if (key === "CTRL_C") {
        const processId = runningProcessRef.current[activeTabId];
        if (processId && rpc && status === "online") {
          // A command is running on this tab: terminate the real server process.
          cancelCommand(rpc, processId).catch((e) =>
            console.warn("cancelCommand failed:", e)
          );
        }
        // Echo ^C locally in both cases (cancel requested, or nothing running).
        patchTab(activeTabId, (t) => ({
          ...t,
          history: [
            ...t.history,
            { id: nextEntryId(), command: "^C", output: "", exitCode: 130, timestamp: Date.now() },
          ].slice(-200),
        }));
        return;
      }
    },
    [activeTabId, tab?.historyIndex, tab?.commandHistory, patchTab, rpc, status]
  );

  // ── Copy Helper ─────────────────────────────────────────────────────

  const handleCopy = useCallback(async (entry: TerminalEntry) => {
    const textToCopy = entry.output ? `${entry.command}\n${entry.output}` : entry.command;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  // ── Back Handler ────────────────────────────────────────────────────

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation?.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  // ── Render ──────────────────────────────────────────────────────────

  const header = (
    <Surface style={styles.header}>
      <View style={styles.hLeft}>
        {navigation.canGoBack() && (
          <GlassIconButton icon={ChevronLeft} size={18} onPress={() => navigation.goBack()} />
        )}
        <GlassIconButton icon={Menu} size={18} onPress={() => openAppDrawer(navigation)} />
        <View style={styles.badge}>
          <TerminalSquare size={13} color={COLORS.primary} />
          <Text style={[styles.badgeText, mono("bold")]}>bash</Text>
        </View>
        <View style={styles.cwd}>
          <Folder size={11} color={COLORS.mutedForeground} />
          <Text style={[styles.cwdText, mono("regular")]} numberOfLines={1}>
            {tab.cwd}
          </Text>
        </View>
      </View>
      <View style={styles.hRight}>
        <StatusDot status={status} size={8} />
        <GlassIconButton icon={Plus} size={16} onPress={addTab} />
        <GlassIconButton
          icon={RotateCcw}
          size={16}
          onPress={() => patchTab(activeTabId, (t) => ({ ...t, history: [] }))}
        />
      </View>
    </Surface>
  );

  return (
    <AppShell customHeader={header}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Tab Bar */}
        {tabs.length > 1 && (
          <View style={styles.tabBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
            >
              {tabs.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tab, t.id === activeTabId && styles.tabOn]}
                  onPress={() => {
                    setActiveTabId(t.id);
                    setInputText("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mono("medium"),
                      t.id === activeTabId && styles.tabTextOn,
                    ]}
                  >
                    {t.name}
                  </Text>
                  {tabs.length > 1 && (
                    <TouchableOpacity
                      onPress={() => closeTab(t.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <X size={12} color={t.id === activeTabId ? COLORS.primary : COLORS.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Output Log */}
        <FlatList
          ref={flatRef}
          data={tab.history}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.log}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
            isNearBottomRef.current = isBottom;
          }}
          scrollEventThrottle={32}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              flatRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <TerminalSquare size={36} color={COLORS.mutedForeground} />
              <Text style={[styles.emptyTitle, font("semibold")]}>Terminal Ready</Text>
              <Text style={[styles.emptySub, font("regular")]}>Execute commands on the server</Text>
            </View>
          }
          renderItem={({ item }) => {
            const lines = item.output ? item.output.split("\n") : [];
            const isVeryLong = lines.length > 250;
            const isExpanded = !!expandedOutputIds[item.id];
            const displayLines = isVeryLong && !isExpanded ? lines.slice(-250).join("\n") : item.output;

            return (
              <View style={styles.entry}>
                <View style={styles.prompt}>
                  <Text style={[styles.dollar, mono("bold")]}>$</Text>
                  <Text style={[styles.cmd, mono("medium")]}>{item.command}</Text>
                  <View style={[styles.exit, item.exitCode === 0 ? styles.exitOk : styles.exitErr]}>
                    <Text style={[styles.exitT, mono("bold")]}>{item.exitCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopy(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {copiedId === item.id ? (
                      <Check size={12} color={COLORS.success} />
                    ) : (
                      <Copy size={12} color={COLORS.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>

                {item.output ? (
                  <View style={styles.outputBox}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={[styles.out, mono("regular")]}>{displayLines}</Text>
                    </ScrollView>
                    {isVeryLong && (
                      <TouchableOpacity
                        style={styles.expandBar}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setExpandedOutputIds((prev) => ({ ...prev, [item.id]: !isExpanded }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.expandText, mono("medium")]}>
                          {isExpanded
                            ? "▲ Collapse output"
                            : `▼ Output truncated (${lines.length} lines) — tap to show all`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </View>
            );
          }}
        />

        {/* Control Keys */}
        {showCtrl && (
          <View style={styles.ctrlBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8, gap: 4 }}
            >
              {CONTROL_KEYS.map((ck) => (
                <TouchableOpacity
                  key={ck.label}
                  style={[styles.ctrlKey, ck.color && { borderColor: `${ck.color}40` }]}
                  onPress={() => handleCtrl(ck.key)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.ctrlText, mono("bold"), ck.color && { color: ck.color }]}>
                    {ck.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Symbol Keys */}
        {showSym && (
          <View style={styles.symBar}>
            {SYMBOL_ROWS.map((row, ri) => (
              <ScrollView
                key={ri}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 6, gap: 3 }}
              >
                {row.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.symKey}
                    onPress={() => setInputText((v) => v + s)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.symText, mono("bold")]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ))}
          </View>
        )}

        {/* Toggle Row */}
        <View style={styles.toggles}>
          <TouchableOpacity
            style={styles.toggle}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowCtrl((v) => !v);
            }}
          >
            <Text style={[styles.toggleT, font("medium")]}>CTRL</Text>
            {showCtrl ? (
              <ChevronDown size={10} color={COLORS.mutedForeground} />
            ) : (
              <ChevronUp size={10} color={COLORS.mutedForeground} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggle}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowSym((v) => !v);
            }}
          >
            <Text style={[styles.toggleT, font("medium")]}>SYM</Text>
            {showSym ? (
              <ChevronDown size={10} color={COLORS.mutedForeground} />
            ) : (
              <ChevronUp size={10} color={COLORS.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={styles.inputBar}>
          <Surface style={styles.inputCard}>
            <Text style={[styles.dollarInput, mono("bold")]}>$</Text>
            <TextInput
              ref={inputRef}
              style={[styles.input, mono("regular")]}
              placeholder="Enter command…"
              placeholderTextColor={COLORS.mutedForeground}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => exec(inputText)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => exec(inputText)}
              disabled={isTabBusy}
              activeOpacity={0.7}
            >
              {isTabBusy ? (
                <ActivityIndicator size={14} color="#FFF" />
              ) : (
                <CornerDownLeft size={14} color="#FFF" />
              )}
            </TouchableOpacity>
          </Surface>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 12,
    marginTop: Platform.OS === "android" ? 8 : 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    height: 56,
  },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  hRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.1)",
  },
  badgeText: { fontSize: 12, color: COLORS.primary },
  cwd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    maxWidth: 160,
  },
  cwdText: { fontSize: 11, color: COLORS.mutedForeground },

  tabBar: {
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabOn: { backgroundColor: "rgba(66, 64, 225, 0.1)", borderColor: COLORS.primary },
  tabText: { fontSize: 11.5, color: COLORS.mutedForeground },
  tabTextOn: { color: COLORS.primary, fontWeight: "600" },

  log: { paddingHorizontal: 14, paddingVertical: 10, gap: 10, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, color: COLORS.foreground },
  emptySub: { fontSize: 13, color: COLORS.mutedForeground },
  entry: { gap: 4 },
  prompt: { flexDirection: "row", alignItems: "center", gap: 6 },
  dollar: { fontSize: 13, color: COLORS.primary },
  cmd: { fontSize: 13, color: COLORS.foreground, flex: 1 },
  exit: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  exitOk: { backgroundColor: "rgba(59, 179, 96, 0.12)" },
  exitErr: { backgroundColor: "rgba(231, 0, 11, 0.12)" },
  exitT: { fontSize: 9.5, color: COLORS.mutedForeground },
  copyBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  outputBox: {
    backgroundColor: COLORS.codeBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  out: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.codeForeground,
    padding: 8,
  },
  expandBar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  expandText: {
    fontSize: 10.5,
    color: COLORS.primary,
  },

  ctrlBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingVertical: 4,
  },
  ctrlKey: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 32,
    alignItems: "center",
  },
  ctrlText: { fontSize: 11, color: COLORS.mutedForeground },

  symBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingVertical: 3,
    gap: 2,
  },
  symKey: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    minWidth: 28,
    alignItems: "center",
  },
  symText: { fontSize: 11, color: COLORS.foreground },

  toggles: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  toggleT: { fontSize: 10, color: COLORS.mutedForeground },

  inputBar: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
    paddingTop: 6,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 48,
    gap: 8,
  },
  dollarInput: { fontSize: 14, color: COLORS.primary },
  input: { flex: 1, fontSize: 13, color: COLORS.foreground, paddingVertical: 0 },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
