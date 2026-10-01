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
import { useTheme } from "@/theme/colors";
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
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: isDark ? "#000000" : colors.glassShadow,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <AtSign size={13} color={colors.primary} />
          <Text style={[styles.title, font("semibold"), { color: colors.foreground }]}>
            Mention Context & Files
          </Text>
          {currentSubDir ? (
            <View
              style={[
                styles.subDirBadge,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              <FolderOpen size={10} color={colors.primary} />
              <Text
                style={[styles.subDirText, mono("regular"), { color: colors.primary }]}
                numberOfLines={1}
              >
                {currentSubDir}/
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <X size={12} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, font("regular"), { color: colors.mutedForeground }]}>
            Scanning workspace directory…
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, font("regular"), { color: colors.mutedForeground }]}>
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
                style={[
                  styles.itemRow,
                  {
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isFolder
                        ? colors.primary + "29"
                        : isMcp
                        ? colors.mascot + "29"
                        : colors.secondary,
                    },
                  ]}
                >
                  <Icon
                    size={14}
                    color={
                      isFolder
                        ? colors.primary
                        : isMcp
                        ? colors.mascot
                        : colors.foreground
                    }
                  />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[
                        styles.itemName,
                        mono("bold"),
                        {
                          color: isFolder
                            ? colors.primary
                            : isMcp
                            ? colors.mascot
                            : colors.foreground,
                        },
                      ]}
                    >
                      {item.insertText.trim()}
                    </Text>
                    <View
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: isFolder
                            ? colors.primary + "26"
                            : isMcp
                            ? colors.mascot + "26"
                            : colors.secondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          font("medium"),
                          {
                            color: isFolder
                              ? colors.primary
                              : isMcp
                              ? colors.mascot
                              : colors.mutedForeground,
                          },
                        ]}
                      >
                        {item.category}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.itemDesc, font("regular"), { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
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
    borderRadius: 18,
    borderWidth: 1,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 12,
  },
  subDirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 130,
  },
  subDirText: {
    fontSize: 10,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
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
  },
  emptyBox: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  },
  itemDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  catBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catBadgeText: {
    fontSize: 9,
    textTransform: "uppercase",
  },
});
