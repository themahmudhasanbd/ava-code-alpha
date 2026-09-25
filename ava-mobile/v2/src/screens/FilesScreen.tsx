import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  File,
  FileCode2,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, GlassIconButton, SkeletonRows, Surface, Button } from "@/components/kit";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { APP } from "@/config/app";
import type { FileEntry } from "@/core/types";
import { parentPath } from "@/core/api/files";
import { useDirectory, useFileContent } from "@/state/queries";
import { COLORS } from "@/theme/colors";

export function FilesScreen() {
  const [currentPath, setCurrentPath] = useState(APP.defaultCwd);
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: dirEntries = [], isLoading, refetch } = useDirectory(currentPath);
  const { data: fileContent, isLoading: fileLoading } = useFileContent(
    activeFile && !activeFile.isDirectory ? activeFile.path : null
  );

  const filteredEntries = useMemo(() => {
    return dirEntries.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dirEntries, searchQuery]);

  const handleEntryPress = (entry: FileEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
    } else {
      setActiveFile(entry);
    }
  };

  const handleGoUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const parent = parentPath(currentPath);
    if (parent && parent !== currentPath) {
      setCurrentPath(parent);
    }
  };

  return (
    <AppShell
      title={currentPath.split("/").pop() || "Code"}
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={18}
          onPress={() => refetch()}
        />
      }
    >
      <View style={styles.container}>
        {/* Breadcrumb Path Bar */}
        <Surface style={styles.pathBar}>
          <TouchableOpacity
            style={styles.upBtn}
            onPress={handleGoUp}
            disabled={currentPath === "/"}
          >
            <ChevronLeft
              size={18}
              color={currentPath === "/" ? COLORS.mutedForeground : COLORS.foreground}
            />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={styles.pathText} numberOfLines={1}>
              {currentPath}
            </Text>
          </ScrollView>
        </Surface>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={15} color={COLORS.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search files…"
              placeholderTextColor={COLORS.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* File / Folder List */}
        {isLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonRows count={6} />
          </View>
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No files found"
            description="Directory is empty or no files match search."
          />
        ) : (
          <FlatList
            data={filteredEntries}
            keyExtractor={(item) => item.path}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const Icon = item.isDirectory ? Folder : FileCode2;
              return (
                <TouchableOpacity
                  style={styles.entryRow}
                  onPress={() => handleEntryPress(item)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={18}
                    color={item.isDirectory ? COLORS.primary : COLORS.mutedForeground}
                  />
                  <Text style={styles.entryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isDirectory ? (
                    <ChevronRight size={14} color={COLORS.mutedForeground} />
                  ) : item.size ? (
                    <Text style={styles.entrySize}>
                      {item.size > 1024
                        ? `${Math.round(item.size / 1024)} KB`
                        : `${item.size} B`}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* File Viewer Modal */}
        <Modal
          visible={activeFile !== null}
          animationType="slide"
          onRequestClose={() => setActiveFile(null)}
        >
          <View style={styles.fileViewerContainer}>
            <View style={styles.fileViewerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileViewerTitle} numberOfLines={1}>
                  {activeFile?.name}
                </Text>
                <Text style={styles.fileViewerPath} numberOfLines={1}>
                  {activeFile?.path}
                </Text>
              </View>
              <GlassIconButton
                icon={X}
                size={18}
                onPress={() => setActiveFile(null)}
              />
            </View>

            {fileLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Reading file…</Text>
              </View>
            ) : (
              <ScrollView style={styles.fileContentScroll}>
                <CodeBlock
                  code={fileContent ?? ""}
                  language={activeFile?.name.split(".").pop() || "text"}
                />
              </ScrollView>
            )}
          </View>
        </Modal>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pathBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  upBtn: {
    padding: 6,
    borderRadius: 8,
  },
  pathText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.mutedForeground,
  },
  searchContainer: {
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.input,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 2,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.glassBg,
    marginBottom: 2,
  },
  entryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  entrySize: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  fileViewerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 44 : 20,
  },
  fileViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.glassBg,
  },
  fileViewerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  fileViewerPath: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  fileContentScroll: {
    flex: 1,
    padding: 12,
  },
});
