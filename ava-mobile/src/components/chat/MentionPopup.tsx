import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AtSign, FolderOpen, X } from "lucide-react-native";
import type { MentionItem } from "./mentions";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface MentionPopupProps {
  items: MentionItem[];
  currentSubDir?: string;
  isLoading?: boolean;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

export function MentionPopup({
  items,
  currentSubDir,
  isLoading,
  onSelect,
  onClose,
}: MentionPopupProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AtSign size={13} color={COLORS.primary} />
          <Text style={[styles.title, font("semibold")]}>Mention Context & Files</Text>
          {currentSubDir ? (
            <View style={styles.subDirBadge}>
              <FolderOpen size={10} color={COLORS.primary} />
              <Text style={[styles.subDirText, mono("regular")]} numberOfLines={1}>
                {currentSubDir}/
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <X size={12} color={COLORS.mutedForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={[styles.loadingText, font("regular")]}>Scanning workspace directory…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, font("regular")]}>
            No files or symbols match this query.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isFolder = item.category === "folder";
            const isMcp = item.category === "mcp";

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconBox,
                    isFolder && styles.iconBoxFolder,
                    isMcp && styles.iconBoxMcp,
                  ]}
                >
                  <Icon
                    size={14}
                    color={
                      isFolder
                        ? COLORS.primary
                        : isMcp
                        ? "#a855f7"
                        : COLORS.foreground
                    }
                  />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemName, mono("bold")]}>{item.insertText.trim()}</Text>
                    <View
                      style={[
                        styles.catBadge,
                        isFolder && styles.catBadgeFolder,
                        isMcp && styles.catBadgeMcp,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          font("medium"),
                          isFolder && styles.catBadgeTextFolder,
                          isMcp && styles.catBadgeTextMcp,
                        ]}
                      >
                        {item.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.itemDesc, font("regular")]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 260,
    overflow: "hidden",
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  subDirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 130,
  },
  subDirText: {
    fontSize: 10,
    color: COLORS.primary,
  },
  closeBtn: {
    padding: 3,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyBox: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  scroll: {
    maxHeight: 210,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxFolder: {
    backgroundColor: "rgba(66, 64, 225, 0.12)",
  },
  iconBoxMcp: {
    backgroundColor: "rgba(168, 85, 247, 0.12)",
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  itemDesc: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  catBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  catBadgeFolder: {
    backgroundColor: "rgba(66, 64, 225, 0.15)",
  },
  catBadgeMcp: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
  },
  catBadgeText: {
    fontSize: 9,
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
  },
  catBadgeTextFolder: {
    color: COLORS.primary,
  },
  catBadgeTextMcp: {
    color: "#c084fc",
  },
});
