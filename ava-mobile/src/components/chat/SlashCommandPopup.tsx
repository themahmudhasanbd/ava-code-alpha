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
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface SlashCommandPopupProps {
  items: SlashCommandItem[];
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

export function SlashCommandPopup({ items, onSelect, onClose }: SlashCommandPopupProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Slash size={13} color={COLORS.primary} />
          <Text style={[styles.title, font("semibold")]}>Slash Commands</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <X size={12} color={COLORS.mutedForeground} />
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
              style={styles.itemRow}
              onPress={() => onSelect(cmd)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Icon size={14} color={COLORS.primary} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.commandName, mono("bold")]}>{cmd.label}</Text>
                  <View style={styles.catBadge}>
                    <Text style={[styles.catBadgeText, font("medium")]}>{cmd.category}</Text>
                  </View>
                </View>
                <Text style={[styles.commandDesc, font("regular")]} numberOfLines={1}>
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
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: "#000",
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  closeBtn: {
    padding: 3,
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
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
    color: COLORS.foreground,
  },
  commandDesc: {
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
  catBadgeText: {
    fontSize: 9,
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
  },
});
