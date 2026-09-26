import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  File as FileIcon,
  FileCode2,
  Folder,
  FolderOpen,
  Menu,
  RefreshCw,
  Search,
  Share2,
  X,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, GlassIconButton, SkeletonRows, Surface } from "@/components/kit";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { APP } from "@/config/app";
import type { FileEntry } from "@/core/types";
import { parentPath, pathCrumbs } from "@/core/api/files";
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

  const handleCopy = async () => {
    if (data?.text) {
      await Clipboard.setStringAsync(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleShare = async () => {
    if (!data?.text) return;
    try {
      const file = new File(Paths.cache, name);
      file.create({ overwrite: true });
      file.write(data.text);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert("File Saved", `Cached at: ${file.uri}`);
      }
    } catch (err: any) {
      Alert.alert("Share Error", err?.message || "Failed to share file");
    }
  };

  return (
    <View style={styles.editorContainer}>
      <View style={styles.editorSubHeader}>
        <View style={styles.editorTab}>
          <FileIcon size={14} color={COLORS.primary} />
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
              <Check size={13} color={COLORS.success} />
            ) : (
              <Copy size={13} color={COLORS.mutedForeground} />
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
            <Share2 size={13} color={COLORS.mutedForeground} />
            <Text style={styles.editorActionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.editorContentArea}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Opening file…</Text>
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
  const navigation = useNavigation<any>();
  const [root, setRoot] = useState<string>(APP.defaultCwd);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const { refetch, isFetching, error } = useDirectory(root);

  const crumbs = useMemo(() => pathCrumbs(root), [root]);

  // Dedicated Customized Header for Files / Explorer
  const customFilesHeader = (
    <Surface style={styles.customHeaderSurface}>
      {openFile ? (
        <>
          <View style={styles.headerLeft}>
            <GlassIconButton
              icon={ChevronLeft}
              size={18}
              onPress={() => setOpenFile(null)}
            />
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {openFile.split("/").pop()}
              </Text>
              <Text style={styles.headerSubtitleText} numberOfLines={1}>
                {openFile}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <GlassIconButton
              icon={X}
              size={16}
              onPress={() => setOpenFile(null)}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.headerLeft}>
            <GlassIconButton
              icon={Menu}
              size={18}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.crumbScroll}
            >
              <TouchableOpacity
                onPress={() => setRoot("/")}
                style={styles.crumbBtn}
              >
                <Text style={styles.crumbRootText}>/</Text>
              </TouchableOpacity>
              {crumbs.map((crumb, idx) => (
                <View key={crumb.path} style={styles.crumbItem}>
                  <Text style={styles.crumbSlash}>/</Text>
                  <TouchableOpacity
                    onPress={() => setRoot(crumb.path)}
                    style={styles.crumbBtn}
                  >
                    <Text
                      style={[
                        styles.crumbText,
                        idx === crumbs.length - 1 && styles.crumbTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {crumb.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.headerRight}>
            {root !== "/" && (
              <GlassIconButton
                icon={ChevronLeft}
                size={17}
                onPress={() => setRoot(parentPath(root))}
              />
            )}
            <GlassIconButton
              icon={Search}
              size={17}
              onPress={() => setShowSearch(!showSearch)}
            />
            <GlassIconButton
              icon={RefreshCw}
              size={17}
              disabled={isFetching}
              onPress={() => refetch()}
            />
          </View>
        </>
      )}
    </Surface>
  );

  return (
    <AppShell customHeader={customFilesHeader}>
      <View style={styles.container}>
        <View style={styles.codeCard}>
          {openFile ? (
            <FileEditor path={openFile} onBack={() => setOpenFile(null)} />
          ) : (
            <View style={{ flex: 1 }}>
              {/* Optional Search bar */}
              {showSearch && (
                <View style={styles.searchBarWrapper}>
                  <View style={styles.searchBox}>
                    <Search size={15} color={COLORS.mutedForeground} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Filter files in directory…"
                      placeholderTextColor={COLORS.mutedForeground}
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {query ? (
                      <TouchableOpacity onPress={() => setQuery("")}>
                        <X size={14} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

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
  customHeaderSurface: {
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    overflow: "hidden",
  },
  headerTextGroup: {
    justifyContent: "center",
    flex: 1,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  headerSubtitleText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  crumbScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
  },
  crumbItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  crumbBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  crumbRootText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  crumbSlash: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  crumbText: {
    fontSize: 12.5,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  crumbTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  codeCard: {
    flex: 1,
    backgroundColor: COLORS.codeBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
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
  editorSubHeader: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  editorTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "50%",
  },
  editorTabText: {
    fontSize: 12.5,
    color: COLORS.codeForeground,
    fontWeight: "600",
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
