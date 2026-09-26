import * as React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { Search } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface CommandProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Command({ style, children }: CommandProps) {
  return <View style={[styles.command, style]}>{children}</View>;
}

export interface CommandDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function CommandDialog({
  open,
  onOpenChange,
  children,
}: CommandDialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange?.(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogCard}>
          <Command>{children}</Command>
        </View>
      </View>
    </Modal>
  );
}

export interface CommandInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function CommandInput({
  value,
  onChangeText,
  placeholder = "Type a command or search...",
  style,
}: CommandInputProps) {
  return (
    <View style={[styles.inputWrapper, style]}>
      <Search size={16} color={COLORS.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        style={styles.input}
      />
    </View>
  );
}

export function CommandList({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <ScrollView style={[styles.list, style]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function CommandEmpty({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.empty, style]}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

export function CommandGroup({
  heading,
  style,
  children,
}: {
  heading?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.group, style]}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {children}
    </View>
  );
}

export interface CommandItemProps {
  onSelect?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function CommandItem({
  onSelect,
  style,
  textStyle,
  children,
}: CommandItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onSelect}
      style={[styles.item, style]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.itemText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function CommandShortcut({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.shortcut, style]}>{children}</Text>;
}

export function CommandSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.separator, style]} />;
}

const styles = StyleSheet.create({
  command: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: "hidden",
    maxHeight: 400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.foreground,
  },
  list: {
    padding: 6,
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  group: {
    marginBottom: 6,
  },
  heading: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  shortcut: {
    marginLeft: "auto",
    fontSize: 11,
    color: COLORS.mutedForeground,
    letterSpacing: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
});
