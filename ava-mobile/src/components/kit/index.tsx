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
import { COLORS, useTheme } from "@/theme/colors";
import type { ConnectionStatus } from "@/core/types";
import { Skeleton, SkeletonCapsule, SkeletonText, SkeletonCard } from "@/components/ui/skeleton";

// Re-export canonical UI primitives
export { Button, type ButtonProps } from "@/components/ui/button";
export { Input, type InputProps } from "@/components/ui/input";
export { Label, type LabelProps } from "@/components/ui/label";
export { Badge, type BadgeProps } from "@/components/ui/badge";
export { AvaMascot, type AvaMascotState } from "@/components/ui/ava-mascot";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
export { Separator } from "@/components/ui/separator";
export {
  Skeleton,
  SkeletonCapsule,
  SkeletonText,
  SkeletonCard,
  type SkeletonProps,
} from "@/components/ui/skeleton";
export {
  GlassCapsule,
  type GlassCapsuleProps,
  type GlassCapsuleVariant,
  type GlassCapsuleSize,
} from "@/components/ui/glass-capsule";
export { Switch, type SwitchProps } from "@/components/ui/switch";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const { colors } = useTheme();
  return (
    <View style={[styles.glowContainer, { backgroundColor: colors.background }, style]}>
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
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: colors.glassBg,
          borderColor: colors.glassBorder,
          shadowColor: colors.glassShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * GlassIconButton - Round/curved glass button with icon.
 */
export function GlassIconButton({
  icon: Icon,
  size = 18,
  color,
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.glassIconButton,
        {
          backgroundColor: colors.glassBg,
          borderColor: colors.glassBorder,
          shadowColor: colors.glassShadow,
        },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Icon size={size} color={color || colors.foreground} />
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
  const { colors } = useTheme();
  const color =
    status === "online"
      ? colors.success
      : status === "connecting"
      ? colors.warning
      : colors.destructive;

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
  const { colors } = useTheme();
  return (
    <View style={styles.pageIntroRow}>
      <View style={styles.pageIntroTextCol}>
        <Text style={[styles.pageIntroTitle, { color: colors.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.pageIntroDesc, { color: colors.mutedForeground }]}>{description}</Text>
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
  const { colors } = useTheme();
  return (
    <Surface style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIconWrapper, { backgroundColor: colors.secondary }]}>
        <Icon size={20} color={colors.secondaryForeground} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyStateDesc, { color: colors.mutedForeground }]}>{description}</Text>
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.listRow}
      onPress={onClick}
      disabled={!onClick}
      activeOpacity={0.7}
    >
      {Icon ? (
        <View style={[styles.listRowIconBox, { backgroundColor: colors.secondary }]}>
          <Icon size={16} color={colors.secondaryForeground} />
        </View>
      ) : null}
      <View style={styles.listRowContent}>
        <Text style={[styles.listRowTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.listRowSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

/**
 * SkeletonRows - Dynamic animated skeleton rows for loading lists across the app.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.skeletonRow,
            { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
          ]}
        >
          <Skeleton style={styles.skeletonIcon} />
          <View style={styles.skeletonTextCol}>
            <Skeleton
              style={[
                styles.skeletonLineTitle,
                { width: `${55 + ((i * 17) % 35)}%` },
              ]}
            />
            <Skeleton
              style={[
                styles.skeletonLineSub,
                { width: `${35 + ((i * 23) % 40)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  surface: {
    borderRadius: 20,
    borderWidth: 1,
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
    borderWidth: 1,
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
  },
  pageIntroDesc: {
    fontSize: 14,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyStateDesc: {
    fontSize: 13,
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
    alignItems: "center",
    justifyContent: "center",
  },
  listRowContent: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  listRowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  skeletonTextCol: {
    flex: 1,
    gap: 8,
  },
  skeletonLineTitle: {
    height: 14,
    borderRadius: 7,
  },
  skeletonLineSub: {
    height: 10,
    borderRadius: 5,
  },
});
