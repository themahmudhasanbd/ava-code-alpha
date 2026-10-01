import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Folder,
  FolderOpen,
  Search,
  UploadCloud,
  X,
} from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import {
  LazyImageThumbnail,
  getFileExtension,
  getFileKind,
  getKindColor,
  getKindIcon,
  type MediaFilterCategory,
  type ServerSelectedMedia,
} from "./media-helpers";
import type { ServerMediaBrowser } from "./useServerMediaBrowser";

interface MediaBrowserListProps {
  browser: ServerMediaBrowser;
  gridItemWidth: number;
  onOpenPreview: (file: { name: string; path: string; kind?: ServerSelectedMedia["kind"] }) => void;
  onAttachSelected: () => void;
  onClose: () => void;
}

const CATEGORY_TABS: MediaFilterCategory[] = ["all", "images", "media", "docs", "code"];

function categoryLabel(cat: MediaFilterCategory): string {
  return cat === "all"
    ? "All"
    : cat === "images"
      ? "Images"
      : cat === "media"
        ? "Media"
        : cat === "docs"
          ? "Docs"
          : "Code";
}

/** Breadcrumbs + search + file grid/list + bottom action bar. */
export function MediaBrowserList({
  browser,
  gridItemWidth,
  onOpenPreview,
  onAttachSelected,
  onClose,
}: MediaBrowserListProps) {
  const { colors } = useTheme();

  const {
    currentDir,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    viewMode,
    selectedFile,
    selectFileItem,
    isUploading,
    isLoading,
    filteredEntries,
    folders,
    files,
    canGoUp,
    goUp,
    enterFolder,
    goToDirectory,
    uploadToCurrentDir,
    allowUpload,
    shortcutDirs,
    pathSegments,
  } = browser;

  return (
    <>
      {/* Location Shortcuts Bar */}
      <View style={[styles.shortcutsWrapper, { borderBottomColor: colors.border }]}>
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
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                  isActive && {
                    backgroundColor: `${colors.primary}1A`,
                    borderColor: `${colors.primary}55`,
                  },
                ]}
                onPress={() => goToDirectory(sc.path)}
                activeOpacity={0.7}
              >
                <IconComp
                  size={13}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.shortcutChipText,
                    { color: isActive ? colors.primary : colors.mutedForeground },
                    font(isActive ? "bold" : "medium"),
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
      <View
        style={[
          styles.breadcrumbBar,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.upBtn, !canGoUp && styles.upBtnDisabled]}
          onPress={goUp}
          disabled={!canGoUp}
          activeOpacity={0.7}
        >
          <ArrowUp
            size={15}
            color={canGoUp ? colors.primary : colors.mutedForeground}
          />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScroll}
        >
          <TouchableOpacity
            onPress={() => goToDirectory("/")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.breadcrumbSegment,
                { color: currentDir === "/" ? colors.primary : colors.foreground },
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
                <Text style={[styles.breadcrumbDivider, { color: colors.mutedForeground }, mono("regular")]}>
                  /
                </Text>
                <TouchableOpacity
                  onPress={() => goToDirectory(pathUpToSegment)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.breadcrumbSegment,
                      { color: isLast ? colors.primary : colors.foreground },
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
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Search size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }, font("regular")]}
            placeholder="Search in folder..."
            placeholderTextColor={colors.mutedForeground}
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
              <X size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills: All, Images, Media, Docs, Code */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPills}
        >
          {CATEGORY_TABS.map((cat) => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                  active && {
                    backgroundColor: `${colors.primary}20`,
                    borderColor: `${colors.primary}55`,
                  },
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: active ? colors.primary : colors.mutedForeground },
                    font(active ? "bold" : "medium"),
                  ]}
                >
                  {categoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Browsing Content Viewport */}
      <View style={[styles.contentContainer, { borderTopColor: colors.border }]}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }, font("regular")]}>
              Loading directory contents…
            </Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.centerBox}>
            <FolderOpen size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }, font("medium")]}>
              No files or folders found
            </Text>
            {allowUpload && (
              <TouchableOpacity
                style={[
                  styles.emptyUploadBtn,
                  {
                    borderColor: `${colors.primary}44`,
                    backgroundColor: `${colors.primary}14`,
                  },
                ]}
                onPress={uploadToCurrentDir}
                activeOpacity={0.7}
              >
                <UploadCloud size={14} color={colors.primary} />
                <Text style={[styles.emptyUploadBtnText, { color: colors.primary }, font("medium")]}>
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
                style={[styles.folderRow, { backgroundColor: "transparent" }]}
                onPress={() => enterFolder(folder.path)}
                activeOpacity={0.7}
              >
                <View style={[styles.folderIconBox, { backgroundColor: `${colors.warning}24` }]}>
                  <Folder size={17} color={colors.warning} />
                </View>
                <View style={styles.itemMeta}>
                  <Text
                    style={[styles.itemName, { color: colors.foreground }, font("semibold")]}
                    numberOfLines={1}
                  >
                    {folder.name}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }, font("regular")]}>
                    Folder · Tap to open
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}

            {/* Files */}
            {files.map((file) => {
              const kind = getFileKind(file.name);
              const IconComp = getKindIcon(kind);
              const color = getKindColor(kind, colors);
              const isSelected = selectedFile?.path === file.path;
              const ext = getFileExtension(file.name).toUpperCase();
              const isImage = kind === "image";

              return (
                <TouchableOpacity
                  key={file.path}
                  style={[
                    styles.fileRow,
                    isSelected && {
                      backgroundColor: `${colors.primary}18`,
                      borderColor: `${colors.primary}44`,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => selectFileItem(file)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.fileIconBox,
                      { backgroundColor: `${color}18` },
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
                        { color: isSelected ? colors.primary : colors.foreground },
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
                        style={[styles.itemSubPath, { color: colors.mutedForeground }, mono("regular")]}
                        numberOfLines={1}
                      >
                        {file.path}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Preview Button */}
                  <TouchableOpacity
                    style={[styles.rowPreviewBtn, { backgroundColor: `${colors.primary}18` }]}
                    onPress={() => onOpenPreview(file)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Eye size={14} color={colors.primary} />
                  </TouchableOpacity>

                  {/* Selection indicator */}
                  {isSelected ? (
                    <CheckCircle2 size={19} color={colors.success} />
                  ) : (
                    <View
                      style={[
                        styles.unselectedCircle,
                        { borderColor: colors.mutedForeground },
                      ]}
                    />
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
                  style={[
                    styles.gridFolderCard,
                    {
                      width: gridItemWidth,
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => enterFolder(folder.path)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.gridFolderIconBox, { backgroundColor: `${colors.warning}1F` }]}>
                    <Folder size={28} color={colors.warning} />
                  </View>
                  <Text
                    style={[styles.gridCardTitle, { color: colors.foreground }, font("semibold")]}
                    numberOfLines={1}
                  >
                    {folder.name}
                  </Text>
                  <View style={[styles.folderBadge, { backgroundColor: `${colors.warning}33` }]}>
                    <Text style={[styles.folderBadgeText, font("medium"), { color: colors.warning }]}>
                      DIR
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Files */}
              {files.map((file) => {
                const kind = getFileKind(file.name);
                const IconComp = getKindIcon(kind);
                const color = getKindColor(kind, colors);
                const isSelected = selectedFile?.path === file.path;
                const ext = getFileExtension(file.name).toUpperCase();
                const isImage = kind === "image";

                return (
                  <TouchableOpacity
                    key={file.path}
                    style={[
                      styles.gridFileCard,
                      {
                        width: gridItemWidth,
                        backgroundColor: colors.secondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                      isSelected && {
                        borderWidth: 1.5,
                        backgroundColor: `${colors.primary}12`,
                      },
                    ]}
                    onPress={() => selectFileItem(file)}
                    activeOpacity={0.75}
                  >
                    {/* Card Top Preview Box */}
                    <View
                      style={[
                        styles.gridThumbnailBox,
                        { backgroundColor: `${color}10` },
                      ]}
                    >
                      {isImage ? (
                        <LazyImageThumbnail
                          filePath={file.path}
                          fileName={file.name}
                          size={68}
                        />
                      ) : (
                        <IconComp size={30} color={color} />
                      )}

                      {/* Top-Left Floating Preview Button */}
                      <TouchableOpacity
                        style={styles.gridPreviewAction}
                        onPress={() => onOpenPreview(file)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Eye size={12} color="#FFF" />
                      </TouchableOpacity>

                      {/* Top-Right Selection Indicator */}
                      <View style={styles.gridSelectBadge}>
                        {isSelected ? (
                          <CheckCircle2 size={17} color={colors.success} />
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
                    <View style={[styles.gridCardFooter, { borderTopColor: colors.border }]}>
                      <Text
                        style={[
                          styles.gridCardTitle,
                          { color: isSelected ? colors.primary : colors.foreground },
                          font(isSelected ? "bold" : "medium"),
                        ]}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                      <Text
                        style={[styles.gridCardKind, { color: colors.mutedForeground }, mono("regular")]}
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
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.secondary, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.bottomMeta}>
          <View style={styles.bottomMetaHeader}>
            <Text
              style={[
                styles.bottomSelectedTitle,
                { color: selectedFile ? colors.foreground : colors.mutedForeground },
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
                style={[
                  styles.previewQuickPill,
                  {
                    backgroundColor: `${colors.primary}18`,
                    borderColor: `${colors.primary}44`,
                  },
                ]}
                onPress={() => onOpenPreview(selectedFile)}
                activeOpacity={0.7}
              >
                <Eye size={12} color={colors.primary} />
                <Text style={[styles.previewQuickPillText, { color: colors.primary }, font("semibold")]}>
                  Preview
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedFile ? (
            <Text
              style={[styles.bottomSelectedPath, { color: colors.mutedForeground }, mono("regular")]}
              numberOfLines={1}
            >
              {selectedFile.path}
            </Text>
          ) : (
            <Text style={[styles.bottomSelectedHint, { color: colors.mutedForeground }, font("regular")]}>
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
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }, font("medium")]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.attachBtn,
              { backgroundColor: colors.primary },
              !selectedFile && styles.attachBtnDisabled,
            ]}
            onPress={onAttachSelected}
            disabled={!selectedFile}
            activeOpacity={0.8}
          >
            <Check size={15} color={colors.primaryForeground || "#FFF"} />
            <Text style={[styles.attachBtnText, { color: colors.primaryForeground || "#FFF" }, font("bold")]}>
              Attach File
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shortcutsWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 6,
  },
  shortcutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  shortcutChipText: {
    fontSize: 11,
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    gap: 5,
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
    fontSize: 11.5,
    paddingHorizontal: 2,
  },
  breadcrumbDivider: {
    fontSize: 11.5,
    marginHorizontal: 1,
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
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
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
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
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
  },
  contentContainer: {
    flex: 1,
    borderTopWidth: 1,
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
  },
  emptyTitle: {
    fontSize: 13,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  emptyUploadBtnText: {
    fontSize: 12,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  folderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
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
    fontSize: 10,
    flex: 1,
  },
  itemSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  rowPreviewBtn: {
    padding: 6,
    borderRadius: 7,
  },
  unselectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
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
    aspectRatio: 1.1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 6,
  },
  gridFolderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
  },
  folderBadgeText: {
    fontSize: 8.5,
    fontWeight: "700",
  },
  gridFileCard: {
    aspectRatio: 1.02,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "space-between",
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
  },
  gridCardTitle: {
    fontSize: 12,
  },
  gridCardKind: {
    fontSize: 9.5,
    marginTop: 1,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
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
    flexShrink: 1,
  },
  previewQuickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  previewQuickPillText: {
    fontSize: 10.5,
  },
  bottomSelectedPath: {
    fontSize: 9.5,
    marginTop: 1,
  },
  bottomSelectedHint: {
    fontSize: 10,
    marginTop: 1,
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  cancelBtnText: {
    fontSize: 12,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  attachBtnDisabled: {
    opacity: 0.4,
  },
  attachBtnText: {
    fontSize: 12,
  },
});
