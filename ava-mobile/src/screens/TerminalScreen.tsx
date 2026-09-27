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
import { useNavigation, DrawerActions } from "@react-navigation/native";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Folder,
  Menu,
  Plus,
  RotateCcw,
  Terminal as TerminalSquare,
  X,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton, StatusDot, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useRunCommand } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Types ─────────────────────────────────────────────────────────────────

interface TerminalTab {
  id: string;
  name: string;
  cwd: string;
  history: Entry[];
  commandHistory: string[];
  historyIndex: number;
}

interface Entry {
  id: number;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const CONTROL_KEYS = [
  { label: "ESC", key: "\x1b" },
  { label: "TAB", key: "\t" },
  { label: "▲", key: "HIST_UP" },
  { label: "▼", key: "HIST_DOWN" },
  { label: "C", key: "CTRL_C", color: COLORS.destructive },
  { label: "D", key: "CTRL_D" },
  { label: "L", key: "CLEAR" },
];

const SYMBOL_ROWS = [
  ["|", "~", "/", "\\", "-", "_", "*", "&", "&&", "$"],
  ["#", "@", "!", "?", ";", ":", "<", ">", ">>", "="],
  ["+", "(", ")", "[", "]", "{", "}", '"', "'", "`"],
];

// ── Main Component ────────────────────────────────────────────────────────

export function TerminalScreen({ route }: { route?: { params?: { initialCwd?: string } } } = {}) {
  const navigation = useNavigation<any>();
  const { status } = useAva();
  const run = useRunCommand();

  const initialCwd = route?.params?.initialCwd || APP.defaultCwd;

  const [tabs, setTabs] = useState<TerminalTab[]>([makeTab("bash-1", initialCwd)]);
  const [activeTabId, setActiveTabId] = useState("bash-1");
  const [inputText, setInputText] = useState("");
  const [showCtrl, setShowCtrl] = useState(true);
  const [showSym, setShowSym] = useState(true);

  const inputRef = useRef<TextInput>(null);
  const flatRef = useRef<FlatList>(null);
  const tabNum = useRef(1);

  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0]!;

  const patchTab = useCallback((id: string, fn: (t: TerminalTab) => TerminalTab) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  // ── Execute Command ─────────────────────────────────────────────────

  const exec = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed || run.isPending) return;
    setInputText("");

    patchTab(activeTabId, (t) => ({
      ...t,
      commandHistory: [trimmed, ...t.commandHistory.filter((c) => c !== trimmed)].slice(0, 200),
      historyIndex: -1,
    }));

