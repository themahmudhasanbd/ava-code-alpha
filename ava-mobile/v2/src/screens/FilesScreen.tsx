import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  File as FileIcon,
  FileCode2,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  Share2,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, GlassIconButton, SkeletonRows } from "@/components/kit";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { APP } from "@/config/app";
import type { FileEntry } from "@/core/types";
import { parentPath } from "@/core/api/files";
import { useDirectory, useFileContent } from "@/state/queries";
import { COLORS } from "@/theme/colors";

function TreeBranch({
  path,
  depth,
  query,
  active,
  onOpen,
}: {
  path: string;
  depth: number;
  query: string;
  active: string | null;
  onOpen: (entry: FileEntry) => void;
}) {
  const { data = [], isLoading } = useDirectory(path);
  const [expanded, setExpanded] = useState<string[]>(depth === 0 ? [path] : []);

  const visible = useMemo(
    () =>
      data.filter(
        (entry) =>
          !query || entry.name.toLowerCase().includes(query.toLowerCase())
      ),
    [data, query]
  );

  if (isLoading && depth === 0) {
    return (
      <View style={{ padding: 12 }}>
        <SkeletonRows count={5} />
      </View>
    );
  }

  return (
    <View>
      {visible.map((entry) => {
        const isOpen = expanded.includes(entry.path);
        const isActive = active === entry.path;
        return (
          <View key={entry.path}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                if (entry.isDirectory) {
                  setExpanded((items) =>
                    isOpen
                      ? items.filter((p) => p !== entry.path)
                      : [...items, entry.path]
                  );
                } else {
                  onOpen(entry);
                }
              }}
              style={[
                styles.treeRow,
                { paddingLeft: Math.min(depth, 8) * 16 + 10 },
                isActive && styles.treeRowActive,
              ]}
              activeOpacity={0.7}
            >
              {entry.isDirectory ? (
                isOpen ? (
                  <ChevronDown size={15} color={COLORS.mutedForeground} />
                ) : (
                  <ChevronRight size={15} color={COLORS.mutedForeground} />
                )
              ) : (
                <View style={{ width: 15 }} />
              )}

              {entry.isDirectory ? (
                isOpen ? (
                  <FolderOpen size={16} color={COLORS.primary} />
                ) : (
                  <Folder size={16} color={COLORS.primary} />
                )
              ) : (
                <FileCode2 size={16} color={COLORS.mutedForeground} />
              )}

              <Text
                style={[
                  styles.treeEntryName,
                  isActive && styles.treeEntryNameActive,
                ]}
                numberOfLines={1}
              >
                {entry.name}
              </Text>
            </TouchableOpacity>

            {entry.isDirectory && isOpen && (
              <TreeBranch
                path={entry.path}
                depth={depth + 1}
                query={query}
                active={active}
                onOpen={onOpen}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function FileEditor({
  path,
  onBack,
}: {
  path: string;
  onBack: () => void;
}) {
  const { data, isLoading, error } = useFileContent(path);
  const [copied, setCopied] = useState(false);
  const name = path.split("/").filter(Boolean).pop() ?? path;

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    if (!data?.text) return;
    try {
      const file = new File(Paths.cache, name);
      file.write(data.text);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      }
    } catch {}
  };

  return (
    <View style={styles.editorContainer}>
      <View style={styles.editorHeader}>
        <TouchableOpacity onPress={onBack} style={styles.editorNavBtn}>
          <ChevronLeft size={20} color={COLORS.codeForeground} />
        </TouchableOpacity>
        <Text style={styles.editorHeaderTitle} numberOfLines={1}>
          {name}
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.editorNavBtn}>
          <Folder size={18} color={COLORS.codeForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.editorSubHeader}>
        <View style={styles.editorTab}>
          <FileIcon size={14} color={COLORS.mutedForeground} />
          <Text style={styles.editorTabText} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.editorActions}>
          <TouchableOpacity
            onPress={handleCopy}
            style={styles.editorActionBtn}
            activeOpacity={0.7}
          >
            {copied ? (
              <Check size={14} color={COLORS.success} />
            ) : (
              <Copy size={14} color={COLORS.mutedForeground} />
            )}
            <Text style={styles.editorActionBtnText}>
              {copied ? "Copied" : "Copy"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.editorActionBtn}
            activeOpacity={0.7}
          >
            <Share2 size={14} color={COLORS.mutedForeground} />
            <Text style={styles.editorActionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.editorContentArea}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Opening…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{(error as Error).message}</Text>
        ) : (
          <ScrollView
            style={styles.codeScroll}
            showsVerticalScrollIndicator={false}
          >
            <CodeBlock
              code={data?.text || "(empty file)"}
              language={name.split(".").pop() || "text"}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export function FilesScreen() {
  const [root, setRoot] = useState<string>(APP.defaultCwd);
  const [query, setQuery] = useState("");
  const [openFile, setOpenFile] = useState<string | null>(null);
  const { refetch, isFetching, error } = useDirectory(root);

  return (
    <AppShell
      title="Code"
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={18}
          disabled={isFetching}
          onPress={() => refetch()}
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.codeCard}>
          {openFile ? (
            <FileEditor path={openFile} onBack={() => setOpenFile(null)} />
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                {root !== "/" ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setRoot(parentPath(root));
                    }}
                    style={styles.parentBtn}
                  >
                    <ChevronLeft size={18} color={COLORS.codeForeground} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 32 }} />
                )}
                <Text style={styles.cardTitle}>Code</Text>
                <View style={{ width: 32 }} />
              </View>

              <View style={styles.searchBarWrapper}>
                <View style={styles.searchBox}>
                  <Search size={15} color={COLORS.mutedForeground} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search code"
                    placeholderTextColor={COLORS.mutedForeground}
                    style={styles.searchInput}
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery("")}>
                      <X size={14} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <ScrollView
                style={styles.treeScroll}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {error ? (
                  <EmptyState
                    icon={Folder}
                    title="Could not open this folder"
                    description={(error as Error).message}
                  />
                ) : (
                  <TreeBranch
                    path={root}
                    depth={0}
                    query={query}
                    active={openFile}
                    onOpen={(entry) => setOpenFile(entry.path)}
                  />
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  codeCard: {
    flex: 1,
    backgroundColor: COLORS.codeBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  cardHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
  },
  parentBtn: {
    padding: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.codeForeground,
  },
  searchBarWrapper: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.codeForeground,
    paddingVertical: 0,
  },
  treeScroll: {
    flex: 1,
    paddingTop: 6,
  },
  treeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingRight: 12,
  },
  treeRowActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  treeEntryName: {
    fontSize: 13,
    color: COLORS.codeForeground,
    flex: 1,
  },
  treeEntryNameActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
  },
  editorNavBtn: {
    padding: 6,
  },
  editorHeaderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.codeForeground,
    flex: 1,
    textAlign: "center",
  },
  editorSubHeader: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  editorTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "50%",
  },
  editorTabText: {
    fontSize: 12,
    color: COLORS.codeForeground,
    fontWeight: "500",
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editorActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  editorActionBtnText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  editorContentArea: {
    flex: 1,
  },
  codeScroll: {
    flex: 1,
    padding: 8,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.destructive,
    padding: 16,
  },
});
