import React, { useMemo, useState } from "react";
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
import { useNavigation, DrawerActions } from "@react-navigation/native";
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
import { COLORS } from "@/theme/colors";

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

  const {
    data: mediaItems = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMedia(APP.mediaDir);
  const removeMedia = useRemoveMedia();

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
        console.warn("Could not read file preview:", err);
      } finally {
        setIsLoadingPreview(false);
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
              setPreviewItem(null);
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
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
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
          <Plus size={15} color="#FFF" />
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
              <Search size={15} color={COLORS.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search shared files…"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={14} color={COLORS.mutedForeground} />
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
                    color={isActive ? COLORS.primaryForeground : COLORS.mutedForeground}
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
              <UploadCloud size={16} color="#FFF" />
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
                      {cat === "image" ? (
                        <ImageIcon size={30} color={COLORS.primary} />
                      ) : cat === "video" ? (
                        <FileVideo size={30} color="#a855f7" />
                      ) : cat === "audio" ? (
                        <FileAudio size={30} color="#f97316" />
                      ) : cat === "archive" ? (
                        <Archive size={30} color="#10b981" />
                      ) : (
                        <FileCode size={30} color="#3b82f6" />
                      )}
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
          onRequestClose={() => setPreviewItem(null)}
        >
          <TouchableWithoutFeedback onPress={() => setPreviewItem(null)}>
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
                      onPress={() => setPreviewItem(null)}
                    >
                      <X size={16} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Viewer Content */}
                  <View style={styles.viewerBody}>
                    {isLoadingPreview ? (
                      <View style={styles.previewLoadingBox}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.previewLoadingText}>Loading file content…</Text>
                      </View>
                    ) : previewBase64 ? (
                      <View style={styles.imageViewerBox}>
                        <View style={styles.zoomControlRow}>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                          >
                            <ZoomOut size={14} color={COLORS.foreground} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale(1)}
                          >
                            <RotateCcw size={13} color={COLORS.foreground} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.zoomBtn}
                            onPress={() => setZoomScale((z) => Math.min(3, z + 0.25))}
                          >
                            <ZoomIn size={14} color={COLORS.foreground} />
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
                            <FileVideo size={42} color="#a855f7" />
                          ) : previewItem && categorizeFile(previewItem.path) === "audio" ? (
                            <Music size={42} color="#f97316" />
                          ) : previewItem && categorizeFile(previewItem.path) === "archive" ? (
                            <Archive size={42} color="#10b981" />
                          ) : (
                            <FileQuestion size={42} color={COLORS.primary} />
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
                          <Check size={15} color={COLORS.success} />
                        ) : (
                          <Copy size={15} color={COLORS.foreground} />
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
                        <Share2 size={15} color={COLORS.foreground} />
                        <Text style={styles.viewerActionText}>Export / Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.viewerActionBtn, styles.viewerDeleteBtn]}
                        onPress={() => handleDeleteItem(previewItem)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={15} color={COLORS.destructive} />
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

const styles = StyleSheet.create({
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
    borderRadius: 18,
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
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  headerSubtitleText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
  searchBarWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
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
  categoryFilterContainer: {
    paddingBottom: 8,
  },
  categoryFilterScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  categoryTextActive: {
    color: COLORS.primaryForeground,
    fontWeight: "600",
  },
  gridContent: {
    padding: 12,
    gap: 10,
  },
  gridRow: {
    gap: 10,
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
    backgroundColor: COLORS.muted,
    borderRadius: 12,
    position: "relative",
  },
  extBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  extBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFF",
  },
  gridTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  gridPath: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    paddingHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  viewerSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "88%",
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 10,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  viewerTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  viewerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  viewerSubtitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  viewerCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
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
    color: COLORS.mutedForeground,
  },
  imageViewerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
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
    borderRadius: 8,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  genericFileName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    textAlign: "center",
  },
  genericFileNotice: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  viewerActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
  },
  viewerActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  viewerDeleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    maxWidth: 90,
  },
  viewerDeleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.destructive,
  },
});
