import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Surface } from "@/components/kit";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function Popover({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      {children}
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  asChild,
  children,
  style,
}: {
  asChild?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(PopoverContext);
  if (!ctx) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        ctx.setOpen(!ctx.open);
      }}
      style={style}
    >
      {children}
    </TouchableOpacity>
  );
}

export function PopoverContent({
  children,
  style,
}: {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  style?: ViewStyle;
}) {
  const ctx = useContext(PopoverContext);
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
        <Surface style={[styles.card, style]}>
          <TouchableOpacity activeOpacity={1}>{children}</TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 16,
  },
});
