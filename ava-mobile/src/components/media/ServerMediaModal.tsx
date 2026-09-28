import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { BlurView } from "expo-blur";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CornerLeftUp,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Server,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useDirectory } from "@/state/queries";
import { COLORS, useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { APP } from "@/config/app";

export interface ServerSelectedMedia {
  id: string;
  name: string;
  remotePath: string;
  kind: "image" | "video" | "audio" | "document" | "code" | "file";
  size?: number;
}

interface ServerMediaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: ServerSelectedMedia) => void;
  initialDirectory?: string;
}

type MediaFilterCategory = "all" | "image" | "video" | "audio" | "code" | "doc";

const EXT_TO_KIND: Record<string, ServerSelectedMedia["kind"]> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  flac: "audio",
  aac: "audio",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  py: "code",
  rs: "code",
  json: "code",
  html: "code",
  css: "code",
  sh: "code",
  bash: "code",
  yaml: "code",
  yml: "code",
  sql: "code",
  pdf: "document",
  txt: "document",
  md: "document",
  doc: "document",
  docx: "document",
  csv: "document",
  zip: "file",
  tar: "file",
  gz: "file",
};

export function getFileKind(fileName: string): ServerSelectedMedia["kind"] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_KIND[ext] || "file";
}

export function getKindIcon(kind: ServerSelectedMedia["kind"]): LucideIcon {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "code":
      return FileCode;
    case "document":
      return FileText;
    default:
      return FileQuestion;
  }
}

