import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/theme/colors";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
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

    const sizeKey = `size_${size.replace("-", "_")}` as keyof typeof containerStyles;
    const variantKey = `variant_${variant}` as keyof typeof containerStyles;
    const textVariantKey = `textVariant_${variant}` as keyof typeof labelStylesMap;

    const computedContainerStyles: StyleProp<ViewStyle> = [
      containerStyles.base,
      containerStyles[variantKey],
      containerStyles[sizeKey],
      (disabled || loading) && containerStyles.disabled,
      style,
    ];

    const computedLabelStyles: StyleProp<TextStyle> = [
      labelStylesMap.textBase,
      labelStylesMap[textVariantKey],
      size === "sm" && labelStylesMap.textSm,
      size === "lg" && labelStylesMap.textLg,
      (size === "icon" || size === "icon-sm" || size === "icon-xs") && labelStylesMap.textIcon,
      textStyle,
    ];

    return (
      <TouchableOpacity
        ref={ref}
        style={computedContainerStyles}
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
          <Text style={computedLabelStyles}>{children}</Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = "Button";

const containerStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    gap: 8,
  },
  variant_default: {
    backgroundColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  variant_secondary: {
    backgroundColor: COLORS.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  variant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.input,
  },
  variant_ghost: {
    backgroundColor: "transparent",
  },
  variant_destructive: {
    backgroundColor: COLORS.destructive,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  variant_link: {
    backgroundColor: "transparent",
  },
  size_default: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  size_sm: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  size_lg: {
    height: 40,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  size_icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  size_icon_sm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  size_icon_xs: {
    width: 24,
    height: 24,
    borderRadius: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  disabled: {
    opacity: 0.5,
  },
});

const labelStylesMap = StyleSheet.create({
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
    fontSize: 15,
  },
  textIcon: {
    fontSize: 14,
  },
});
