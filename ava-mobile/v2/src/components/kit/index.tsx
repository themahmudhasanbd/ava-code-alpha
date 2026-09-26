import React, { type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
import type { ConnectionStatus } from "@/core/types";

// Re-export canonical UI primitives
export { Button, type ButtonProps } from "@/components/ui/button";
export { Input, type InputProps } from "@/components/ui/input";
export { Label, type LabelProps } from "@/components/ui/label";
export { Badge, type BadgeProps } from "@/components/ui/badge";
export { AvaMascot, type AvaMascotState } from "@/components/ui/ava-mascot";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
export { Separator } from "@/components/ui/separator";
export { Skeleton } from "@/components/ui/skeleton";
export { Switch, type SwitchProps } from "@/components/ui/switch";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
/**
 * AppGlow - Clean background container matching web v2 background.
 */
export function AppGlow({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.glowContainer, style]}>
      {children}
    </View>
  );
}

/**
 * Surface - Glass rounded container (mimicking web `glass rounded-2xl`).
 */
export function Surface({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

/**
 * GlassIconButton - Round/curved glass button with icon.
 */
export function GlassIconButton({
  icon: Icon,
  size = 18,
  color = COLORS.foreground,
  onPress,
  style,
  disabled = false,
  label,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.glassIconButton, disabled && { opacity: 0.4 }, style]}
    >
      <Icon size={size} color={color} />
    </TouchableOpacity>
  );
}

/**
 * StatusDot - Connection status indicator.
 */
export function StatusDot({
  status,
  size = 8,
}: {
  status: ConnectionStatus;
  size?: number;
}) {
  const color =
    status === "online"
      ? COLORS.success
      : status === "connecting"
      ? COLORS.warning
      : COLORS.destructive;

  return (
    <View
      style={[
        styles.statusDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

/**
 * PageIntro - Standard page title and description block.
 */
export function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageIntroRow}>
      <View style={styles.pageIntroTextCol}>
        <Text style={styles.pageIntroTitle}>{title}</Text>
        {description ? (
          <Text style={styles.pageIntroDesc}>{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/**
 * EmptyState - Web-matched empty state card.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Surface style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconWrapper}>
        <Icon size={20} color={COLORS.secondaryForeground} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyStateDesc}>{description}</Text>
      ) : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </Surface>
  );
}

/**
 * ListRow - List row item matching web ListRow.
 */
export function ListRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.listRow}
      onPress={onClick}
      disabled={!onClick}
      activeOpacity={0.7}
    >
      {Icon ? (
        <View style={styles.listRowIconBox}>
          <Icon size={16} color={COLORS.secondaryForeground} />
        </View>
      ) : null}
      <View style={styles.listRowContent}>
        <Text style={styles.listRowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listRowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

/**
 * SkeletonRows - Placeholder skeleton bars for loading state.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonBar} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: "relative",
    overflow: "hidden",
  },
  surface: {
    backgroundColor: COLORS.glassBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  glassIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statusDot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  pageIntroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  pageIntroTextCol: {
    flex: 1,
  },
  pageIntroTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  pageIntroDesc: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 3,
    lineHeight: 20,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  emptyStateIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 260,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  listRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowContent: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  listRowSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  skeletonBar: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
    opacity: 0.6,
  },
});
