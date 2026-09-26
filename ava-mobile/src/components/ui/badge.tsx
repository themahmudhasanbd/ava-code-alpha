import * as React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { COLORS } from "@/theme/colors";

export interface BadgeProps extends ViewProps {
  variant?: "default" | "secondary" | "destructive" | "outline";
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  style,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        styles[`variant_${variant}`],
        style,
      ]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
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

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variant_default: {
    backgroundColor: COLORS.primary,
  },
  variant_secondary: {
    backgroundColor: COLORS.secondary,
  },
  variant_destructive: {
    backgroundColor: COLORS.destructive,
  },
  variant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
  text_default: {
    color: COLORS.primaryForeground,
  },
  text_secondary: {
    color: COLORS.secondaryForeground,
  },
  text_destructive: {
    color: COLORS.destructiveForeground,
  },
  text_outline: {
    color: COLORS.foreground,
  },
});
