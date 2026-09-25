import React, { type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type TouchableOpacityProps,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { COLORS } from "@/theme/colors";

export function InputGroup({
  children,
  style,
  ...props
}: ViewProps) {
  return (
    <View style={[styles.group, style]} {...props}>
      {children}
    </View>
  );
}

export function InputGroupAddon({
  align = "inline-start",
  children,
  style,
  ...props
}: ViewProps & { align?: "inline-start" | "inline-end" | "block-start" | "block-end" }) {
  return (
    <View
      style={[
        styles.addon,
        align === "inline-start" && styles.addonStart,
        align === "inline-end" && styles.addonEnd,
        align === "block-start" && styles.addonBlockStart,
        align === "block-end" && styles.addonBlockEnd,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function InputGroupButton({
  children,
  size = "xs",
  style,
  ...props
}: TouchableOpacityProps & { size?: "xs" | "sm" | "icon-xs" | "icon-sm" }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.btn,
        size === "xs" && styles.btnXs,
        size === "sm" && styles.btnSm,
        size === "icon-xs" && styles.btnIconXs,
        size === "icon-sm" && styles.btnIconSm,
        style,
      ]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

export function InputGroupText({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.text, style]}>{children}</Text>
  );
}

export function InputGroupInput({
  style,
  placeholderTextColor = COLORS.mutedForeground,
  ...props
}: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
}

export function InputGroupTextarea({
  style,
  placeholderTextColor = COLORS.mutedForeground,
  ...props
}: TextInputProps) {
  return (
    <TextInput
      multiline
      style={[styles.textarea, style]}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    overflow: "hidden",
  },
  addon: {
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addonStart: {
    paddingLeft: 10,
    paddingRight: 4,
  },
  addonEnd: {
    paddingRight: 10,
    paddingLeft: 4,
  },
  addonBlockStart: {
    width: "100%",
    paddingTop: 8,
  },
  addonBlockEnd: {
    width: "100%",
    paddingBottom: 8,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  btnXs: {
    height: 24,
    paddingHorizontal: 8,
  },
  btnSm: {
    height: 32,
    paddingHorizontal: 10,
  },
  btnIconXs: {
    width: 24,
    height: 24,
  },
  btnIconSm: {
    width: 32,
    height: 32,
  },
  text: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  input: {
    flex: 1,
    height: 36,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.foreground,
  },
  textarea: {
    flex: 1,
    minHeight: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.foreground,
    textAlignVertical: "top",
  },
});
