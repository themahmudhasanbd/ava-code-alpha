import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  File as FileIcon,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  FolderGit2,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Images,
  RefreshCw,
  Search,
  Server,
  UploadCloud,
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
  allowUpload?: boolean;
}

type MediaFilterCategory = "all" | "media" | "docs" | "code";

const EXT_TO_KIND: Record<string, ServerSelectedMedia["kind"]> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
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
  php: "code",
  dart: "code",
  pdf: "document",
  txt: "document",
  md: "document",
  doc: "document",
  docx: "document",
  csv: "document",
  xlsx: "document",
  zip: "file",
  tar: "file",
  gz: "file",
};

export function getFileKind(fileName: string): ServerSelectedMedia["kind"] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_KIND[ext] || "file";
}

export function getKindColor(kind: ServerSelectedMedia["kind"]): string {
  switch (kind) {
    case "image":
      return "#10B981"; // emerald
    case "video":
      return "#F59E0B"; // amber
    case "audio":
      return "#EC4899"; // pink
    case "code":
      return "#6366F1"; // indigo
    case "document":
      return "#EF4444"; // red
    default:
      return "#6B7280"; // slate
  }
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
  allowUpload = true,
}: ServerMediaModalProps) {
  const { rpc } = useAva();
  const { isDark } = useTheme();

  const [currentDir, setCurrentDir] = useState<string>(initialDirectory);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MediaFilterCategory>("all");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
    kind: ServerSelectedMedia["kind"];
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);

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
    setSelectedFile(null);
  };

  const handleEnterFolder = (folderPath: string) => {
    setCurrentDir(folderPath);
    setSearchQuery("");
    setSelectedFile(null);
  };

  const handleSelectFileItem = (file: { name: string; path: string }) => {
    const kind = getFileKind(file.name);
    setSelectedFile({
      name: file.name,
      path: file.path,
      kind,
    });
  };

  const handleConfirmAttach = () => {
    if (!selectedFile) return;
    onSelect({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: selectedFile.name,
      remotePath: selectedFile.path,
      kind: selectedFile.kind,
    });
    onClose();
  };

  // Direct upload to current browsing directory inspired by Flutter ServerFilePickerModal
  const handleUploadToCurrentDir = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        setIsUploading(true);
        const cleanName = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetPath = `${currentDir.replace(/\/$/, "")}/${cleanName}`;

        if (rpc && rpc.status === "online") {
          const localFile = new File(doc.uri);
          const base64 = await localFile.base64();
          await rpc.call("fs/writeFile", {
            path: targetPath,
            dataBase64: base64,
          });
        }

        setIsUploading(false);
        const kind = getFileKind(cleanName);
        setSelectedFile({
          name: cleanName,
          path: targetPath,
          kind,
        });
        refetch();
        Alert.alert("Uploaded", `Successfully uploaded "${cleanName}" to ${currentDir}`);
      }
    } catch (e: any) {
      setIsUploading(false);
      Alert.alert("Upload Error", e?.message || "Failed to upload file to current server directory.");
    }
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    if (activeCategory !== "all") {
      result = result.filter((e) => {
        if (e.isDirectory) return true;
        const kind = getFileKind(e.name);
        if (activeCategory === "media") return kind === "image" || kind === "video" || kind === "audio";
        if (activeCategory === "docs") return kind === "document";
        if (activeCategory === "code") return kind === "code";
        return true;
      });
    }

    return result;
  }, [entries, searchQuery, activeCategory]);

  const folders = filteredEntries.filter((e) => e.isDirectory);
  const files = filteredEntries.filter((e) => !e.isDirectory);

  const shortcutDirs = [
    { label: "Shared Media", path: APP.mediaDir || "/root/shared-media", icon: Images },
    { label: "Workspace", path: APP.defaultCwd || "/var/www/ava-code", icon: FolderGit2 },
    { label: "Root /", path: "/", icon: HardDrive },
    { label: "Temp", path: "/tmp", icon: Folder },
  ];

  const pathSegments = currentDir.split("/").filter((s) => s.length > 0);

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
              {/* Drag Handle Bar */}
              <View style={styles.handleBar} />

              {/* Modal Top Bar */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconBox}>
                    <Server size={18} color="#6366F1" />
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, font("bold")]}>
                      Select Server File
                    </Text>
                    <Text style={[styles.headerSubtitle, font("regular")]}>
                      Pick media or documents to attach to prompt
                    </Text>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  {allowUpload && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleUploadToCurrentDir}
                      disabled={isUploading}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <UploadCloud size={17} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Location Shortcuts Row matching Flutter ServerFilePickerModal */}
              <View style={styles.shortcutsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shortcutsRow}
                >
                  {shortcutDirs.map((sc) => {
                    const isActive = currentDir === sc.path;
                    const IconComp = sc.icon;
                    return (
                      <TouchableOpacity
                        key={sc.path}
                        style={[
                          styles.shortcutChip,
                          isActive && styles.shortcutChipActive,
                        ]}
                        onPress={() => {
                          setCurrentDir(sc.path);
                          setSearchQuery("");
                          setSelectedFile(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <IconComp
                          size={13}
                          color={isActive ? "#6366F1" : COLORS.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.shortcutChipText,
                            isActive && styles.shortcutChipTextActive,
                            font("medium"),
                          ]}
                        >
                          {sc.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Breadcrumb Navigation Bar */}
              <View style={styles.breadcrumbBar}>
                <TouchableOpacity
                  style={[styles.upBtn, !canGoUp && styles.upBtnDisabled]}
                  onPress={handleGoUp}
                  disabled={!canGoUp}
                  activeOpacity={0.7}
                >
                  <ArrowUp
                    size={15}
                    color={canGoUp ? "#6366F1" : COLORS.mutedForeground}
                  />
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.breadcrumbScroll}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setCurrentDir("/");
                      setSearchQuery("");
                      setSelectedFile(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.breadcrumbSegment,
                        currentDir === "/" && styles.breadcrumbSegmentActive,
                        mono("medium"),
                      ]}
                    >
                      /
                    </Text>
                  </TouchableOpacity>

                  {pathSegments.map((segment, index) => {
                    const pathUpToSegment = "/" + pathSegments.slice(0, index + 1).join("/");
                    const isLast = index === pathSegments.length - 1;
                    return (
                      <React.Fragment key={pathUpToSegment}>
                        <Text style={[styles.breadcrumbDivider, mono("regular")]}>/</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setCurrentDir(pathUpToSegment);
                            setSearchQuery("");
                            setSelectedFile(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.breadcrumbSegment,
                              isLast && styles.breadcrumbSegmentActive,
                              mono(isLast ? "bold" : "regular"),
                            ]}
                          >
                            {segment}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={() => refetch()}
                  disabled={isLoading || isRefetching}
                  activeOpacity={0.7}
                >
                  <RefreshCw
                    size={14}
                    color={
                      isLoading || isRefetching
                        ? "#6366F1"
                        : COLORS.mutedForeground
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Search & Filter Category Row matching Flutter */}
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBox}>
                  <Search size={14} color={COLORS.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, font("regular")]}
                    placeholder="Filter files in this folder..."
                    placeholderTextColor={COLORS.mutedForeground}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
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

                {/* Filter Pills: All, Media, Docs, Code */}
                <View style={styles.categoryPills}>
                  {(["all", "media", "docs", "code"] as MediaFilterCategory[]).map((cat) => {
                    const active = activeCategory === cat;
                    const label = cat === "all" ? "All" : cat === "media" ? "Media" : cat === "docs" ? "Docs" : "Code";
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catPill, active && styles.catPillActive]}
                        onPress={() => setActiveCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            active && styles.catPillTextActive,
                            font("medium"),
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Directory Content List */}
              <View style={styles.listContainer}>
                {isLoading ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={[styles.loadingText, font("regular")]}>
                      Loading directory contents…
                    </Text>
                  </View>
                ) : filteredEntries.length === 0 ? (
                  <View style={styles.centerBox}>
                    <FolderOpen size={36} color={COLORS.mutedForeground} />
                    <Text style={[styles.emptyTitle, font("medium")]}>
                      No files found in this folder
                    </Text>
                    {allowUpload && (
                      <TouchableOpacity
                        style={styles.emptyUploadBtn}
                        onPress={handleUploadToCurrentDir}
                        activeOpacity={0.7}
                      >
                        <UploadCloud size={14} color="#6366F1" />
                        <Text style={[styles.emptyUploadBtnText, font("medium")]}>
                          Upload File Here
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <ScrollView
                    style={styles.itemsList}
                    contentContainerStyle={styles.itemsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Folders first */}
                    {folders.map((folder) => (
                      <TouchableOpacity
                        key={folder.path}
                        style={styles.folderRow}
                        onPress={() => handleEnterFolder(folder.path)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.folderIconBox}>
                          <Folder size={17} color="#F59E0B" />
                        </View>
                        <View style={styles.itemMeta}>
                          <Text
                            style={[styles.itemName, font("semibold")]}
                            numberOfLines={1}
                          >
                            {folder.name}
                          </Text>
                          <Text style={[styles.itemSub, font("regular")]}>
                            Folder
                          </Text>
                        </View>
                        <ChevronRight size={15} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    ))}

                    {/* Files */}
                    {files.map((file) => {
                      const kind = getFileKind(file.name);
                      const IconComp = getKindIcon(kind);
                      const color = getKindColor(kind);
                      const isSelected = selectedFile?.path === file.path;

                      return (
                        <TouchableOpacity
                          key={file.path}
                          style={[
                            styles.fileRow,
                            isSelected && styles.fileRowSelected,
                          ]}
                          onPress={() => handleSelectFileItem(file)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.fileIconBox,
                              { backgroundColor: `${color}18` },
                            ]}
                          >
                            <IconComp size={17} color={color} />
                          </View>
                          <View style={styles.itemMeta}>
                            <Text
                              style={[
                                styles.itemName,
                                isSelected && { color: "#6366F1" },
                                font(isSelected ? "bold" : "medium"),
                              ]}
                              numberOfLines={1}
                            >
                              {file.name}
                            </Text>
                            <Text style={[styles.itemSub, mono("regular")]}>
                              {kind.toUpperCase()}
                            </Text>
                          </View>

                          {/* Selection indicator */}
                          {isSelected ? (
                            <CheckCircle2 size={18} color="#10B981" />
                          ) : (
                            <View style={styles.unselectedCircle} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Bottom Action Bar matching Flutter */}
              <View style={styles.bottomBar}>
                <View style={styles.bottomMeta}>
                  <Text
                    style={[
                      styles.bottomSelectedTitle,
                      selectedFile && { color: COLORS.foreground },
                      font("bold"),
                    ]}
                    numberOfLines={1}
                  >
                    {selectedFile
                      ? `Selected: ${selectedFile.name}`
                      : "No file selected"}
                  </Text>
                  {selectedFile ? (
                    <Text
                      style={[styles.bottomSelectedPath, mono("regular")]}
                      numberOfLines={1}
                    >
                      {selectedFile.path}
                    </Text>
                  ) : (
                    <Text style={[styles.bottomSelectedHint, font("regular")]}>
                      Tap any file to select it
                    </Text>
                  )}
                </View>

                <View style={styles.bottomActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, font("medium")]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.attachBtn,
                      !selectedFile && styles.attachBtnDisabled,
                    ]}
                    onPress={handleConfirmAttach}
                    disabled={!selectedFile}
                    activeOpacity={0.8}
                  >
                    <Check size={15} color="#FFF" />
                    <Text style={[styles.attachBtnText, font("bold")]}>
                      Attach File
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    maxHeight: "88%",
    height: "82%",
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
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    borderRadius: 9,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  headerSubtitle: {
    fontSize: 11,
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
  shortcutsWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 6,
  },
  shortcutChip: {
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
  shortcutChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  shortcutChipText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  shortcutChipTextActive: {
    color: "#6366F1",
    fontWeight: "600",
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  upBtn: {
    padding: 4,
    borderRadius: 6,
  },
  upBtnDisabled: {
    opacity: 0.35,
  },
  breadcrumbScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexGrow: 1,
  },
  breadcrumbSegment: {
    fontSize: 12,
    color: COLORS.foreground,
    paddingHorizontal: 2,
  },
  breadcrumbSegmentActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  breadcrumbDivider: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginHorizontal: 1,
  },
  refreshBtn: {
    padding: 4,
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  categoryPills: {
    flexDirection: "row",
    gap: 4,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  catPillText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  catPillTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  listContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyTitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    marginTop: 4,
  },
  emptyUploadBtnText: {
    fontSize: 12,
    color: "#6366F1",
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  folderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  fileRowSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  fileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  itemSub: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  unselectedCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: COLORS.mutedForeground,
    opacity: 0.4,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 32 : 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  bottomMeta: {
    flex: 1,
    marginRight: 10,
  },
  bottomSelectedTitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  bottomSelectedPath: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  bottomSelectedHint: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#6366F1",
  },
  attachBtnDisabled: {
    opacity: 0.4,
  },
  attachBtnText: {
    fontSize: 12.5,
    color: "#FFF",
  },
});
