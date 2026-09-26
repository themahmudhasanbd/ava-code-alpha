import React, { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, type ViewStyle, type TextStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export interface ToggleProps {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}

export function Toggle({
  pressed = false,
  onPressedChange,
  variant = "default",
  size = "default",
  disabled = false,
  style,
  children,
}: ToggleProps) {
  const handlePress = () => {
    if (disabled) return;
    onPressedChange?.(!pressed);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.base,
        size === "sm" && styles.sizeSm,
        size === "lg" && styles.sizeLg,
        variant === "outline" && styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.text, pressed && styles.textPressed]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "transparent",
  },
  sizeSm: {
    height: 32,
    paddingHorizontal: 8,
  },
  sizeLg: {
    height: 40,
    paddingHorizontal: 16,
  },
  outline: {
    borderWidth: 1,
    borderColor: COLORS.input,
  },
  pressed: {
    backgroundColor: COLORS.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  textPressed: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
});
