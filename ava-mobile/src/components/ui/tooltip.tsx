import React, { createContext, useContext, useState, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export function TooltipProvider({ children }: { children: ReactNode; delayDuration?: number }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: ReactNode }) {
  return <View style={styles.tooltip}>{children}</View>;
}

export function TooltipTrigger({ asChild, children }: { asChild?: boolean; children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipContent({
  children,
  side = "top",
  style,
}: {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.content, style]}>
      {typeof children === "string" ? (
        <Text style={styles.text}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: "relative",
  },
  content: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    color: COLORS.primaryForeground,
    fontWeight: "500",
  },
});
