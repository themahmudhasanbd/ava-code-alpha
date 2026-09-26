import React, { useMemo, useState } from "react";
import { BlurView } from "expo-blur";
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
import {
  ArrowUp,
  Check,
  ChevronRight,
  Folder,
  FolderGit2,
  FolderOpen,
  FolderSearch2,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import { Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { parentPath, pathCrumbs } from "@/core/api/files";
import { useDirectory } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

const SHORTCUTS = [
  { label: "ava-code", path: "/var/www/ava-code" },
  { label: "shared-media", path: "/root/shared-media" },
  { label: "/var/www", path: "/var/www" },
  { label: "/root", path: "/root" },
  { label: "Root /", path: "/" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  currentPath?: string;
  onSelectPath: (path: string) => void;
}

export function WorkspaceModal({
  open,
  onClose,
  currentPath = APP.defaultCwd,
  onSelectPath,
}: Props) {
  const [browsingPath, setBrowsingPath] = useState(currentPath || APP.defaultCwd);
  const [manualInput, setManualInput] = useState(currentPath || APP.defaultCwd);
  const [filterText, setFilterText] = useState("");

  const { data: entries = [], isLoading, refetch, isFetching } = useDirectory(browsingPath);

  const crumbs = useMemo(() => pathCrumbs(browsingPath), [browsingPath]);

  // Filter only directories
  const directories = useMemo(() => {
    return entries
      .filter((e) => e.isDirectory)
      .filter((e) => !filterText || e.name.toLowerCase().includes(filterText.toLowerCase()));
  }, [entries, filterText]);

  const handleNavigate = (path: string) => {
    const clean = path.replace(/\/+$/, "") || "/";
    setBrowsingPath(clean);
    setManualInput(clean);
    setFilterText("");
  };

  const handleGoUp = () => {
    if (browsingPath === "/" || !browsingPath) return;
    handleNavigate(parentPath(browsingPath));
  };

  const handleConfirm = (targetPath?: string) => {
    const finalPath = targetPath || browsingPath;
    onSelectPath(finalPath);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              {/* Modal Header */}
              <View style={styles.header}>
                <View style={styles.headerIconWrapper}>
                  <FolderGit2 size={18} color="#FFFFFF" />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={[styles.headerTitle, font("bold")]}>Select Workspace Directory</Text>
                  <Text style={[styles.headerSubtitle, font("regular")]}>
                    Root path for AI Agent context, terminal & file tree
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Shortcut Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shortcutsRow}
              >
                {SHORTCUTS.map((sc) => {
                  const active = browsingPath === sc.path;
                  return (
                    <TouchableOpacity
                      key={sc.path}
                      style={[styles.shortcutChip, active && styles.shortcutChipActive]}
                      onPress={() => handleNavigate(sc.path)}
                      activeOpacity={0.7}
                    >
                      <Folder
                        size={12}
                        color={active ? COLORS.primary : COLORS.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.shortcutChipText,
                          font("medium", sc.label),
                          active && styles.shortcutChipTextActive,
                        ]}
                      >
                        {sc.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Manual Path Input + Go */}
              <View style={styles.manualInputRow}>
                <View style={styles.manualInputBox}>
                  <FolderSearch2 size={15} color={COLORS.mutedForeground} />
                  <TextInput
                    style={[styles.manualTextInput, mono("regular")]}
                    value={manualInput}
                    onChangeText={setManualInput}
                    onSubmitEditing={() => handleNavigate(manualInput)}
                    placeholder="Enter absolute path (e.g. /var/www)…"
                    placeholderTextColor={COLORS.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={styles.goBtn}
                  onPress={() => handleNavigate(manualInput)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goBtnText, font("semibold")]}>Go</Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Breadcrumbs Bar */}
              <View style={styles.breadcrumbBar}>
                <TouchableOpacity
                  onPress={handleGoUp}
                  disabled={browsingPath === "/"}
                  style={[styles.crumbActionBtn, browsingPath === "/" && { opacity: 0.3 }]}
                >
                  <ArrowUp size={14} color={COLORS.primary} />
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.crumbsScroll}
                >
                  <TouchableOpacity onPress={() => handleNavigate("/")}>
                    <Text
                      style={[
                        styles.crumbSegment,
                        mono("regular"),
                        browsingPath === "/" && styles.crumbSegmentActive,
                      ]}
                    >
                      /
                    </Text>
                  </TouchableOpacity>

                  {crumbs.map((c, i) => (
                    <View key={c.path} style={styles.crumbItem}>
                      <ChevronRight size={11} color={COLORS.mutedForeground} />
                      <TouchableOpacity onPress={() => handleNavigate(c.path)}>
                        <Text
                          style={[
                            styles.crumbSegment,
                            mono("regular"),
                            i === crumbs.length - 1 && styles.crumbSegmentActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => refetch()}
                  disabled={isFetching}
                  style={styles.crumbActionBtn}
                >
                  <RefreshCw
                    size={13}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>

              {/* Filter Subdirectories */}
              <View style={styles.filterBox}>
                <Search size={13} color={COLORS.mutedForeground} />
                <TextInput
                  style={[styles.filterInput, font("regular")]}
                  value={filterText}
                  onChangeText={setFilterText}
                  placeholder="Filter folders in this directory…"
                  placeholderTextColor={COLORS.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {filterText ? (
                  <TouchableOpacity onPress={() => setFilterText("")}>
                    <X size={13} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Subdirectory List */}
              <View style={styles.listContainer}>
                {isLoading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={[styles.loadingText, font("medium")]}>Reading folders…</Text>
                  </View>
                ) : directories.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <FolderOpen size={32} color={COLORS.mutedForeground} />
                    <Text style={[styles.emptyTitle, font("semibold")]}>No subdirectories</Text>
                    <Text style={[styles.emptySub, font("regular")]}>
                      Set this current path as your workspace below.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.folderScroll}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {directories.map((dir) => (
                      <TouchableOpacity
                        key={dir.path}
                        style={styles.folderRow}
                        onPress={() => handleNavigate(dir.path)}
                        activeOpacity={0.7}
                      >
                        <Folder size={17} color={COLORS.primary} />
                        <View style={styles.folderTextCol}>
                          <Text style={[styles.folderNameText, font("semibold", dir.name)]} numberOfLines={1}>
                            {dir.name}
                          </Text>
                          <Text style={[styles.folderPathText, mono("regular")]} numberOfLines={1}>
                            {dir.path}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.selectBtn}
                          onPress={() => handleConfirm(dir.path)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.selectBtnText, font("semibold")]}>Select</Text>
                        </TouchableOpacity>
                        <ChevronRight size={14} color={COLORS.mutedForeground} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Bottom Action Footer */}
              <View style={styles.footer}>
                <View style={styles.targetInfoCol}>
                  <Text style={[styles.targetLabel, font("bold")]}>Target Workspace Path</Text>
                  <Text style={[styles.targetPath, mono("medium")]} numberOfLines={1}>
                    {browsingPath}
                  </Text>
                </View>

                <View style={styles.footerActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, font("medium")]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirm()}
                    activeOpacity={0.8}
                  >
                    <Check size={14} color="#FFFFFF" />
                    <Text style={[styles.confirmBtnText, font("semibold")]}>Set as Workspace</Text>
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
  modalCard: {
    maxHeight: "88%",
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    paddingTop: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  shortcutsRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  shortcutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutChipActive: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderColor: COLORS.primary,
  },
  shortcutChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  shortcutChipTextActive: {
    color: COLORS.primary,
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  manualInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  goBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  goBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  crumbActionBtn: {
    padding: 4,
  },
  crumbsScroll: {
    alignItems: "center",
    gap: 4,
  },
  crumbItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  crumbSegment: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  crumbSegmentActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 10,
    height: 32,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  filterInput: {
    flex: 1,
    fontSize: 11,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  listContainer: {
    height: 220,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  folderScroll: {
    flex: 1,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  folderTextCol: {
    flex: 1,
  },
  folderNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  folderPathText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(66, 64, 225, 0.06)",
  },
  selectBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 8,
  },
  targetInfoCol: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
  },
  targetPath: {
    fontSize: 11.5,
    color: COLORS.foreground,
    marginTop: 1,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
