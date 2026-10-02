import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useNavigation } from "@react-navigation/native";
import { openAppDrawer } from "@/navigation/drawer";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import {
  Archive,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  FolderOpen,
  Image as ImageIcon,
  Menu,
  Music,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, GlassIconButton, SkeletonRows, Surface } from "@/components/kit";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { MediaSelectorModal, type SelectedMedia } from "@/components/media/MediaSelectorModal";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useMedia, useRemoveMedia } from "@/state/queries";
import type { MediaItem, MediaKind } from "@/core/api/media";
import type { ColorTokens } from "@/theme/colors";
import { useStyles, useTheme } from "@/theme/theme-context";

type CategoryFilter = "all" | "image" | "video" | "audio" | "code" | "archive";

const CATEGORIES: { id: CategoryFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All Files", icon: FolderOpen },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "video", label: "Videos", icon: FileVideo },
  { id: "audio", label: "Audio", icon: FileAudio },
  { id: "code", label: "Docs & Code", icon: FileCode },
  { id: "archive", label: "Archives", icon: Archive },
];

function getFileExtension(path: string): string {
  return path.split(".").pop()?.toLowerCase() || "";
}

function categorizeFile(path: string): CategoryFilter {
  const ext = getFileExtension(path);
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext)) {
    return "image";
  }
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) {
    return "audio";
  }
  if (["zip", "tar", "gz", "tgz", "7z", "rar"].includes(ext)) {
    return "archive";
  }
  if (
    [
      "ts", "tsx", "js", "jsx", "json", "py", "rs", "html", "css", "md",
      "txt", "sh", "yaml", "yml", "pdf", "log", "sql", "env",
    ].includes(ext)
  ) {
    return "code";
  }
  return "all";
}

function CategoryIcon({ cat, size }: { cat: CategoryFilter; size: number }) {
  const { colors } = useTheme();
  switch (cat) {
    case "image":
      return <ImageIcon size={size} color={colors.primary} />;
    case "video":
      return <FileVideo size={size} color={colors.mascot} />;
    case "audio":
      return <FileAudio size={size} color={colors.warning} />;
    case "archive":
      return <Archive size={size} color={colors.success} />;
    default:
      return <FileCode size={size} color={colors.accentForeground} />;
  }
}

