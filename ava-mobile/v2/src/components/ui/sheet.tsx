import React, { type ReactNode } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { X } from "lucide-react-native";
import { Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => onOpenChange(false)}
      >
        <Surface style={styles.sheetContent}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
            {children}
          </TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

export function SheetHeader({
  title,
  description,
  onClose,
  style,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.header, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={COLORS.mutedForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    maxHeight: "80%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  description: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
