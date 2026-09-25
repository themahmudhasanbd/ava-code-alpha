import React, { type ReactNode } from "react";
import { StyleSheet, Text, View, type ViewProps, type TextStyle, type StyleProp, type ViewStyle } from "react-native";
import { Separator } from "@/components/ui/separator";
import { COLORS } from "@/theme/colors";

export interface ButtonGroupProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  children: ReactNode;
}

export function ButtonGroup({
  orientation = "horizontal",
  style,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <View
      style={[
        styles.base,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function ButtonGroupText({
  children,
  style,
  textStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.textContainer, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text style={[styles.textLabel, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function ButtonGroupSeparator({
  orientation = "vertical",
  style,
}: {
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Separator
      orientation={orientation}
      style={[styles.separator, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.input,
  },
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
  },
  vertical: {
    flexDirection: "column",
  },
  textContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.muted,
    justifyContent: "center",
  },
  textLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  separator: {
    backgroundColor: COLORS.input,
  },
});