export function MediaScreen() {
  const navigation = useNavigation<any>();
  const { rpc } = useAva();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeModal, setActiveModal] = useState<"selector" | null>(null);

  // File preview & viewer modal state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  // Path of the file whose preview is currently requested; stale fs/readFile
  // results are ignored when the selection changed mid-flight.
  const previewPathRef = useRef<string | null>(null);

  const closePreview = () => {
    previewPathRef.current = null;
    setPreviewItem(null);
  };

  const {
    data: mediaItems = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMedia(APP.mediaDir);
  const removeMedia = useRemoveMedia();
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const matchesCategory =
        filter === "all" || categorizeFile(item.path) === filter;
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [mediaItems, filter, searchQuery]);

  const handleOpenItem = async (item: MediaItem) => {
    previewPathRef.current = item.path;
    setPreviewItem(item);
    setPreviewBase64(null);
    setPreviewTextContent(null);
    setZoomScale(1);

    const ext = getFileExtension(item.path);
    const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext);
    const isText = [
      "txt", "md", "json", "ts", "tsx", "js", "jsx", "py", "rs", "html",
      "css", "sh", "yaml", "yml", "log", "sql", "env",
    ].includes(ext);

    if (rpc && rpc.status === "online") {
      setIsLoadingPreview(true);
      try {
        const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", {
          path: item.path,
        });
        // Ignore stale results: the user may have opened another file meanwhile.
        if (previewPathRef.current !== item.path) return;
        if (res.dataBase64) {
          if (isImg) {
            const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
            setPreviewBase64(`data:${mime};base64,${res.dataBase64}`);
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
        if (previewPathRef.current !== item.path) return;
        console.warn("Could not read file preview:", err);
      } finally {
        if (previewPathRef.current === item.path) setIsLoadingPreview(false);
      }
    }
  };

  const handleCopyPath = async (path: string) => {
    await Clipboard.setStringAsync(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareOrExport = async (item: MediaItem) => {
    if (!rpc || rpc.status !== "online") {
      Alert.alert("Offline", "Cannot export while disconnected from server.");
      return;
    }

    try {
      const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", {
        path: item.path,
      });
      if (!res.dataBase64) {
        Alert.alert("Export Error", "File is empty or could not be read.");
        return;
      }

      const tempFile = new File(Paths.cache, item.name);
      tempFile.create({ overwrite: true });
      tempFile.write(res.dataBase64, { encoding: "base64" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempFile.uri);
      } else {
        Alert.alert("Saved", `Saved to temporary storage: ${tempFile.uri}`);
      }
    } catch (err: any) {
      Alert.alert("Share Error", err?.message || "Failed to export file.");
    }
  };

  const handleDeleteItem = (item: MediaItem) => {
    Alert.alert(
      "Delete file",
      `Are you sure you want to permanently delete "${item.name}" from ${APP.mediaDir}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMedia.mutateAsync(item.path);
              closePreview();
              refetch();
            } catch (err: any) {
              Alert.alert("Delete Error", err?.message || "Failed to delete file.");
            }
          },
        },
      ]
    );
  };

  const handleMediaSelected = (_media: SelectedMedia) => {
    refetch();
  };

  // Dedicated Customized Header for Media
  const customMediaHeader = (
    <Surface style={styles.customHeaderSurface}>
      <View style={styles.headerLeft}>
        <GlassIconButton
          icon={Menu}
          size={18}
          onPress={() => openAppDrawer(navigation)}
        />
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitleText}>Shared Media</Text>
          <Text style={styles.headerSubtitleText} numberOfLines={1}>
            {APP.mediaDir} ({filteredItems.length})
          </Text>
        </View>
      </View>

      <View style={styles.headerRight}>
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
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => setActiveModal("selector")}
          activeOpacity={0.8}
        >
          <Plus size={15} color={colors.primaryForeground} />
          <Text style={styles.uploadBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );

  return (
    <AppShell customHeader={customMediaHeader}>
      <View style={styles.container}>
        {/* Expandable Search Input */}
        {showSearch && (
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBox}>
              <Search size={15} color={colors.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search shared files…"
                placeholderTextColor={colors.mutedForeground}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Category Filter Pills */}
        <View style={styles.categoryFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = filter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    isActive && styles.categoryPillActive,
                  ]}
                  onPress={() => setFilter(cat.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={13}
                    color={isActive ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.categoryTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Content Area */}
        {isLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonRows count={4} />
          </View>
        ) : error ? (
          <EmptyState
            icon={ImageIcon}
            title="Could not load media"
            description={(error as Error).message}
          />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon={ImageIcon}
              title="No media files found"
              description={`Add images, videos, audio, or docs to ${APP.mediaDir}`}
            />
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setActiveModal("selector")}
              activeOpacity={0.8}
            >
              <UploadCloud size={15} color={colors.primaryForeground} />
              <Text style={styles.emptyAddBtnText}>Upload / Select Media</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.path}
            numColumns={2}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const cat = categorizeFile(item.path);
              const ext = getFileExtension(item.path).toUpperCase();

              return (
                <TouchableOpacity
                  style={styles.gridCard}
                  onPress={() => handleOpenItem(item)}
                  activeOpacity={0.75}
                >
                  <Surface style={styles.gridCardSurface}>
                    <View style={styles.gridThumbnailBox}>
                      <CategoryIcon cat={cat} size={30} />
                      <View style={styles.extBadge}>
                        <Text style={styles.extBadgeText}>{ext || "FILE"}</Text>
                      </View>
                    </View>

                    <Text style={styles.gridTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridPath} numberOfLines={1}>
                      {item.path}
                    </Text>
                  </Surface>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Universal Media Selector Modal */}
        <MediaSelectorModal
          open={activeModal === "selector"}
          onClose={() => setActiveModal(null)}
          onSelect={handleMediaSelected}
          serverDirectory={APP.mediaDir}
        />

        {/* Advanced File Viewer & Details Modal */}
        <Modal
          visible={previewItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => closePreview()}
        >
          <TouchableWithoutFeedback onPress={() => closePreview()}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.viewerSheet}>
                  <View style={styles.sheetHandleBar} />

                  {/* Viewer Header */}
                  <View style={styles.viewerHeader}>
                    <View style={styles.viewerTitleGroup}>
                      <Text style={styles.viewerTitle} numberOfLines={1}>
                        {previewItem?.name}
                      </Text>
                      <Text style={styles.viewerSubtitle} numberOfLines={1}>
                        {previewItem?.path}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewerCloseBtn}
                      onPress={() => closePreview()}
                    >
                      <X size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Viewer Content */}
                  <View style={styles.viewerBody}>
                    {isLoadingPreview ? (
                      <View style={styles.previewLoadingBox}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.previewLoadingText}>Loading file content…</Text>
                      </View>
                    ) : previewBase64 ? (
                      <View style={styles.imageViewerBox}>
                        <View style={styles.zoomControlRow}>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                          >
                            <ZoomOut size={14} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale(1)}
                          >
                            <RotateCcw size={13} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale((z) => Math.min(3, z + 0.25))}
                          >
                            <ZoomIn size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                        <ScrollView
                          horizontal
                          contentContainerStyle={styles.imageScrollWrap}
                          showsHorizontalScrollIndicator={false}
                        >
                          <ScrollView
                            contentContainerStyle={styles.imageScrollWrap}
                            showsVerticalScrollIndicator={false}
                          >
                            <RNImage
                              source={{ uri: previewBase64 }}
                              style={[
                                styles.previewImage,
                                { transform: [{ scale: zoomScale }] },
                              ]}
                              resizeMode="contain"
                            />
                          </ScrollView>
                        </ScrollView>
                      </View>
                    ) : previewTextContent !== null ? (
                      <ScrollView
                        style={styles.textViewerScroll}
                        showsVerticalScrollIndicator={false}
                      >
                        <CodeBlock
                          code={previewTextContent || "(empty file)"}
                          language={getFileExtension(previewItem?.name || "")}
                        />
                      </ScrollView>
                    ) : (
                      <View style={styles.genericFileBox}>
                        <View style={styles.genericIconCircle}>
                          {previewItem && categorizeFile(previewItem.path) === "video" ? (
                            <FileVideo size={36} color={colors.mascot} />
                          ) : previewItem && categorizeFile(previewItem.path) === "audio" ? (
                            <Music size={36} color={colors.warning} />
                          ) : previewItem && categorizeFile(previewItem.path) === "archive" ? (
                            <Archive size={36} color={colors.success} />
                          ) : (
                            <FileQuestion size={36} color={colors.primary} />
                          )}
                        </View>
                        <Text style={styles.genericFileName}>
                          {previewItem?.name}
                        </Text>
                        <Text style={styles.genericFileNotice}>
                          Remote VPS Asset · Stored in {APP.mediaDir}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Bar */}
                  {previewItem && (
                    <View style={styles.viewerActionBar}>
                      <TouchableOpacity
                        style={styles.viewerActionBtn}
                        onPress={() => handleCopyPath(previewItem.path)}
                        activeOpacity={0.7}
                      >
                        {copied ? (
                          <Check size={15} color={colors.success} />
                        ) : (
                          <Copy size={15} color={colors.foreground} />
                        )}
                        <Text style={styles.viewerActionText}>
                          {copied ? "Copied" : "Copy Path"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewerActionBtn}
                        onPress={() => handleShareOrExport(previewItem)}
                        activeOpacity={0.7}
                      >
                        <Share2 size={15} color={colors.foreground} />
                        <Text style={styles.viewerActionText}>Export / Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.viewerActionBtn, styles.viewerDeleteBtn]}
                        onPress={() => handleDeleteItem(previewItem)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={15} color={colors.destructive} />
                        <Text style={styles.viewerDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </AppShell>
  );
}

function createStyles(c: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 16,
    height: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerTextGroup: {
    justifyContent: "center",
    flex: 1,
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.foreground,
  },
  headerSubtitleText: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: c.mutedForeground,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  uploadBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: c.primaryForeground,
  },
  searchBarWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 40,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: c.foreground,
    paddingVertical: 0,
  },
  categoryFilterContainer: {
    paddingBottom: 10,
  },
  categoryFilterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  categoryPillActive: {
    backgroundColor: c.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: c.mutedForeground,
  },
  categoryTextActive: {
    color: c.primaryForeground,
    fontWeight: "600",
  },
  gridContent: {
    padding: 16,
    gap: 12,
  },
  gridRow: {
    gap: 12,
  },
  gridCard: {
    flex: 1,
    aspectRatio: 0.95,
  },
  gridCardSurface: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    padding: 10,
    justifyContent: "space-between",
  },
  gridThumbnailBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.muted,
    borderRadius: 12,
    position: "relative",
  },
  extBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  extBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#FFF",
  },
  gridTitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: c.foreground,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  gridPath: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: c.mutedForeground,
    paddingHorizontal: 2,
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyAddBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: c.primaryForeground,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  viewerSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "88%",
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.muted,
    alignSelf: "center",
    marginBottom: 10,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  viewerTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  viewerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.foreground,
  },
  viewerSubtitle: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    color: c.mutedForeground,
    marginTop: 2,
  },
  viewerCloseBtn: {
    padding: 7,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  viewerBody: {
    minHeight: 240,
    maxHeight: 420,
    paddingVertical: 10,
  },
  previewLoadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  previewLoadingText: {
    fontSize: 12,
    color: c.mutedForeground,
  },
  imageViewerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.muted,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  zoomControlRow: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 4,
    borderRadius: 999,
  },
  zoomBtn: {
    padding: 4,
  },
  imageScrollWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100%",
    minHeight: "100%",
  },
  previewImage: {
    width: 280,
    height: 280,
  },
  textViewerScroll: {
    maxHeight: 380,
  },
  genericFileBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  genericIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  genericFileName: {
    fontSize: 14,
    fontWeight: "600",
    color: c.foreground,
    textAlign: "center",
  },
  genericFileNotice: {
    fontSize: 11.5,
    color: c.mutedForeground,
    textAlign: "center",
  },
  viewerActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  viewerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: c.secondary,
  },
  viewerActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.foreground,
  },
  viewerDeleteBtn: {
    backgroundColor: c.destructive + "1A",
    maxWidth: 90,
  },
  viewerDeleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.destructive,
  },
  });
}
