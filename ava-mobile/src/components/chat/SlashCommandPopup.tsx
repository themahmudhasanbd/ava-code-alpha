import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Slash, X } from "lucide-react-native";
import type { SlashCommandItem } from "./slash-commands";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface SlashCommandPopupProps {
  items: SlashCommandItem[];
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

export function SlashCommandPopup({ items, onSelect, onClose }: SlashCommandPopupProps) {
  const { colors, isDark } = useTheme();

  if (items.length === 0) return null;

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
          <Slash size={13} color={colors.primary} />
          <Text style={[styles.title, font("semibold"), { color: colors.foreground }]}>
            Slash Commands
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <X size={12} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {items.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <TouchableOpacity
              key={cmd.command}
              style={[
                styles.itemRow,
                {
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => onSelect(cmd)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(99, 102, 241, 0.16)"
                      : "rgba(79, 70, 229, 0.10)",
                  },
                ]}
              >
                <Icon size={14} color={colors.primary} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.commandName, mono("bold"), { color: colors.foreground }]}>
                    {cmd.label}
                  </Text>
                  <View style={[styles.catBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.catBadgeText, font("medium"), { color: colors.mutedForeground }]}>
                      {cmd.category}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.commandDesc, font("regular"), { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {cmd.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    maxHeight: 250,
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
  },
  title: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
  },
  scroll: {
    maxHeight: 205,
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
  commandName: {
    fontSize: 12.5,
  },
  commandDesc: {
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
