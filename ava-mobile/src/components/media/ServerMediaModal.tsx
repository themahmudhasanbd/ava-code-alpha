import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image as RNImage,
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
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
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
  LayoutGrid,
  LayoutList,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useDirectory } from "@/state/queries";
import { COLORS, useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { APP } from "@/config/app";
import { CodeBlock } from "@/components/ai-elements/code-block";

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

type MediaFilterCategory = "all" | "images" | "media" | "docs" | "code";
type ViewMode = "list" | "grid";

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
  toml: "code",
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

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
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
      return "#8B5CF6"; // violet
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

// In-memory cache for loaded image previews
const imageThumbnailCache = new Map<string, string>();

/** Lazy thumbnail loader for images */
function LazyImageThumbnail({
  filePath,
  fileName,
  size = 48,
}: {
  filePath: string;
  fileName: string;
  size?: number;
}) {
  const { rpc } = useAva();
  const [base64Uri, setBase64Uri] = useState<string | null>(
    imageThumbnailCache.get(filePath) || null
  );

  useEffect(() => {
    let isMounted = true;
    if (base64Uri) return;

    const ext = getFileExtension(fileName);
    if (!["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext)) {
      return;
    }

    if (rpc && rpc.status === "online") {
      rpc
        .call<{ dataBase64?: string }>("fs/readFile", { path: filePath })
        .then((res) => {
          if (isMounted && res.dataBase64) {
            const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
            const uri = `data:${mime};base64,${res.dataBase64}`;
            imageThumbnailCache.set(filePath, uri);
            setBase64Uri(uri);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [filePath, fileName, rpc, base64Uri]);

  if (base64Uri) {
    return (
      <RNImage
        source={{ uri: base64Uri }}
        style={{ width: size, height: size, borderRadius: 8 }}
        resizeMode="cover"
      />
    );
  }

  return <ImageIcon size={size * 0.55} color="#10B981" />;
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
    kind: ServerSelectedMedia["kind"];
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // Preview overlay state
  const [previewItem, setPreviewItem] = useState<{
    name: string;
    path: string;
    kind: ServerSelectedMedia["kind"];
  } | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [copiedPath, setCopiedPath] = useState(false);

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

  const handleConfirmAttach = (fileToAttach = selectedFile) => {
    if (!fileToAttach) return;
    onSelect({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fileToAttach.name,
      remotePath: fileToAttach.path,
      kind: fileToAttach.kind,
    });
    setPreviewItem(null);
    onClose();
  };

  // Open rich preview for a specific file
  const handleOpenPreview = async (file: { name: string; path: string; kind?: ServerSelectedMedia["kind"] }) => {
    const kind = file.kind || getFileKind(file.name);
    const item = { name: file.name, path: file.path, kind };
    setSelectedFile(item);
    setPreviewItem(item);
    setPreviewBase64(null);
    setPreviewTextContent(null);
    setPreviewZoom(1);
    setCopiedPath(false);

    const ext = getFileExtension(file.name);
    const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext);
    const isText = [
      "txt", "md", "json", "ts", "tsx", "js", "jsx", "py", "rs", "html",
      "css", "sh", "yaml", "yml", "log", "sql", "env", "toml", "bash", "php", "dart",
    ].includes(ext);

    if (rpc && rpc.status === "online" && (isImg || isText)) {
      setIsLoadingPreview(true);
      try {
        const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", {
          path: file.path,
        });
        if (res.dataBase64) {
          if (isImg) {
            const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
            const uri = `data:${mime};base64,${res.dataBase64}`;
            imageThumbnailCache.set(file.path, uri);
            setPreviewBase64(uri);
          } else if (isText) {
            try {
              const binary = atob(res.dataBase64);
              const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
              const decoded = new TextDecoder().decode(bytes);
              setPreviewTextContent(decoded);
            } catch {
              setPreviewTextContent(res.dataBase64);
            }
          }
        }
      } catch (err) {
        console.warn("Could not read file preview:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  const handleCopyFilePath = async (path: string) => {
    await Clipboard.setStringAsync(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Direct upload to current browsing directory
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
        if (activeCategory === "images") return kind === "image";
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
      animationType="fade"
      onRequestClose={() => {
        if (previewItem) {
          setPreviewItem(null);
        } else {
          onClose();
        }
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (previewItem) setPreviewItem(null);
          else onClose();
        }}
      >
        <View style={styles.backdrop}>
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.floatingDialogCard,
                {
                  backgroundColor: isDark ? "#11131A" : "#FFFFFF",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              {/* Modal Top Header Bar */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconBox}>
                    <Server size={18} color="#6366F1" />
                  </View>
                  <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, font("bold")]} numberOfLines={1}>
                      Select from Server
                    </Text>
                    <Text style={[styles.headerSubtitle, font("regular")]} numberOfLines={1}>
                      {currentDir} ({filteredEntries.length} items)
                    </Text>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  {/* View Mode Toggle Switcher: List vs Grid */}
                  <View style={styles.viewToggleGroup}>
                    <TouchableOpacity
                      style={[
                        styles.viewToggleBtn,
                        viewMode === "list" && styles.viewToggleBtnActive,
                      ]}
                      onPress={() => setViewMode("list")}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <LayoutList
                        size={15}
                        color={viewMode === "list" ? "#6366F1" : COLORS.mutedForeground}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.viewToggleBtn,
                        viewMode === "grid" && styles.viewToggleBtnActive,
                      ]}
                      onPress={() => setViewMode("grid")}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <LayoutGrid
                        size={15}
                        color={viewMode === "grid" ? "#6366F1" : COLORS.mutedForeground}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Direct Upload CTA */}
                  {allowUpload && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={handleUploadToCurrentDir}
                      disabled={isUploading}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <UploadCloud size={16} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Refresh */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => refetch()}
                    disabled={isLoading || isRefetching}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <RefreshCw
                      size={15}
                      color={
                        isLoading || isRefetching ? "#6366F1" : COLORS.mutedForeground
                      }
                    />
                  </TouchableOpacity>

                  {/* Close Modal */}
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Location Shortcuts Bar */}
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
              </View>

              {/* Search & Filter Category Row */}
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBox}>
                  <Search size={14} color={COLORS.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, font("regular")]}
                    placeholder="Search in folder..."
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

                {/* Filter Pills: All, Images, Media, Docs, Code */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPills}
                >
                  {(["all", "images", "media", "docs", "code"] as MediaFilterCategory[]).map(
                    (cat) => {
                      const active = activeCategory === cat;
                      const label =
                        cat === "all"
                          ? "All"
                          : cat === "images"
                            ? "Images"
                            : cat === "media"
                              ? "Media"
                              : cat === "docs"
                                ? "Docs"
                                : "Code";
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
                    }
                  )}
                </ScrollView>
              </View>

              {/* Main Browsing Content Viewport */}
              <View style={styles.contentContainer}>
                {isLoading ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={[styles.loadingText, font("regular")]}>
                      Loading directory contents…
                    </Text>
                  </View>
                ) : filteredEntries.length === 0 ? (
                  <View style={styles.centerBox}>
                    <FolderOpen size={40} color={COLORS.mutedForeground} />
                    <Text style={[styles.emptyTitle, font("medium")]}>
                      No files or folders found
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
                ) : viewMode === "list" ? (
                  /* ===================== LIST VIEW ===================== */
                  <ScrollView
                    style={styles.scrollList}
                    contentContainerStyle={styles.listContent}
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
                            Folder · Tap to open
                          </Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    ))}

                    {/* Files */}
                    {files.map((file) => {
                      const kind = getFileKind(file.name);
                      const IconComp = getKindIcon(kind);
                      const color = getKindColor(kind);
                      const isSelected = selectedFile?.path === file.path;
                      const ext = getFileExtension(file.name).toUpperCase();
                      const isImage = kind === "image";

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
                              { backgroundColor: `${color}16` },
                            ]}
                          >
                            {isImage ? (
                              <LazyImageThumbnail
                                filePath={file.path}
                                fileName={file.name}
                                size={34}
                              />
                            ) : (
                              <IconComp size={17} color={color} />
                            )}
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
                            <View style={styles.itemSubRow}>
                              <View
                                style={[
                                  styles.extPill,
                                  { backgroundColor: `${color}18` },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.extPillText,
                                    { color },
                                    mono("bold"),
                                  ]}
                                >
                                  {ext || kind.toUpperCase()}
                                </Text>
                              </View>
                              <Text
                                style={[styles.itemSubPath, mono("regular")]}
                                numberOfLines={1}
                              >
                                {file.path}
                              </Text>
                            </View>
                          </View>

                          {/* Quick Preview Button */}
                          <TouchableOpacity
                            style={styles.rowPreviewBtn}
                            onPress={() => handleOpenPreview(file)}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            activeOpacity={0.7}
                          >
                            <Eye size={14} color="#6366F1" />
                          </TouchableOpacity>

                          {/* Selection indicator */}
                          {isSelected ? (
                            <CheckCircle2 size={19} color="#10B981" />
                          ) : (
                            <View style={styles.unselectedCircle} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  /* ===================== GRID VIEW ===================== */
                  <ScrollView
                    style={styles.scrollList}
                    contentContainerStyle={styles.gridContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.gridRowWrap}>
                      {/* Folders */}
                      {folders.map((folder) => (
                        <TouchableOpacity
                          key={folder.path}
                          style={styles.gridFolderCard}
                          onPress={() => handleEnterFolder(folder.path)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.gridFolderIconBox}>
                            <Folder size={28} color="#F59E0B" />
                          </View>
                          <Text
                            style={[styles.gridCardTitle, font("semibold")]}
                            numberOfLines={1}
                          >
                            {folder.name}
                          </Text>
                          <View style={styles.folderBadge}>
                            <Text style={[styles.folderBadgeText, font("medium")]}>
                              DIR
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Files */}
                      {files.map((file) => {
                        const kind = getFileKind(file.name);
                        const IconComp = getKindIcon(kind);
                        const color = getKindColor(kind);
                        const isSelected = selectedFile?.path === file.path;
                        const ext = getFileExtension(file.name).toUpperCase();
                        const isImage = kind === "image";

                        return (
                          <TouchableOpacity
                            key={file.path}
                            style={[
                              styles.gridFileCard,
                              isSelected && styles.gridFileCardSelected,
                            ]}
                            onPress={() => handleSelectFileItem(file)}
                            activeOpacity={0.75}
                          >
                            {/* Card Top Preview Box */}
                            <View
                              style={[
                                styles.gridThumbnailBox,
                                { backgroundColor: `${color}0F` },
                              ]}
                            >
                              {isImage ? (
                                <LazyImageThumbnail
                                  filePath={file.path}
                                  fileName={file.name}
                                  size={76}
                                />
                              ) : (
                                <IconComp size={32} color={color} />
                              )}

                              {/* Top-Left Floating Preview Button */}
                              <TouchableOpacity
                                style={styles.gridPreviewAction}
                                onPress={() => handleOpenPreview(file)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                activeOpacity={0.7}
                              >
                                <Eye size={12} color="#FFF" />
                              </TouchableOpacity>

                              {/* Top-Right Selection Indicator */}
                              <View style={styles.gridSelectBadge}>
                                {isSelected ? (
                                  <CheckCircle2 size={17} color="#10B981" />
                                ) : (
                                  <View style={styles.gridUnselectedCircle} />
                                )}
                              </View>

                              {/* Bottom-Right Extension Tag */}
                              <View style={styles.gridExtTag}>
                                <Text
                                  style={[styles.gridExtTagText, mono("bold")]}
                                >
                                  {ext || "FILE"}
                                </Text>
                              </View>
                            </View>

                            {/* Card Footer Info */}
                            <View style={styles.gridCardFooter}>
                              <Text
                                style={[
                                  styles.gridCardTitle,
                                  isSelected && { color: "#6366F1" },
                                  font(isSelected ? "bold" : "medium"),
                                ]}
                                numberOfLines={1}
                              >
                                {file.name}
                              </Text>
                              <Text
                                style={[styles.gridCardKind, mono("regular")]}
                                numberOfLines={1}
                              >
                                {kind.toUpperCase()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Bottom Browser Action Bar */}
              <View style={styles.bottomBar}>
                <View style={styles.bottomMeta}>
                  <View style={styles.bottomMetaHeader}>
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
                    {selectedFile && (
                      <TouchableOpacity
                        style={styles.previewQuickPill}
                        onPress={() => handleOpenPreview(selectedFile)}
                        activeOpacity={0.7}
                      >
                        <Eye size={12} color="#6366F1" />
                        <Text style={[styles.previewQuickPillText, font("semibold")]}>
                          Preview
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {selectedFile ? (
                    <Text
                      style={[styles.bottomSelectedPath, mono("regular")]}
                      numberOfLines={1}
                    >
                      {selectedFile.path}
                    </Text>
                  ) : (
                    <Text style={[styles.bottomSelectedHint, font("regular")]}>
                      Tap any file to select it, or tap Eye to preview
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
                    onPress={() => handleConfirmAttach()}
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

              {/* ===================== RICH PREVIEW MODAL / OVERLAY ===================== */}
              {previewItem && (
                <View style={styles.previewOverlay}>
                  <View
                    style={[
                      styles.previewCard,
                      {
                        backgroundColor: isDark ? "#161822" : "#FFFFFF",
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.15)"
                          : "rgba(0, 0, 0, 0.12)",
                      },
                    ]}
                  >
                    {/* Preview Top Header */}
                    <View style={styles.previewHeader}>
                      <View style={styles.previewTitleGroup}>
                        <View style={styles.previewBadgeRow}>
                          <View
                            style={[
                              styles.extPill,
                              {
                                backgroundColor: `${getKindColor(
                                  previewItem.kind
                                )}20`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.extPillText,
                                { color: getKindColor(previewItem.kind) },
                                mono("bold"),
                              ]}
                            >
                              {getFileExtension(
                                previewItem.name
                              ).toUpperCase() ||
                                previewItem.kind.toUpperCase()}
                            </Text>
                          </View>
                          <Text
                            style={[styles.previewFileName, font("bold")]}
                            numberOfLines={1}
                          >
                            {previewItem.name}
                          </Text>
                        </View>
                        <Text
                          style={[styles.previewPathText, mono("regular")]}
                          numberOfLines={1}
                        >
                          {previewItem.path}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.previewCloseBtn}
                        onPress={() => setPreviewItem(null)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={16} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    </View>

                    {/* Preview Body Content */}
                    <View style={styles.previewBody}>
                      {isLoadingPreview ? (
                        <View style={styles.previewCenterBox}>
                          <ActivityIndicator size="small" color="#6366F1" />
                          <Text style={[styles.previewLoadingText, font("regular")]}>
                            Reading file content from VPS…
                          </Text>
                        </View>
                      ) : previewBase64 ? (
                        /* Image Viewer with Zoom Controls */
                        <View style={styles.imageViewerWrap}>
                          <View style={styles.zoomControls}>
                            <TouchableOpacity
                              style={styles.zoomBtn}
                              onPress={() =>
                                setPreviewZoom((z) => Math.max(0.5, z - 0.25))
                              }
                              activeOpacity={0.7}
                            >
                              <ZoomOut size={14} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.zoomBtn}
                              onPress={() => setPreviewZoom(1)}
                              activeOpacity={0.7}
                            >
                              <RotateCcw size={13} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.zoomBtn}
                              onPress={() =>
                                setPreviewZoom((z) => Math.min(3, z + 0.25))
                              }
                              activeOpacity={0.7}
                            >
                              <ZoomIn size={14} color="#FFF" />
                            </TouchableOpacity>
                          </View>

                          <ScrollView
                            horizontal
                            contentContainerStyle={styles.imageScrollContainer}
                            showsHorizontalScrollIndicator={false}
                          >
                            <ScrollView
                              contentContainerStyle={styles.imageScrollContainer}
                              showsVerticalScrollIndicator={false}
                            >
                              <RNImage
                                source={{ uri: previewBase64 }}
                                style={[
                                  styles.fullPreviewImage,
                                  { transform: [{ scale: previewZoom }] },
                                ]}
                                resizeMode="contain"
                              />
                            </ScrollView>
                          </ScrollView>
                        </View>
                      ) : previewTextContent !== null ? (
                        /* Syntax-Highlighted Code / Text Viewer */
                        <ScrollView
                          style={styles.codePreviewScroll}
                          showsVerticalScrollIndicator={false}
                        >
                          <CodeBlock
                            code={previewTextContent || "(empty file)"}
                            language={getFileExtension(previewItem.name)}
                          />
                        </ScrollView>
                      ) : (
                        /* Generic File Inspection Box */
                        <View style={styles.genericFileBox}>
                          <View
                            style={[
                              styles.genericIconCircle,
                              {
                                backgroundColor: `${getKindColor(
                                  previewItem.kind
                                )}18`,
                              },
                            ]}
                          >
                            {previewItem.kind === "video" ? (
                              <FileVideo size={42} color="#F59E0B" />
                            ) : previewItem.kind === "audio" ? (
                              <FileAudio size={42} color="#EC4899" />
                            ) : previewItem.kind === "document" ? (
                              <FileText size={42} color="#EF4444" />
                            ) : (
                              <FileIcon size={42} color="#6366F1" />
                            )}
                          </View>
                          <Text style={[styles.genericFileName, font("bold")]}>
                            {previewItem.name}
                          </Text>
                          <Text style={[styles.genericFileNotice, mono("regular")]}>
                            {previewItem.kind.toUpperCase()} file on VPS
                          </Text>
                          <Text style={[styles.genericFileHelp, font("regular")]}>
                            This file reference will be attached to your prompt for AvA to inspect or process.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Preview Bottom Action Bar */}
                    <View style={styles.previewFooter}>
                      <TouchableOpacity
                        style={styles.previewCopyBtn}
                        onPress={() => handleCopyFilePath(previewItem.path)}
                        activeOpacity={0.7}
                      >
                        {copiedPath ? (
                          <Check size={14} color="#10B981" />
                        ) : (
                          <Copy size={14} color={COLORS.foreground} />
                        )}
                        <Text style={[styles.previewCopyBtnText, font("medium")]}>
                          {copiedPath ? "Copied" : "Copy Path"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.previewBackBtn}
                        onPress={() => setPreviewItem(null)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.previewBackBtnText, font("medium")]}>
                          Back to Files
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.previewAttachBtn}
                        onPress={() => handleConfirmAttach(previewItem)}
                        activeOpacity={0.8}
                      >
                        <Check size={15} color="#FFF" />
                        <Text style={[styles.previewAttachBtnText, font("bold")]}>
                          Attach This File
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === "web" ? 16 : 10,
  },
  floatingDialogCard: {
    width: Platform.OS === "web" ? "92%" : "96%",
    maxWidth: 680,
    height: Platform.OS === "web" ? 720 : "88%",
    maxHeight: 740,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 24,
    flexDirection: "column",
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(99, 102, 241, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15.5,
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
  viewToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 9,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
  },
  viewToggleBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.16)",
  },
  actionBtn: {
    padding: 7,
    borderRadius: 9,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtn: {
    padding: 7,
    borderRadius: 9,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutsWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: "rgba(99, 102, 241, 0.14)",
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  shortcutChipText: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },
  shortcutChipTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 8,
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
    borderRadius: 9,
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
    gap: 5,
  },
  catPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  catPillText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  catPillTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  scrollList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
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
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  fileRowSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  fileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  itemSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  extPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  extPillText: {
    fontSize: 9,
  },
  itemSubPath: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  itemSub: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  rowPreviewBtn: {
    padding: 6,
    borderRadius: 7,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  unselectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: COLORS.mutedForeground,
    opacity: 0.35,
  },
  gridContainer: {
    padding: 12,
  },
  gridRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridFolderCard: {
    width: Platform.OS === "web" ? "31.5%" : "48%",
    aspectRatio: 1.1,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 6,
  },
  gridFolderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  folderBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  folderBadgeText: {
    fontSize: 8.5,
    color: "#F59E0B",
    fontWeight: "700",
  },
  gridFileCard: {
    width: Platform.OS === "web" ? "31.5%" : "48%",
    aspectRatio: 1.02,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  gridFileCardSelected: {
    borderColor: "#6366F1",
    borderWidth: 1.5,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  gridThumbnailBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  gridPreviewAction: {
    position: "absolute",
    top: 6,
    left: 6,
    padding: 5,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    zIndex: 2,
  },
  gridSelectBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
  },
  gridUnselectedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: "#FFF",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  gridExtTag: {
    position: "absolute",
    bottom: 4,
    right: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  gridExtTagText: {
    fontSize: 8.5,
    color: "#FFF",
  },
  gridCardFooter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  gridCardTitle: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  gridCardKind: {
    fontSize: 9.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  bottomMeta: {
    flex: 1,
    marginRight: 8,
  },
  bottomMetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomSelectedTitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    flexShrink: 1,
  },
  previewQuickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  previewQuickPillText: {
    fontSize: 10.5,
    color: "#6366F1",
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
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  cancelBtnText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#6366F1",
  },
  attachBtnDisabled: {
    opacity: 0.4,
  },
  attachBtnText: {
    fontSize: 12,
    color: "#FFF",
  },
  /* Preview Overlay Styles */
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  previewCard: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  previewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewFileName: {
    fontSize: 14,
    color: COLORS.foreground,
    flex: 1,
  },
  previewPathText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  previewCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  previewBody: {
    flex: 1,
    position: "relative",
  },
  previewCenterBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  previewLoadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  imageViewerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05060A",
    position: "relative",
  },
  zoomControls: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 5,
    borderRadius: 8,
  },
  zoomBtn: {
    padding: 5,
  },
  imageScrollContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100%",
    minHeight: "100%",
  },
  fullPreviewImage: {
    width: 320,
    height: 320,
  },
  codePreviewScroll: {
    flex: 1,
    padding: 8,
  },
  genericFileBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  genericIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  genericFileName: {
    fontSize: 14.5,
    color: COLORS.foreground,
    textAlign: "center",
  },
  genericFileNotice: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  genericFileHelp: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
    marginTop: 4,
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  previewCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewCopyBtnText: {
    fontSize: 11.5,
    color: COLORS.foreground,
  },
  previewBackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewBackBtnText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  previewAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#6366F1",
  },
  previewAttachBtnText: {
    fontSize: 12,
    color: "#FFF",
  },
});
