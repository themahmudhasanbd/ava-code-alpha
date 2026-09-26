import * as React from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface ResizablePanelGroupProps {
  direction?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ResizablePanelGroup({
  direction = "horizontal",
  style,
  children,
}: ResizablePanelGroupProps) {
  return (
    <View
      style={[
        styles.group,
        direction === "vertical" ? styles.vertical : styles.horizontal,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface ResizablePanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ResizablePanel({ style, children }: ResizablePanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export interface ResizableHandleProps {
  withHandle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ResizableHandle({ withHandle = false, style }: ResizableHandleProps) {
  return (
    <View style={[styles.handle, style]}>
      {withHandle ? <View style={styles.handleKnob} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flex: 1,
    width: "100%",
  },
  horizontal: {
    flexDirection: "row",
  },
  vertical: {
    flexDirection: "column",
  },
  panel: {
    flex: 1,
  },
  handle: {
    width: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  handleKnob: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },
});