export function ServerMediaModal({
  open,
  onClose,
  onSelect,
  initialDirectory = APP.mediaDir || "/root/shared-media",
}: ServerMediaModalProps) {
  const { rpc, status } = useAva();
  const { isDark } = useTheme();

  const [currentDir, setCurrentDir] = useState<string>(initialDirectory);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MediaFilterCategory>("all");

  const {
    data: entries = [],
    isLoading,
    refetch,
    isRefetching,
  } = useDirectory(currentDir);

  const canGoUp = currentDir !== "/" && currentDir.length > 1;

  const handleGoUp = () => {
    if (!canGoUp) return;
    const parts = currentDir.replace(/\/+$/, "").split("/");
    parts.pop();
    const parent = parts.join("/") || "/";
    setCurrentDir(parent);
    setSearchQuery("");
  };

  const handleEnterFolder = (folderPath: string) => {
    setCurrentDir(folderPath);
    setSearchQuery("");
  };

  const handleSelectFile = (file: { name: string; path: string }) => {
    const kind = getFileKind(file.name);
    onSelect({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      remotePath: file.path,
      kind,
    });
    onClose();
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    if (activeCategory !== "all") {
      result = result.filter((e) => {
        if (e.isDirectory) return true; // keep folders visible
        const kind = getFileKind(e.name);
        if (activeCategory === "image") return kind === "image";
        if (activeCategory === "video") return kind === "video";
        if (activeCategory === "audio") return kind === "audio";
        if (activeCategory === "code") return kind === "code";
        if (activeCategory === "doc") return kind === "document";
        return true;
      });
    }

    return result;
  }, [entries, searchQuery, activeCategory]);

  const folders = filteredEntries.filter((e) => e.isDirectory);
  const files = filteredEntries.filter((e) => !e.isDirectory);

  const shortcutDirs = [
    { label: "Shared Media", path: APP.mediaDir || "/root/shared-media" },
    { label: "Project Code", path: APP.defaultCwd || "/var/www/ava-code" },
    { label: "Temp Files", path: "/tmp" },
  ];

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView
            intensity={85}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheetCard}>
              {/* Top Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconBox}>
                    <Server size={17} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, font("semibold")]}>
                      Select from Server
                    </Text>
                    <Text style={[styles.headerSubtitle, font("regular")]}>
                      Browse & pick media on VPS storage
                    </Text>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => refetch()}
                    disabled={isLoading || isRefetching}
                    activeOpacity={0.7}
                  >
                    <RefreshCw
                      size={15}
                      color={
                        isLoading || isRefetching
                          ? COLORS.primary
                          : COLORS.mutedForeground
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Current Directory & Breadcrumbs */}
              <View style={styles.pathBar}>
                {canGoUp && (
                  <TouchableOpacity
                    style={styles.goUpBtn}
                    onPress={handleGoUp}
                    activeOpacity={0.7}
                  >
                    <CornerLeftUp size={14} color={COLORS.primary} />
                    <Text style={[styles.goUpText, font("medium")]}>Up</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.pathPill}>
                  <FolderOpen size={13} color={COLORS.primary} />
                  <Text
                    style={[styles.pathText, mono("regular")]}
                    numberOfLines={1}
                    ellipsizeMode="head"
                  >
                    {currentDir}
                  </Text>
                </View>
              </View>

              {/* Quick Preset Directories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {shortcutDirs.map((dir) => {
                  const isActive = currentDir === dir.path;
                  return (
                    <TouchableOpacity
                      key={dir.path}
                      style={[
                        styles.presetChip,
                        isActive && styles.presetChipActive,
                      ]}
                      onPress={() => {
                        setCurrentDir(dir.path);
                        setSearchQuery("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          font(isActive ? "semibold" : "regular"),
                          isActive && styles.presetChipTextActive,
                        ]}
                      >
                        {dir.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={14} color={COLORS.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, font("regular")]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Filter server files by name…"
                  placeholderTextColor={COLORS.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter Chips */}
              <View style={styles.categoryRow}>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "image", label: "Images" },
                    { key: "video", label: "Videos" },
                    { key: "audio", label: "Audio" },
                    { key: "code", label: "Code" },
                    { key: "doc", label: "Docs" },
                  ] as const
                ).map((cat) => {
                  const isSelected = activeCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipActive,
                      ]}
                      onPress={() => setActiveCategory(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          font(isSelected ? "semibold" : "regular"),
                          isSelected && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Content Area */}
              {isLoading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={[styles.stateText, font("medium")]}>
                    Reading server directory…
                  </Text>
                </View>
              ) : status !== "online" && !rpc ? (
                <View style={styles.centerState}>
                  <Server size={28} color={COLORS.mutedForeground} />
                  <Text style={[styles.stateTitle, font("semibold")]}>
                    Server RPC Offline
                  </Text>
                  <Text style={[styles.stateText, font("regular")]}>
                    Connect to AvA backend to browse server files.
                  </Text>
                </View>
              ) : folders.length === 0 && files.length === 0 ? (
                <View style={styles.centerState}>
                  <FolderOpen size={32} color={COLORS.mutedForeground} />
                  <Text style={[styles.stateTitle, font("semibold")]}>
                    No files found
                  </Text>
                  <Text style={[styles.stateText, font("regular")]}>
                    {searchQuery
                      ? `No matches for "${searchQuery}"`
                      : "This directory has no matching media or files"}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.fileListScroll}
                  contentContainerStyle={styles.fileListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Folders List */}
                  {folders.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <Text style={[styles.sectionTitle, font("semibold")]}>
                        FOLDERS ({folders.length})
                      </Text>
                      {folders.map((folder) => (
                        <TouchableOpacity
                          key={folder.path}
                          style={styles.folderRow}
                          onPress={() => handleEnterFolder(folder.path)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.folderIconBox}>
                            <Folder size={16} color={COLORS.primary} />
                          </View>
                          <View style={styles.entryInfo}>
                            <Text
                              style={[styles.entryName, font("semibold")]}
                              numberOfLines={1}
                            >
                              {folder.name}
                            </Text>
                            <Text
                              style={[styles.entrySub, mono("regular")]}
                              numberOfLines={1}
                            >
                              Directory
                            </Text>
                          </View>
                          <ChevronRight size={16} color={COLORS.mutedForeground} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Files List */}
                  {files.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <Text style={[styles.sectionTitle, font("semibold")]}>
                        FILES ({files.length})
                      </Text>
                      {files.map((file) => {
                        const kind = getFileKind(file.name);
                        const IconComponent = getKindIcon(kind);
                        const ext =
                          file.name.split(".").pop()?.toUpperCase() || "FILE";

                        return (
                          <TouchableOpacity
                            key={file.path}
                            style={styles.fileRow}
                            onPress={() => handleSelectFile(file)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.fileIconBox}>
                              <IconComponent size={16} color={COLORS.primary} />
                            </View>
                            <View style={styles.entryInfo}>
                              <Text
                                style={[styles.entryName, font("semibold")]}
                                numberOfLines={1}
                              >
                                {file.name}
                              </Text>
                              <View style={styles.fileMetaRow}>
                                <View style={styles.kindBadge}>
                                  <Text
                                    style={[styles.kindBadgeText, mono("bold")]}
                                  >
                                    {ext}
                                  </Text>
                                </View>
                                <Text
                                  style={[styles.entrySub, mono("regular")]}
                                  numberOfLines={1}
                                >
                                  {file.path}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.selectBtn}>
                              <Text style={[styles.selectBtnText, font("semibold")]}>
                                Attach
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingHorizontal: 16,
    maxHeight: "90%",
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    color: COLORS.foreground,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  pathBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  goUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goUpText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  pathPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pathText: {
    fontSize: 11.5,
    color: COLORS.foreground,
    flex: 1,
  },
  presetsRow: {
    gap: 6,
    paddingVertical: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  presetChipText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  presetChipTextActive: {
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  categoryChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  categoryChipTextActive: {
    color: COLORS.primaryForeground,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  stateTitle: {
    fontSize: 14,
    color: COLORS.foreground,
    marginTop: 4,
  },
  stateText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  fileListScroll: {
    maxHeight: 380,
  },
  fileListContent: {
    gap: 12,
    paddingBottom: 16,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  folderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  entrySub: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  kindBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  kindBadgeText: {
    fontSize: 9,
    color: COLORS.primary,
  },
  selectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  selectBtnText: {
    fontSize: 11.5,
    color: COLORS.primaryForeground,
  },
});
