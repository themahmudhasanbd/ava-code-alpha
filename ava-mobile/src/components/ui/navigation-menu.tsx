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
import { ChevronDown } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface NavigationMenuProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function NavigationMenu({ style, children }: NavigationMenuProps) {
  return <View style={[styles.menu, style]}>{children}</View>;
}

export function NavigationMenuList({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.list, style]}>{children}</View>;
}

export function NavigationMenuItem({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.item, style]}>{children}</View>;
}

export interface NavigationMenuTriggerProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function NavigationMenuTrigger({
  onPress,
  style,
  textStyle,
  children,
}: NavigationMenuTriggerProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.trigger, style]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.triggerText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
      <ChevronDown size={14} color={COLORS.mutedForeground} />
    </TouchableOpacity>
  );
}

export function NavigationMenuContent({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export interface NavigationMenuLinkProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function NavigationMenuLink({
  onPress,
  style,
  textStyle,
  children,
}: NavigationMenuLinkProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.link, style]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.linkText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function NavigationMenuViewport() {
  return null;
}

export function NavigationMenuIndicator() {
  return null;
}

const styles = StyleSheet.create({
  menu: {
    width: "100%",
  },
  list: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  item: {
    position: "relative",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "transparent",
    gap: 4,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  content: {
    position: "absolute",
    top: 40,
    left: 0,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  link: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
});
