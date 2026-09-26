import * as React from "react";
import { Image, StyleSheet, Text, View, type ImageProps, type ViewProps } from "react-native";
import { COLORS } from "@/theme/colors";

export function Avatar({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.avatar, style]} {...props}>
      {children}
    </View>
  );
}

export function AvatarImage({ style, ...props }: ImageProps) {
  return <Image style={[styles.image, style]} {...props} />;
}

export function AvatarFallback({
  style,
  children,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View style={[styles.fallback, style]} {...props}>
      {typeof children === "string" ? (
        <Text style={styles.fallbackText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.muted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
});
