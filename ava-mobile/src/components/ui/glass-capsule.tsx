import React, { type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

export type GlassCapsuleVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "purple"
  | "cyan"
  | "secondary";

export type GlassCapsuleSize = "xs" | "sm" | "md" | "lg";

export interface GlassCapsuleProps {
  label: string;
  value?: string | number;
  icon?: LucideIcon;
  variant?: GlassCapsuleVariant;
  size?: GlassCapsuleSize;
  active?: boolean;
  onPress?: () => void;
  statusDot?: "online" | "connecting" | "offline" | "busy";
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<
  GlassCapsuleVariant,
  {
    bg: string;
    border: string;
    activeBg: string;
    activeBorder: string;
    textColor: string;
    valueColor: string;
    iconColor: string;
  }
> = {
  default: {
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.14)",
    activeBg: "rgba(255, 255, 255, 0.14)",
    activeBorder: "rgba(255, 255, 255, 0.30)",
    textColor: COLORS.mutedForeground,
    valueColor: COLORS.foreground,
    iconColor: COLORS.mutedForeground,
  },
  primary: {
    bg: COLORS.primary + "14",
    border: COLORS.primary + "38",
    activeBg: COLORS.primary + "2E",
    activeBorder: COLORS.primary + "80",
    textColor: COLORS.primary,
    valueColor: COLORS.primary,
    iconColor: COLORS.primary,
  },
  success: {
    bg: COLORS.success + "14",
    border: COLORS.success + "40",
    activeBg: COLORS.success + "2E",
    activeBorder: COLORS.success + "80",
    textColor: COLORS.success,
    valueColor: COLORS.success,
    iconColor: COLORS.success,
  },
  warning: {
    bg: COLORS.warning + "14",
    border: COLORS.warning + "40",
    activeBg: COLORS.warning + "2E",
    activeBorder: COLORS.warning + "80",
    textColor: COLORS.warning,
    valueColor: COLORS.warning,
    iconColor: COLORS.warning,
  },
  destructive: {
    bg: COLORS.destructive + "14",
    border: COLORS.destructive + "40",
    activeBg: COLORS.destructive + "2E",
    activeBorder: COLORS.destructive + "80",
    textColor: COLORS.destructive,
    valueColor: COLORS.destructive,
    iconColor: COLORS.destructive,
  },
  purple: {
    bg: COLORS.primary + "14",
    border: COLORS.primary + "40",
    activeBg: COLORS.primary + "2E",
    activeBorder: COLORS.primary + "80",
    textColor: COLORS.primary,
    valueColor: COLORS.primary,
    iconColor: COLORS.primary,
  },
  cyan: {
    bg: COLORS.success + "14",
    border: COLORS.success + "40",
    activeBg: COLORS.success + "2E",
    activeBorder: COLORS.success + "80",
    textColor: COLORS.success,
    valueColor: COLORS.success,
    iconColor: COLORS.success,
  },
  secondary: {
    bg: COLORS.secondary,
    border: COLORS.border,
    activeBg: "rgba(255, 255, 255, 0.15)",
    activeBorder: COLORS.primary,
    textColor: COLORS.mutedForeground,
    valueColor: COLORS.foreground,
    iconColor: COLORS.mutedForeground,
  },
};

const SIZES: Record<
  GlassCapsuleSize,
  {
    paddingHorizontal: number;
    paddingVertical: number;
    iconSize: number;
    fontSize: number;
    valueFontSize: number;
    dotSize: number;
    gap: number;
  }
> = {
  xs: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    iconSize: 11,
    fontSize: 10.5,
    valueFontSize: 10.5,
    dotSize: 5,
    gap: 4,
  },
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    iconSize: 12.5,
    fontSize: 11.5,
    valueFontSize: 11.5,
    dotSize: 6,
    gap: 5,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    iconSize: 14,
    fontSize: 12.5,
    valueFontSize: 13,
    dotSize: 7,
    gap: 6,
  },
  lg: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    iconSize: 16,
    fontSize: 13.5,
    valueFontSize: 14,
    dotSize: 8,
    gap: 8,
  },
};

/**
 * GlassCapsule - Premium frosted glass capsule pill element.
 */
export function GlassCapsule({
  label,
  value,
  icon: Icon,
  variant = "default",
  size = "md",
  active = false,
  onPress,
  statusDot,
  style,
  trailing,
  children,
}: GlassCapsuleProps) {
  const vStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const sStyle = SIZES[size] || SIZES.md;

  const dotColor =
    statusDot === "online"
      ? COLORS.success
      : statusDot === "connecting" || statusDot === "busy"
      ? COLORS.warning
      : COLORS.destructive;

  const content = (
    <View
      style={[
        styles.capsule,
        {
          paddingHorizontal: sStyle.paddingHorizontal,
          paddingVertical: sStyle.paddingVertical,
          gap: sStyle.gap,
          backgroundColor: active ? vStyle.activeBg : vStyle.bg,
          borderColor: active ? vStyle.activeBorder : vStyle.border,
        },
        style,
      ]}
    >
      {statusDot && (
        <View
          style={[
            styles.dot,
            {
              width: sStyle.dotSize,
              height: sStyle.dotSize,
              borderRadius: sStyle.dotSize / 2,
              backgroundColor: dotColor,
            },
          ]}
        />
      )}

      {Icon && (
        <Icon
          size={sStyle.iconSize}
          color={active ? vStyle.valueColor : vStyle.iconColor}
        />
      )}

      <Text
        style={[
          styles.labelText,
          font(active ? "semibold" : "medium"),
          {
            fontSize: sStyle.fontSize,
            color: active ? vStyle.valueColor : vStyle.textColor,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {value !== undefined && (
        <Text
          style={[
            styles.valueText,
            mono("bold"),
            {
              fontSize: sStyle.valueFontSize,
              color: vStyle.valueColor,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}

      {trailing}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  labelText: {
    letterSpacing: 0.2,
  },
  valueText: {
    letterSpacing: 0.3,
  },
});
