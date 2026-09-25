import * as React from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  style,
}: CheckboxProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) setUncontrolledChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handleToggle}
      style={[
        styles.box,
        isChecked && styles.checkedBox,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isChecked ? (
        <Check size={12} color={COLORS.primaryForeground} strokeWidth={3} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkedBox: {
    backgroundColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
