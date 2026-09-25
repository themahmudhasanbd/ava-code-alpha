import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/theme/colors";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  children: ReactNode;
}

export const Button = React.forwardRef<any, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      loading = false,
      disabled = false,
      style,
      textStyle,
      onPress,
      children,
      ...props
    },
    ref
  ) => {
    const handlePress = (e: any) => {
      if (disabled || loading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress?.(e);
    };

    const containerStyles = [
      styles.base,
      styles[`variant_${variant}`],
      styles[`size_${size}`],
      (disabled || loading) && styles.disabled,
      style,
    ];

    const labelStyles = [
      styles.textBase,
      styles[`textVariant_${variant}`],
      size === "sm" && styles.textSm,
      size === "lg" && styles.textLg,
      (size === "icon" || size === "icon-sm" || size === "icon-xs") && styles.textIcon,
      textStyle,
    ];

    return (
      <TouchableOpacity
        ref={ref}
        style={containerStyles}
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
            style={{ marginRight: typeof children === "string" ? 6 : 0 }}
          />
        ) : null}
        {typeof children === "string" || typeof children === "number" ? (
          <Text style={labelStyles}>{children}</Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  variant_default: {
    backgroundColor: COLORS.primary,
  },
  variant_secondary: {
    backgroundColor: COLORS.secondary,
  },
  variant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  variant_ghost: {
    backgroundColor: "transparent",
  },
  variant_destructive: {
    backgroundColor: COLORS.destructive,
  },
  variant_link: {
    backgroundColor: "transparent",
  },
  size_default: {
    height: 40,
    paddingHorizontal: 16,
  },
  size_sm: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  size_lg: {
    height: 48,
    paddingHorizontal: 24,
  },
  size_icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 0,
  },
  size_icon_sm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 0,
  },
  size_icon_xs: {
    width: 26,
    height: 26,
    borderRadius: 6,
    paddingHorizontal: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  textVariant_default: {
    color: COLORS.primaryForeground,
  },
  textVariant_secondary: {
    color: COLORS.secondaryForeground,
  },
  textVariant_outline: {
    color: COLORS.foreground,
  },
  textVariant_ghost: {
    color: COLORS.foreground,
  },
  textVariant_destructive: {
    color: COLORS.destructiveForeground,
  },
  textVariant_link: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  textSm: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 16,
  },
  textIcon: {
    fontSize: 14,
  },
});
