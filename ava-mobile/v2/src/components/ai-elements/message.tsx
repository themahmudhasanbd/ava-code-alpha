import React, { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

export function Message({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.message, style]}>{children}</View>;
}

export function MessageContent({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function MessageActions({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.actions, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  message: {
    marginVertical: 4,
  },
  content: {
    flexDirection: "row",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
});
