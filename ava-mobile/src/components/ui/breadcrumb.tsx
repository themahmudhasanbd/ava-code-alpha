import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { ChevronRight, MoreHorizontal } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface BreadcrumbProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Breadcrumb({ style, children }: BreadcrumbProps) {
  return <View style={[styles.breadcrumb, style]}>{children}</View>;
}

export interface BreadcrumbListProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function BreadcrumbList({ style, children }: BreadcrumbListProps) {
  return <View style={[styles.list, style]}>{children}</View>;
}

export interface BreadcrumbItemProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function BreadcrumbItem({ style, children }: BreadcrumbItemProps) {
  return <View style={[styles.item, style]}>{children}</View>;
}

export interface BreadcrumbLinkProps {
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function BreadcrumbLink({ onPress, style, children }: BreadcrumbLinkProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {typeof children === "string" ? (
        <Text style={[styles.link, style]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export interface BreadcrumbPageProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function BreadcrumbPage({ style, children }: BreadcrumbPageProps) {
  return (
    <Text style={[styles.page, style]}>
      {children}
    </Text>
  );
}

export interface BreadcrumbSeparatorProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function BreadcrumbSeparator({ style, children }: BreadcrumbSeparatorProps) {
  return (
    <View style={[styles.separator, style]}>
      {children ?? <ChevronRight size={14} color={COLORS.mutedForeground} />}
    </View>
  );
}

export interface BreadcrumbEllipsisProps {
  style?: StyleProp<ViewStyle>;
}

export function BreadcrumbEllipsis({ style }: BreadcrumbEllipsisProps) {
  return (
    <View style={[styles.ellipsis, style]}>
      <MoreHorizontal size={14} color={COLORS.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    width: "100%",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  link: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  page: {
    fontSize: 14,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  separator: {
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsis: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
