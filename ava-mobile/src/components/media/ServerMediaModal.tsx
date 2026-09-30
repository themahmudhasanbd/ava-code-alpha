import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Server,
  UploadCloud,
  X,
} from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";
import { APP } from "@/config/app";
import { useServerMediaBrowser } from "./useServerMediaBrowser";
import { MediaBrowserList } from "./MediaBrowserList";
import { MediaPreviewOverlay } from "./MediaPreviewOverlay";
import {
  getFileKind,
  type PreviewItem,
  type ServerSelectedMedia,
} from "./media-helpers";

// Keep the original import path working for consumers.
export type { ServerSelectedMedia } from "./media-helpers";

interface ServerMediaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: ServerSelectedMedia) => void;
  initialDirectory?: string;
  allowUpload?: boolean;
}

/** Thin shell: modal frame + header. Browsing lives in MediaBrowserList, preview in MediaPreviewOverlay. */
export function ServerMediaModal({
  open,
  onClose,
  onSelect,
  initialDirectory = APP.mediaDir || "/root/shared-media",
  allowUpload = true,
}: ServerMediaModalProps) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isSmallMobile = windowWidth < 380;

  const browser = useServerMediaBrowser({ initialDirectory, allowUpload, onSelect });
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  const openPreview = (file: { name: string; path: string; kind?: ServerSelectedMedia["kind"] }) => {
    const kind = file.kind || getFileKind(file.name);
    browser.setSelectedFile({ name: file.name, path: file.path, kind });
    setPreviewItem({ name: file.name, path: file.path, kind });
  };

  const closePreview = () => setPreviewItem(null);

  const handleAttachSelected = () => {
    browser.confirmAttach();
    onClose();
  };

  const handleAttachFromPreview = (item: PreviewItem) => {
    browser.confirmAttach(item);
    setPreviewItem(null);
    onClose();
  };

  // Responsive dynamic modal dimensions
  const dialogWidth = Math.min(windowWidth - (isSmallMobile ? 12 : 24), 720);
  const dialogHeight = Math.min(windowHeight - (isSmallMobile ? 16 : 32), 760);
  const numGridCols = windowWidth >= 768 ? 3 : 2;
  const gridItemWidth = (dialogWidth - 24 - (numGridCols - 1) * 10) / numGridCols;

  const { viewMode, setViewMode, isUploading, isLoading, isRefetching, refetch, filteredEntries, currentDir } = browser;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => {
        if (previewItem) {
          closePreview();
        } else {
          onClose();
        }
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (previewItem) closePreview();
          else onClose();
        }}
      >
        <View style={[styles.backdrop, { backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(15,23,42,0.5)" }]}>
          <BlurView
            intensity={isDark ? 80 : 60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.floatingDialogCard,
                {
                  width: dialogWidth,
                  height: dialogHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000000" : "rgba(15,23,42,0.3)",
                },
              ]}
            >
              {/* Modal Top Header Bar */}
              <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.headerIconBox,
                      {
                        backgroundColor: `${colors.primary}1A`,
                        borderColor: `${colors.primary}33`,
                      },
                    ]}
                  >
                    <Server size={17} color={colors.primary} />
                  </View>
                  <View style={styles.headerTitleWrap}>
                    <Text
                      style={[styles.headerTitle, { color: colors.foreground }, font("bold")]}
                      numberOfLines={1}
                    >
                      Select from Server
                    </Text>
                    {!isSmallMobile && (
                      <Text
                        style={[styles.headerSubtitle, { color: colors.mutedForeground }, font("regular")]}
                        numberOfLines={1}
                      >
                        {currentDir} ({filteredEntries.length} items)
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.headerActions}>
                  {/* View Mode Toggle Switcher: List vs Grid */}
                  <View
                    style={[
                      styles.viewToggleGroup,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.viewToggleBtn,
                        viewMode === "list" && { backgroundColor: `${colors.primary}22` },
                      ]}
                      onPress={() => setViewMode("list")}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <LayoutList
                        size={15}
                        color={viewMode === "list" ? colors.primary : colors.mutedForeground}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.viewToggleBtn,
                        viewMode === "grid" && { backgroundColor: `${colors.primary}22` },
                      ]}
                      onPress={() => setViewMode("grid")}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <LayoutGrid
                        size={15}
                        color={viewMode === "grid" ? colors.primary : colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Direct Upload CTA */}
                  {allowUpload && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.secondary, borderColor: colors.border },
                      ]}
                      onPress={browser.uploadToCurrentDir}
                      disabled={isUploading}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <UploadCloud size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Refresh */}
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                    onPress={() => refetch()}
                    disabled={isLoading || isRefetching}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <RefreshCw
                      size={15}
                      color={
                        isLoading || isRefetching ? colors.primary : colors.mutedForeground
                      }
                    />
                  </TouchableOpacity>

                  {/* Close Modal */}
                  <TouchableOpacity
                    style={[
                      styles.closeBtn,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              <MediaBrowserList
                browser={browser}
                gridItemWidth={gridItemWidth}
                onOpenPreview={openPreview}
                onAttachSelected={handleAttachSelected}
                onClose={onClose}
              />

              {/* ===================== RICH PREVIEW MODAL / OVERLAY ===================== */}
              {previewItem && (
                <MediaPreviewOverlay
                  key={previewItem.path}
                  item={previewItem}
                  dialogWidth={dialogWidth}
                  dialogHeight={dialogHeight}
                  onClose={closePreview}
                  onAttach={handleAttachFromPreview}
                />
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
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  floatingDialogCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 24,
    flexDirection: "column",
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
  },
  headerSubtitle: {
    fontSize: 10.5,
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
    borderRadius: 9,
    padding: 2,
    borderWidth: 1,
    marginRight: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  closeBtn: {
    padding: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
});
