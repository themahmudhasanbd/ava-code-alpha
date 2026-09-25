import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";

interface SelectContextValue {
  value?: string;
  onValueChange?: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(SelectContext);
  if (!ctx) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        ctx.setOpen(true);
      }}
      style={[styles.trigger, style]}
    >
      {children}
      <ChevronDown size={14} color={COLORS.mutedForeground} />
    </TouchableOpacity>
  );
}

export function SelectValue({
  placeholder = "Select...",
  style,
}: {
  placeholder?: string;
  style?: TextStyle;
}) {
  const ctx = useContext(SelectContext);
  return (
    <Text style={[styles.valueText, style]} numberOfLines={1}>
      {ctx?.value || placeholder}
    </Text>
  );
}

export function SelectContent({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(SelectContext);
  if (!ctx || !ctx.open) return null;

  return (
    <Modal
      visible={ctx.open}
      transparent
      animationType="fade"
      onRequestClose={() => ctx.setOpen(false)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => ctx.setOpen(false)}
      >
        <Surface style={[styles.contentCard, style]}>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

export function SelectItem({
  value,
  children,
  style,
}: {
  value: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const ctx = useContext(SelectContext);
  if (!ctx) return null;

  const isSelected = ctx.value === value;

  const handleSelect = () => {
    ctx.onValueChange?.(value);
    ctx.setOpen(false);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handleSelect}
      style={[styles.item, isSelected && styles.itemSelected, style]}
    >
      <Text
        style={[styles.itemText, isSelected && styles.itemTextSelected]}
        numberOfLines={1}
      >
        {children}
      </Text>
      {isSelected && <Check size={14} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

export function SelectGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function SelectLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function SelectSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.inputBg,
    gap: 8,
  },
  valueText: {
    fontSize: 13,
    color: COLORS.foreground,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  contentCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: 360,
    borderRadius: 18,
    padding: 8,
  },
  scroll: {
    maxHeight: 340,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemSelected: {
    backgroundColor: COLORS.secondary,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  itemTextSelected: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  group: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
});
