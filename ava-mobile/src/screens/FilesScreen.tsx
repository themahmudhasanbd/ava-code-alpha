import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
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
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Menu,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Share2,
  Trash2,
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
import { parentPath, pathCrumbs, joinPath, writeTextFile, createDirectory, deletePath } from "@/core/api/files";
import { useDirectory, useFileContent } from "@/state/queries";
import { useAva } from "@/state/ava-provider";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Tree Branch ───────────────────────────────────────────────────────────

function TreeBranch({
  path,
  depth,
  query,
  active,
  onOpen,
  onDelete,
}: {
  path: string;
  depth: number;
  query: string;
  active: string | null;
  onOpen: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
}) {
  const { data = [], isLoading, refetch } = useDirectory(path);
  const [expanded, setExpanded] = useState<string[]>(depth === 0 ? [path] : []);

  const visible = useMemo(
    () => data.filter((e) => !query || e.name.toLowerCase().includes(query.toLowerCase())),
    [data, query]
  );

  if (isLoading && depth === 0) {
    return <View style={{ padding: 12 }}><SkeletonRows count={5} /></View>;
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
                  setExpanded((items) => isOpen ? items.filter((p) => p !== entry.path) : [...items, entry.path]);
                } else {
                  onOpen(entry);
                }
              }}
              onLongPress={() => onDelete(entry)}
              style={[styles.treeRow, { paddingLeft: Math.min(depth, 8) * 16 + 10 }, isActive && styles.treeRowActive]}
              activeOpacity={0.7}
            >
              {entry.isDirectory ? (
                isOpen ? <ChevronDown size={15} color={COLORS.mutedForeground} /> : <ChevronRight size={15} color={COLORS.mutedForeground} />
              ) : (
                <View style={{ width: 15 }} />
              )}
              {entry.isDirectory ? (
                isOpen ? <FolderOpen size={16} color={COLORS.primary} /> : <Folder size={16} color={COLORS.primary} />
              ) : (
                <FileCode2 size={16} color={COLORS.mutedForeground} />
              )}
              <Text style={[styles.treeEntryName, isActive && styles.treeEntryNameActive]} numberOfLines={1}>
                {entry.name}
              </Text>
            </TouchableOpacity>
            {entry.isDirectory && isOpen && (
              <TreeBranch path={entry.path} depth={depth + 1} query={query} active={active} onOpen={onOpen} onDelete={onDelete} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── File Editor ───────────────────────────────────────────────────────────

function FileEditor({ path, onBack }: { path: string; onBack: () => void }) {
  const { rpc } = useAva();
  const { data, isLoading, error, refetch } = useFileContent(path);
  const [editText, setEditText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const name = path.split("/").filter(Boolean).pop() ?? path;

  const isEditing = editText !== null;
  const displayText = isEditing ? editText : data?.text || "";

  const handleStartEdit = useCallback(() => {
    setEditText(data?.text || "");
    setDirty(false);
  }, [data?.text]);

  const handleSave = useCallback(async () => {
    if (!rpc || editText === null) return;
    setSaving(true);
    try {
      await writeTextFile(rpc, path, editText);
      setDirty(false);
      Alert.alert("Saved", `${name} saved successfully.`);
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save file.");
    } finally {
      setSaving(false);
    }
  }, [rpc, path, editText, name, refetch]);

  const handleCancelEdit = useCallback(() => {
    setEditText(null);
    setDirty(false);
  }, []);

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
      {/* Editor Toolbar */}
      <View style={styles.editorSubHeader}>
        <View style={styles.editorTab}>
          <FileIcon size={14} color={COLORS.primary} />
          <Text style={styles.editorTabText} numberOfLines={1}>{name}</Text>
          {dirty && <View style={styles.dirtyDot} />}
        </View>
        <View style={styles.editorActions}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.editorActionBtn} activeOpacity={0.7}>
                <X size={13} color={COLORS.mutedForeground} />
                <Text style={styles.editorActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.editorActionBtn, styles.saveBtn]} disabled={saving} activeOpacity={0.7}>
                {saving ? <ActivityIndicator size={11} color="#FFF" /> : <Save size={13} color="#FFF" />}
                <Text style={[styles.editorActionBtnText, { color: "#FFF" }]}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleStartEdit} style={styles.editorActionBtn} activeOpacity={0.7}>
                <Pencil size={13} color={COLORS.mutedForeground} />
                <Text style={styles.editorActionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCopy} style={styles.editorActionBtn} activeOpacity={0.7}>
                {copied ? <Check size={13} color={COLORS.success} /> : <Copy size={13} color={COLORS.mutedForeground} />}
                <Text style={styles.editorActionBtnText}>{copied ? "Copied" : "Copy"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.editorActionBtn} activeOpacity={0.7}>
                <Share2 size={13} color={COLORS.mutedForeground} />
                <Text style={styles.editorActionBtnText}>Share</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Editor Content */}
      <View style={styles.editorContentArea}>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Opening file…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{(error as Error).message}</Text>
        ) : isEditing ? (
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={(t) => { setEditText(t); setDirty(true); }}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
        ) : (
          <ScrollView style={styles.codeScroll} showsVerticalScrollIndicator={false}>
            <CodeBlock code={data?.text || "(empty file)"} language={name.split(".").pop() || "text"} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

export function FilesScreen({ route }: { route?: { params?: { initialPath?: string; openFile?: string } } } = {}) {
  const navigation = useNavigation<any>();
  const { rpc } = useAva();
  const initialPath = route?.params?.initialPath;
  const initialOpenFile = route?.params?.openFile;

  const [root, setRoot] = useState<string>(initialPath || APP.defaultCwd);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [openFile, setOpenFile] = useState<string | null>(initialOpenFile || null);

  useEffect(() => { if (initialPath) setRoot(initialPath); }, [initialPath]);
  useEffect(() => {
    if (initialOpenFile) {
      setOpenFile(initialOpenFile);
      const parent = parentPath(initialOpenFile);
      if (parent) setRoot(parent);
    }
  }, [initialOpenFile]);

  const handleBack = useCallback(() => {
    if (openFile) { setOpenFile(null); return true; }
    if (root !== APP.defaultCwd && root !== "/") { setRoot(parentPath(root)); return true; }
    if (navigation?.canGoBack()) { navigation.goBack(); return true; }
    return false;
  }, [openFile, root, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => handleBack());
    return () => sub.remove();
  }, [handleBack]);

  const { refetch, isFetching, error } = useDirectory(root);
  const crumbs = useMemo(() => pathCrumbs(root), [root]);

  // ── File Operations ─────────────────────────────────────────────────

  const handleCreateFile = useCallback(() => {
    if (!rpc) return;
    // Alert.prompt is iOS-only; on Android show a terminal hint
    if (typeof Alert.prompt === "function") {
      Alert.prompt("Create File", "Enter file name:", async (name) => {
        if (!name) return;
        try {
          await writeTextFile(rpc, joinPath(root, name), "");
          refetch();
        } catch (err: any) {
          Alert.alert("Error", err?.message || "Failed to create file");
        }
      });
    } else {
      Alert.alert("Create File", "Use the terminal to create files:\ntouch filename");
    }
  }, [rpc, root, refetch]);

  const handleCreateFolder = useCallback(() => {
    if (!rpc) return;
    if (typeof Alert.prompt === "function") {
      Alert.prompt("Create Folder", "Enter folder name:", async (name) => {
        if (!name) return;
        try {
          await createDirectory(rpc, joinPath(root, name));
          refetch();
        } catch (err: any) {
          Alert.alert("Error", err?.message || "Failed to create folder");
        }
      });
    } else {
      Alert.alert("Create Folder", "Use the terminal:\nmkdir foldername");
    }
  }, [rpc, root, refetch]);

  const handleDelete = useCallback((entry: FileEntry) => {
    Alert.alert(
      `Delete ${entry.isDirectory ? "Folder" : "File"}`,
      `Are you sure you want to delete "${entry.name}"?${entry.isDirectory ? "\nThis will delete all contents." : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!rpc) return;
            try {
              await deletePath(rpc, entry.path);
              if (openFile === entry.path) setOpenFile(null);
              refetch();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  }, [rpc, openFile, refetch]);

  // ── Header ──────────────────────────────────────────────────────────

  const header = (
    <Surface style={styles.header}>
      {openFile ? (
        <>
          <View style={styles.hLeft}>
            <GlassIconButton icon={ChevronLeft} size={18} onPress={() => setOpenFile(null)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle} numberOfLines={1}>{openFile.split("/").pop()}</Text>
              <Text style={styles.hSub} numberOfLines={1}>{openFile}</Text>
            </View>
          </View>
          <View style={styles.hRight}>
            <GlassIconButton icon={Trash2} size={16} color={COLORS.destructive} onPress={() => handleDelete({ name: openFile.split("/").pop() || "", path: openFile, isDirectory: false })} />
            <GlassIconButton icon={X} size={16} onPress={() => setOpenFile(null)} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.hLeft}>
            {navigation.canGoBack() && <GlassIconButton icon={ChevronLeft} size={18} onPress={() => navigation.goBack()} />}
            <GlassIconButton icon={Menu} size={18} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crumbScroll}>
              <TouchableOpacity onPress={() => setRoot("/")} style={styles.crumbBtn}>
                <Text style={[styles.crumbRoot, mono("bold")]}>/</Text>
              </TouchableOpacity>
              {crumbs.map((crumb, idx) => (
                <View key={crumb.path} style={styles.crumbItem}>
                  <Text style={styles.crumbSlash}>/</Text>
                  <TouchableOpacity onPress={() => setRoot(crumb.path)} style={styles.crumbBtn}>
                    <Text style={[styles.crumbText, idx === crumbs.length - 1 && styles.crumbActive, font("medium")]} numberOfLines={1}>
                      {crumb.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={styles.hRight}>
            <GlassIconButton icon={FilePlus} size={16} onPress={handleCreateFile} />
            <GlassIconButton icon={FolderPlus} size={16} onPress={handleCreateFolder} />
            {root !== "/" && <GlassIconButton icon={ChevronLeft} size={17} onPress={() => setRoot(parentPath(root))} />}
            <GlassIconButton icon={Search} size={17} onPress={() => setShowSearch(!showSearch)} />
            <GlassIconButton icon={RefreshCw} size={17} disabled={isFetching} onPress={() => refetch()} />
          </View>
        </>
      )}
    </Surface>
  );

  return (
    <AppShell customHeader={header}>
      <View style={styles.container}>
        <View style={styles.codeCard}>
          {openFile ? (
            <FileEditor path={openFile} onBack={() => setOpenFile(null)} />
          ) : (
            <View style={{ flex: 1 }}>
              {showSearch && (
                <View style={styles.searchBar}>
                  <View style={styles.searchBox}>
                    <Search size={15} color={COLORS.mutedForeground} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Filter files…"
                      placeholderTextColor={COLORS.mutedForeground}
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {query && (
                      <TouchableOpacity onPress={() => setQuery("")}>
                        <X size={14} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              <ScrollView style={styles.treeScroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {error ? (
                  <EmptyState icon={Folder} title="Could not open folder" description={(error as Error).message} />
                ) : (
                  <TreeBranch path={root} depth={0} query={query} active={openFile} onOpen={(e) => setOpenFile(e.path)} onDelete={handleDelete} />
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </AppShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  header: { marginHorizontal: 12, marginTop: Platform.OS === "android" ? 8 : 4, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, height: 56 },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" },
  hRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  hTitle: { fontSize: 14, fontWeight: "700", color: COLORS.foreground },
  hSub: { fontSize: 10.5, color: COLORS.mutedForeground, marginTop: 1 },
  crumbScroll: { flexDirection: "row", alignItems: "center", gap: 2, paddingRight: 8 },
  crumbItem: { flexDirection: "row", alignItems: "center", gap: 2 },
  crumbBtn: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  crumbRoot: { fontSize: 13, color: COLORS.primary },
  crumbSlash: { fontSize: 12, color: COLORS.mutedForeground },
  crumbText: { fontSize: 12.5, color: COLORS.foreground },
  crumbActive: { color: COLORS.primary, fontWeight: "700" },

  codeCard: { flex: 1, backgroundColor: COLORS.codeBg, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)", overflow: "hidden" },
  searchBar: { padding: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: 10, paddingHorizontal: 10, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.codeForeground, paddingVertical: 0 },
  treeScroll: { flex: 1, paddingTop: 6 },
  treeRow: { flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingRight: 12 },
  treeRowActive: { backgroundColor: "rgba(255, 255, 255, 0.08)" },
  treeEntryName: { fontSize: 13, color: COLORS.codeForeground, flex: 1 },
  treeEntryNameActive: { color: COLORS.primary, fontWeight: "600" },

  editorContainer: { flex: 1 },
  editorSubHeader: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 12, backgroundColor: "rgba(255, 255, 255, 0.03)" },
  editorTab: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "50%" },
  editorTabText: { fontSize: 12.5, color: COLORS.codeForeground, fontWeight: "600" },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning },
  editorActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  editorActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "rgba(255, 255, 255, 0.06)" },
  editorActionBtnText: { fontSize: 11, color: COLORS.mutedForeground },
  saveBtn: { backgroundColor: COLORS.primary },
  editorContentArea: { flex: 1 },
  editInput: { flex: 1, fontSize: 13, lineHeight: 19, color: COLORS.codeForeground, backgroundColor: COLORS.codeBg, padding: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  codeScroll: { flex: 1, padding: 8 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 40 },
  loadingText: { fontSize: 13, color: COLORS.mutedForeground },
  errorText: { fontSize: 13, color: COLORS.destructive, padding: 16 },
});