    try {
      const res = await run.mutateAsync({ command: trimmed, cwd: tab.cwd });
      patchTab(activeTabId, (t) => ({
        ...t,
        history: [...t.history, { id: Date.now(), command: trimmed, output: [res.stdout, res.stderr].filter(Boolean).join("\n"), exitCode: res.exitCode, timestamp: Date.now() }],
        cwd: trimmed.startsWith("cd ") ? trimmed.slice(3).trim().replace(/^~|.*/, (m) => (m === "~" ? "/root" : m)) || t.cwd : t.cwd,
      }));
    } catch (err) {
      patchTab(activeTabId, (t) => ({
        ...t,
        history: [...t.history, { id: Date.now(), command: trimmed, output: (err as Error).message, exitCode: 1, timestamp: Date.now() }],
      }));
    }
  }, [activeTabId, tab?.cwd, run, patchTab]);

  // ── Tab Management ──────────────────────────────────────────────────

  const addTab = useCallback(() => {
    tabNum.current += 1;
    const nt = makeTab(`bash-${tabNum.current}`, initialCwd);
    setTabs((prev) => [...prev, nt]);
    setActiveTabId(nt.id);
    setInputText("");
  }, [initialCwd]);

  const closeTab = useCallback((id: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[Math.max(0, idx - 1)]!.id);
  }, [tabs, activeTabId]);

  // ── Control Key Handler ─────────────────────────────────────────────

  const handleCtrl = useCallback((key: string) => {
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
      patchTab(activeTabId, (t) => ({
        ...t,
        history: [...t.history, { id: Date.now(), command: "^C", output: "", exitCode: 130, timestamp: Date.now() }],
      }));
      return;
    }
  }, [activeTabId, tab?.historyIndex, tab?.commandHistory, patchTab]);

  // ── Back Handler ────────────────────────────────────────────────────

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation?.canGoBack()) { navigation.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  // ── Render ──────────────────────────────────────────────────────────

  const header = (
    <Surface style={styles.header}>
      <View style={styles.hLeft}>
        {navigation.canGoBack() && <GlassIconButton icon={ChevronLeft} size={18} onPress={() => navigation.goBack()} />}
        <GlassIconButton icon={Menu} size={18} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
        <View style={styles.badge}>
          <TerminalSquare size={13} color={COLORS.primary} />
          <Text style={[styles.badgeText, mono("bold")]}>bash</Text>
        </View>
        <View style={styles.cwd}>
          <Folder size={11} color={COLORS.mutedForeground} />
          <Text style={[styles.cwdText, mono("regular")]} numberOfLines={1}>{tab.cwd}</Text>
        </View>
      </View>
      <View style={styles.hRight}>
        <StatusDot status={status} size={8} />
        <GlassIconButton icon={Plus} size={16} onPress={addTab} />
        <GlassIconButton icon={RotateCcw} size={16} onPress={() => patchTab(activeTabId, (t) => ({ ...t, history: [] }))} />
      </View>
    </Surface>
  );

  return (
    <AppShell customHeader={header}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Tab Bar */}
        {tabs.length > 1 && (
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
              {tabs.map((t) => (
                <TouchableOpacity key={t.id} style={[styles.tab, t.id === activeTabId && styles.tabOn]} onPress={() => { setActiveTabId(t.id); setInputText(""); }} activeOpacity={0.7}>
                  <Text style={[styles.tabText, mono("medium"), t.id === activeTabId && styles.tabTextOn]}>{t.name}</Text>
                  {tabs.length > 1 && (
                    <TouchableOpacity onPress={() => closeTab(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={11} color={t.id === activeTabId ? COLORS.foreground : COLORS.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Output */}
        <FlatList
          ref={flatRef}
          data={tab.history}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.log}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <TerminalSquare size={36} color={COLORS.mutedForeground} />
              <Text style={[styles.emptyTitle, font("semibold")]}>Terminal Ready</Text>
              <Text style={[styles.emptySub, font("regular")]}>Execute commands on the server</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.entry}>
              <View style={styles.prompt}>
                <Text style={[styles.dollar, mono("bold")]}>$</Text>
                <Text style={[styles.cmd, mono("medium")]}>{item.command}</Text>
                <View style={[styles.exit, item.exitCode === 0 ? styles.exitOk : styles.exitErr]}>
                  <Text style={[styles.exitT, mono("bold")]}>{item.exitCode}</Text>
                </View>
              </View>
              {item.output ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={[styles.out, mono("regular")]}>{item.output}</Text>
                </ScrollView>
              ) : null}
            </View>
          )}
        />

        {/* Control Keys */}
        {showCtrl && (
          <View style={styles.ctrlBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 4 }}>
              {CONTROL_KEYS.map((ck) => (
                <TouchableOpacity key={ck.label} style={[styles.ctrlKey, ck.color && { borderColor: `${ck.color}40` }]} onPress={() => handleCtrl(ck.key)} activeOpacity={0.6}>
                  <Text style={[styles.ctrlText, mono("bold"), ck.color && { color: ck.color }]}>{ck.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Symbol Keys */}
        {showSym && (
          <View style={styles.symBar}>
            {SYMBOL_ROWS.map((row, ri) => (
              <ScrollView key={ri} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, gap: 3 }}>
                {row.map((s) => (
                  <TouchableOpacity key={s} style={styles.symKey} onPress={() => setInputText((v) => v + s)} activeOpacity={0.6}>
                    <Text style={[styles.symText, mono("bold")]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ))}
          </View>
        )}

        {/* Toggle Row */}
        <View style={styles.toggles}>
          <TouchableOpacity style={styles.toggle} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowCtrl((v) => !v); }}>
            <Text style={[styles.toggleT, font("medium")]}>CTRL</Text>
            {showCtrl ? <ChevronDown size={10} color={COLORS.mutedForeground} /> : <ChevronUp size={10} color={COLORS.mutedForeground} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggle} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowSym((v) => !v); }}>
            <Text style={[styles.toggleT, font("medium")]}>SYM</Text>
            {showSym ? <ChevronDown size={10} color={COLORS.mutedForeground} /> : <ChevronUp size={10} color={COLORS.mutedForeground} />}
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
            <TouchableOpacity style={styles.sendBtn} onPress={() => exec(inputText)} disabled={run.isPending} activeOpacity={0.7}>
              {run.isPending ? <ActivityIndicator size={14} color="#FFF" /> : <CornerDownLeft size={14} color="#FFF" />}
            </TouchableOpacity>
          </Surface>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

function makeTab(name: string, cwd: string): TerminalTab {
  return { id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name, cwd, history: [], commandHistory: [], historyIndex: -1 };
}

const styles = StyleSheet.create({
  header: { marginHorizontal: 12, marginTop: Platform.OS === "android" ? 8 : 4, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, height: 56 },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  hRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(66, 64, 225, 0.1)" },
  badgeText: { fontSize: 12, color: COLORS.primary },
  cwd: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.secondary, maxWidth: 160 },
  cwdText: { fontSize: 11, color: COLORS.mutedForeground },

  tabBar: { backgroundColor: COLORS.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, paddingVertical: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.border },
  tabOn: { backgroundColor: "rgba(66, 64, 225, 0.1)", borderColor: COLORS.primary },
  tabText: { fontSize: 11.5, color: COLORS.mutedForeground },
  tabTextOn: { color: COLORS.primary, fontWeight: "600" },

  log: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexGrow: 1 },
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
  out: { fontSize: 12, lineHeight: 17, color: COLORS.codeForeground, backgroundColor: COLORS.codeBg, padding: 8, borderRadius: 8 },

  ctrlBar: { backgroundColor: COLORS.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingVertical: 4 },
  ctrlKey: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: COLORS.secondary, borderWidth: 1, borderColor: COLORS.border, minWidth: 32, alignItems: "center" },
  ctrlText: { fontSize: 11, color: COLORS.mutedForeground },

  symBar: { backgroundColor: COLORS.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingVertical: 3, gap: 2 },
  symKey: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: COLORS.secondary, minWidth: 28, alignItems: "center" },
  symText: { fontSize: 11, color: COLORS.foreground },

  toggles: { flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 4, backgroundColor: COLORS.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  toggle: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: COLORS.secondary },
  toggleT: { fontSize: 10, color: COLORS.mutedForeground },

  inputBar: { paddingHorizontal: 12, paddingBottom: Platform.OS === "ios" ? 16 : 10, paddingTop: 6 },
  inputCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 10, height: 48, gap: 8 },
  dollarInput: { fontSize: 14, color: COLORS.primary },
  input: { flex: 1, fontSize: 13, color: COLORS.foreground, paddingVertical: 0 },
  sendBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
});