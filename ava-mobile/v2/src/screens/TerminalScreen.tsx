import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CornerDownLeft, Eraser, Loader2, Terminal as TerminalSquare } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton, PageIntro, Surface, Button } from "@/components/kit";
import { APP } from "@/config/app";
import { useRunCommand } from "@/state/queries";
import { COLORS } from "@/theme/colors";

const PRESETS = ["ls -la", "git status", "uptime", "df -h", "ps aux | head -15"];

interface Entry {
  id: number;
  command: string;
  output: string;
  exitCode: number;
}

export function TerminalScreen() {
  const [cwd, setCwd] = useState<string>(APP.defaultCwd);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<Entry[]>([]);
  const run = useRunCommand();
  const flatListRef = useRef<FlatList>(null);

  const exec = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed || run.isPending) return;
    setCommand("");


    try {
      const res = await run.mutateAsync({ command: trimmed, cwd });
      setLog((l) => [
        ...l,
        {
          id: Date.now(),
          command: trimmed,
          output: [res.stdout, res.stderr].filter(Boolean).join("\n"),
          exitCode: res.exitCode,
        },
      ]);
    } catch (err) {
      setLog((l) => [
        ...l,
        {
          id: Date.now(),
          command: trimmed,
          output: (err as Error).message,
          exitCode: 1,
        },
      ]);
    }
  };

  return (
    <AppShell
      title="Terminal"
      actions={
        <GlassIconButton
          icon={Eraser}
          size={18}
          onPress={() => setLog([])}
          disabled={log.length === 0}
        />
      }
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Preset commands bar */}
        <View style={styles.presetsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.presetPill}
                onPress={() => exec(p)}
              >
                <Text style={styles.presetText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Log Entries */}
        <FlatList
          ref={flatListRef}
          data={log}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <TerminalSquare size={36} color={COLORS.mutedForeground} />
              <Text style={styles.emptyTitle}>Terminal Console</Text>
              <Text style={styles.emptySub}>
                Type a command below or tap any preset above.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Surface style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.commandText}>$ {item.command}</Text>
                <View
                  style={[
                    styles.exitBadge,
                    item.exitCode === 0 ? styles.exitSuccess : styles.exitError,
                  ]}
                >
                  <Text style={styles.exitText}>exit {item.exitCode}</Text>
                </View>
              </View>
              {item.output ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.outputText}>{item.output}</Text>
                </ScrollView>
              ) : null}
            </Surface>
          )}
        />

        {/* Command Input Bar */}
        <View style={styles.inputContainer}>
          <Surface style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Run a command (e.g. bun test)…"
              placeholderTextColor={COLORS.mutedForeground}
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={() => exec(command)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              size="sm"
              loading={run.isPending}
              disabled={!command.trim() || run.isPending}
              onPress={() => exec(command)}
              style={styles.execBtn}
            >
              Run
            </Button>
          </Surface>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  presetsContainer: {
    paddingVertical: 6,
  },
  presetsScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  presetPill: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  presetText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.foreground,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    flexGrow: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  logCard: {
    padding: 12,
    borderRadius: 14,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  commandText: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    color: COLORS.foreground,
  },
  exitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exitSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  exitError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  exitText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  outputText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.codeForeground,
    backgroundColor: COLORS.codeBg,
    padding: 8,
    borderRadius: 8,
  },
  inputContainer: {
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
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  execBtn: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
});
