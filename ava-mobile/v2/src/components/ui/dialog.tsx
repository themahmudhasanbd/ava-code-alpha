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

export function Dialog({
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
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => onOpenChange(false)}
      >
        <Surface style={styles.dialogCard}>
          <TouchableOpacity activeOpacity={1}>{children}</TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

export function DialogHeader({
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  description: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
});
