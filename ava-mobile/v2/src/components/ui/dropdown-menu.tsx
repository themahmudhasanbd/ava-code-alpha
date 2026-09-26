import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
  style,
}: {
  asChild?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(DropdownContext);
  if (!ctx) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        ctx.setOpen(true);
      }}
      style={style}
    >
      {children}
    </TouchableOpacity>
  );
}

export function DropdownMenuContent({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(DropdownContext);
  if (!ctx || !ctx.open) return null;

  return (
    <Modal
      visible={ctx.open}
      transparent
      animationType="fade"
      onRequestClose={() => ctx.setOpen(false)}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => ctx.setOpen(false)}
      >
        <Surface style={[styles.menuCard, style]}>
          <TouchableOpacity activeOpacity={1}>{children}</TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

export function DropdownMenuItem({
  children,
  onPress,
  style,
  textStyle,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const ctx = useContext(DropdownContext);

  const handlePress = () => {
    ctx?.setOpen(false);
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
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

export function DropdownMenuSeparator() {
  return <View style={styles.separator} />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  menuCard: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 16,
    padding: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: "uppercase",
  },
});
