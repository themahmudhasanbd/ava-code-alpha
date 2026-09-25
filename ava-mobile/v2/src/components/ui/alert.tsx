import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface AlertProps {
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Alert({
  variant = "default",
  icon,
  style,
  children,
}: AlertProps) {
  const isDestructive = variant === "destructive";

  return (
    <View
      style={[
        styles.alert,
        isDestructive ? styles.destructiveAlert : styles.defaultAlert,
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <View style={styles.contentContainer}>{children}</View>
    </View>
  );
}

export interface AlertTitleProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertTitle({ style, children }: AlertTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export interface AlertDescriptionProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDescription({ style, children }: AlertDescriptionProps) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  alert: {
    position: "relative",
    width: "100%",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  defaultAlert: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  destructiveAlert: {
    backgroundColor: "rgba(231, 0, 11, 0.05)",
    borderColor: "rgba(231, 0, 11, 0.4)",
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 1,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.mutedForeground,
  },
});
