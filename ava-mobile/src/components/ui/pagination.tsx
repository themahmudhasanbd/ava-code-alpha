import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface PaginationProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Pagination({ style, children }: PaginationProps) {
  return <View style={[styles.pagination, style]}>{children}</View>;
}

export function PaginationContent({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function PaginationItem({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.item, style]}>{children}</View>;
}

export interface PaginationLinkProps {
  isActive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function PaginationLink({
  isActive = false,
  onPress,
  style,
  children,
}: PaginationLinkProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.link,
        isActive && styles.activeLink,
        style,
      ]}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text style={[styles.linkText, isActive && styles.activeLinkText]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function PaginationPrevious({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.link, styles.navBtn, style]}
    >
      <ChevronLeft size={16} color={COLORS.foreground} />
      <Text style={styles.linkText}>Previous</Text>
    </TouchableOpacity>
  );
}

export function PaginationNext({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.link, styles.navBtn, style]}
    >
      <Text style={styles.linkText}>Next</Text>
      <ChevronRight size={16} color={COLORS.foreground} />
    </TouchableOpacity>
  );
}

export function PaginationEllipsis({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.ellipsis, style]}>
      <MoreHorizontal size={16} color={COLORS.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeLink: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  activeLinkText: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  ellipsis: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
