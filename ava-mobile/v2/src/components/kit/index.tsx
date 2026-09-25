import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type TouchableOpacityProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/theme/colors";
import type { ConnectionStatus } from "@/core/types";

/**
 * AppGlow - Background container mimicking web `app-glow` radial gradients.
 */
export function AppGlow({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.glowContainer, style]}>
      {/* Top-left soft purple/indigo glow */}
      <View style={styles.glowTopLeft} pointerEvents="none" />
      {/* Bottom-right soft sky-blue glow */}
      <View style={styles.glowBottomRight} pointerEvents="none" />
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
  style?: ViewStyle;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

/**
 * Label - Web-matched form field label.
 */
export function Label({
  children,
  style,
}: {
  children: ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/**
 * Input - Web-matched text input.
 */
export function Input({
  style,
  placeholderTextColor = COLORS.mutedForeground,
  ...props
}: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
}

/**
 * Button - Web-matched button supporting variants (default, secondary, outline, ghost, destructive)
 */
export interface ButtonProps extends TouchableOpacityProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  style,
  onPress,
  children,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const buttonStyle = [
    styles.btnBase,
    styles[`btnVariant_${variant}`],
    styles[`btnSize_${size}`],
    (disabled || loading) && styles.btnDisabled,
    style,
  ];

  const textStyle = [
    styles.btnTextBase,
    styles[`btnText_${variant}`],
    size === "sm" && styles.btnTextSm,
    size === "lg" && styles.btnTextLg,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      onPress={handlePress}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "default" || variant === "destructive"
              ? COLORS.primaryForeground
              : COLORS.primary
          }
          style={{ marginRight: 6 }}
        />
      ) : null}
      {typeof children === "string" ? (
        <Text style={textStyle}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
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
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
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

/**
 * Badge - Web badge chip.
 */
export function Badge({
  children,
  variant = "secondary",
}: {
  children: ReactNode;
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <View
      style={[
        styles.badge,
        variant === "secondary" && styles.badgeSecondary,
        variant === "outline" && styles.badgeOutline,
      ]}
    >
      {typeof children === "string" ? (
        <Text
          style={[
            styles.badgeText,
            variant === "secondary" && styles.badgeTextSecondary,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

/**
 * AvaMascot - The organic breathing mascot blob with animated/styled eyes.
 */
export function AvaMascot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 64 : size === "md" ? 44 : 32;
  return (
    <View
      style={[
        styles.mascotBlob,
        {
          width: dim,
          height: dim,
          borderRadius: dim * 0.46,
        },
      ]}
    >
      <View style={styles.mascotFace}>
        <View
          style={[
            styles.mascotEye,
            { width: dim * 0.08, height: dim * 0.22 },
          ]}
        />
        <View
          style={[
            styles.mascotEye,
            { width: dim * 0.08, height: dim * 0.22 },
          ]}
        />
      </View>
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
  glowTopLeft: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.glow1,
    opacity: 0.85,
  },
  glowBottomRight: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.glow2,
    opacity: 0.7,
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
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.foreground,
  },
  btnBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  btnSize_default: {
    height: 42,
    paddingHorizontal: 16,
  },
  btnSize_sm: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  btnSize_lg: {
    height: 48,
    paddingHorizontal: 24,
  },
  btnSize_icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 0,
  },
  btnVariant_default: {
    backgroundColor: COLORS.primary,
  },
  btnVariant_secondary: {
    backgroundColor: COLORS.secondary,
  },
  btnVariant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnVariant_ghost: {
    backgroundColor: "transparent",
  },
  btnVariant_destructive: {
    backgroundColor: COLORS.destructive,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextBase: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnText_default: {
    color: COLORS.primaryForeground,
  },
  btnText_secondary: {
    color: COLORS.secondaryForeground,
  },
  btnText_outline: {
    color: COLORS.foreground,
  },
  btnText_ghost: {
    color: COLORS.foreground,
  },
  btnText_destructive: {
    color: COLORS.destructiveForeground,
  },
  btnTextSm: {
    fontSize: 12,
  },
  btnTextLg: {
    fontSize: 16,
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  badgeSecondary: {
    backgroundColor: COLORS.secondary,
  },
  badgeOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryForeground,
  },
  badgeTextSecondary: {
    color: COLORS.secondaryForeground,
  },
  mascotBlob: {
    backgroundColor: COLORS.mascot,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mascot,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  mascotFace: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotEye: {
    backgroundColor: COLORS.mascotForeground,
    borderRadius: 999,
  },
});
