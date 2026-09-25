import React, { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";

export function PromptInput({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <Surface style={[styles.container, style]}>{children}</Surface>;
}

export function PromptInputFooter({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function PromptInputTools({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.tools, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
  },
  tools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
});
